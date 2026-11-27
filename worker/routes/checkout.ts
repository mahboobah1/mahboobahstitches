import type { Env } from "../types";
import { audit } from "../lib/audit";
import { safeEqual, sha256Hex } from "../lib/crypto";
import { HttpError, assertSameOrigin, clientIp, json, readJson } from "../lib/http";
import { cancelUnpaidOrder, createOrder, getShop, newReference, quote, releaseExpired, settlePayment, type Quote } from "../lib/orders";
import { chooseRate } from "../lib/shipping";
import { getProvider } from "../lib/paystack";
import { can } from "../lib/permissions";
import { rateLimit } from "../lib/ratelimit";
import { getSessionUser } from "../lib/session";
import * as v from "../lib/validate";

type Params = Record<string, string>;

export async function checkoutConfig(env: Env): Promise<Response> {
  const provider = getProvider(env);
  const shop = await getShop(env);
  return json({ paymentsEnabled: !!provider, mode: provider?.mode ?? null, currency: "NGN", deliveryFeeMinor: shop.deliveryFeeMinor, deliveryNote: shop.deliveryNote, deliveryCountries: ["NG"] });
}

const publicQuote = (q: Quote) => ({
  currency: q.currency, subtotalMinor: q.subtotalMinor, discountMinor: q.discountMinor, bundleDiscountMinor: q.bundleDiscountMinor, deliveryMinor: q.deliveryMinor, totalMinor: q.totalMinor, promoCode: q.promoCode,
  lines: q.lines.map((l) => ({ variantId: l.variantId, name: l.productName, size: l.size, colour: l.colour, unitMinor: l.unitMinor, qty: l.qty, giftIndex: l.giftIndex })),
  gifts: q.gifts,
  issues: q.issues,
  shipping: { configured: q.shipping.configured, selectedId: q.shipping.selected?.id ?? null, options: q.shipping.options },
});

const shipFrom = (b: Record<string, unknown>) => {
  const sh = (typeof b.shipping === "object" && b.shipping !== null ? b.shipping : {}) as Record<string, unknown>;
  return { country: typeof sh.country === "string" ? sh.country : undefined, state: typeof sh.state === "string" ? sh.state : undefined, rateId: sh.rateId };
};

/** Prices a cart on the server (used to show the checkout summary). Nothing is created. */
export async function quoteRoute(env: Env, req: Request): Promise<Response> {
  assertSameOrigin(req);
  await rateLimit(env, `quote:ip:${clientIp(req)}`, 60, 600);
  const b = await readJson(req);
  return json(publicQuote(await quote(env, b.items, b.promoCode, { gifts: b.gifts, ship: shipFrom(b) })));
}

export async function placeOrder(env: Env, req: Request): Promise<Response> {
  assertSameOrigin(req);
  const ip = clientIp(req);
  await rateLimit(env, `checkout:ip:${ip}`, 12, 600);
  const provider = getProvider(env);
  if (!provider) throw new HttpError(503, "Online payment is not switched on yet. Please order through WhatsApp.");
  await releaseExpired(env);
  const b = await readJson(req, 40_000);
  const a = (typeof b.address === "object" && b.address !== null ? b.address : {}) as Record<string, unknown>;
  const country = (typeof a.countryCode === "string" && a.countryCode ? a.countryCode : "NG").toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) throw new HttpError(422, "Choose a country.");
  const stateRaw = typeof a.state === "string" ? a.state : "";
  const q = await quote(env, b.items, b.promoCode, { gifts: b.gifts, ship: { country, state: stateRaw, rateId: b.shippingRateId } });
  if (q.issues.length > 0 || q.lines.length === 0) return json({ error: q.issues[0]?.message ?? "Your cart is empty.", issues: q.issues }, 409);
  if (q.shipping.configured) {
    await chooseRate(env, country, stateRaw, q.subtotalMinor - q.discountMinor, b.shippingRateId); // throws a clear message if not deliverable
  } else if (country !== "NG") {
    throw new HttpError(422, "Online checkout currently delivers within Nigeria. For other countries, please contact us on WhatsApp.");
  }

  const name = v.text(b.name, "Your name", 2, 80);
  const email = v.email(b.email);
  const phone = v.requiredPhone(b.phone);
  const address = {
    recipientName: v.optText(a.recipientName, "Recipient name", 80) ?? name,
    line1: v.text(a.line1, "Address", 3, 120),
    line2: v.optText(a.line2, "Address line 2", 120) ?? "",
    city: v.text(a.city, "City or town", 2, 80),
    state: country === "NG" ? v.text(a.state, "State", 2, 60) : (v.optText(a.state, "State or region", 60) ?? ""),
    postalCode: v.optText(a.postalCode, "Postal code", 20) ?? "",
    countryCode: country,
  };
  const shop = await getShop(env);
  const user = await getSessionUser(env, req);
  const reference = newReference("MS");
  const order = await createOrder(env, {
    q, userId: user?.id ?? null, name, email, phone, address,
    giftMessage: v.optText(b.giftMessage, "Gift message", 300), notes: v.optText(b.notes, "Note", 500),
    provider: provider.name, reference, reservationMinutes: shop.reservationMinutes, shippingMethod: q.shipping.selected?.name ?? null,
  });
  try {
    const origin = new URL(req.url).origin;
    const init = await provider.initialize({
      email, amountMinor: q.totalMinor, currency: q.currency, reference,
      callbackUrl: `${origin}/order/${order.orderNumber}?token=${order.token}`, metadata: { order_number: order.orderNumber },
    });
    await audit(env, { actor: user?.id ?? null, action: "order.placed", entity: "order", entityId: order.orderId, ip, meta: { number: order.orderNumber, total: q.totalMinor } });
    return json({ orderNumber: order.orderNumber, token: order.token, authorizationUrl: init.authorizationUrl, mode: provider.mode }, 201);
  } catch (e) {
    await cancelUnpaidOrder(env, order.orderId, "Payment could not be started", null);
    throw e;
  }
}

/* ---------------- looking at an order ---------------- */

interface OrderRow {
  id: string; order_number: string; user_id: string | null; guest_email: string | null; guest_name: string | null; phone: string | null; status: string; currency: string;
  subtotal_minor: number; discount_minor: number; shipping_minor: number; total_minor: number; promotion_code: string | null; shipping_address_json: string | null;
  gift_message: string | null; created_at: number; paid_at: number | null; public_token_hash: string | null; shipping_method: string | null; bundle_discount_minor: number;
}

async function authorizeOrder(env: Env, req: Request, number: string, token: string | null): Promise<OrderRow> {
  if (!/^MS-[A-Z0-9]{6}$/.test(number)) throw new HttpError(404, "Order not found.");
  const o = await env.DB.prepare("SELECT * FROM orders WHERE order_number=?1").bind(number).first<OrderRow>();
  if (!o) throw new HttpError(404, "Order not found.");
  const user = await getSessionUser(env, req);
  let tokenOk = !!token && !!o.public_token_hash && (await safeEqual(await sha256Hex(token), o.public_token_hash));
  if (!tokenOk && token) {
    // A bespoke order can also be reached with the private link of the request it came from.
    const br = await env.DB.prepare("SELECT public_token_hash FROM bespoke_requests WHERE order_id=?1").bind(o.id).first<{ public_token_hash: string | null }>();
    tokenOk = !!br?.public_token_hash && (await safeEqual(await sha256Hex(token), br.public_token_hash));
  }
  const userOk = !!user && (user.id === o.user_id || can(user.role, "orders:manage"));
  if (!tokenOk && !userOk) throw new HttpError(404, "Order not found.");
  return o;
}

async function orderView(env: Env, o: OrderRow): Promise<Response> {
  const [items, pay, events, gifts, shipments] = await Promise.all([
    env.DB.prepare("SELECT product_name AS name, variant_sku AS sku, size, colour, unit_price_minor AS unitMinor, qty, line_total_minor AS lineMinor, gift_id AS giftId FROM order_items WHERE order_id=?1 ORDER BY rowid").bind(o.id).all(),
    env.DB.prepare("SELECT status, provider, reference FROM payments WHERE order_id=?1 ORDER BY rowid DESC LIMIT 1").bind(o.id).first<{ status: string; provider: string; reference: string }>(),
    env.DB.prepare("SELECT to_status AS status, created_at AS at FROM order_events WHERE order_id=?1 ORDER BY id").bind(o.id).all(),
    env.DB.prepare("SELECT id, bundle_name AS bundleName, kind, packaging_name AS packagingName, packaging_minor AS packagingMinor, message, recipient_name AS recipientName, saving_minor AS savingMinor FROM order_gifts WHERE order_id=?1 ORDER BY rowid").bind(o.id).all(),
    env.DB.prepare("SELECT carrier, tracking_number AS trackingNumber, tracking_url AS trackingUrl, status, shipped_at AS shippedAt, delivered_at AS deliveredAt FROM shipments WHERE order_id=?1 ORDER BY created_at, rowid").bind(o.id).all(),
  ]);
  return json({
    order: {
      number: o.order_number, status: o.status, currency: o.currency, subtotalMinor: o.subtotal_minor, discountMinor: o.discount_minor, shippingMinor: o.shipping_minor,
      totalMinor: o.total_minor, bundleDiscountMinor: o.bundle_discount_minor, shippingMethod: o.shipping_method, promotionCode: o.promotion_code, createdAt: o.created_at, paidAt: o.paid_at, giftMessage: o.gift_message,
      customer: { name: o.guest_name, email: o.guest_email, phone: o.phone }, address: o.shipping_address_json ? JSON.parse(o.shipping_address_json) : null,
    },
    items: items.results,
    gifts: gifts.results,
    shipments: shipments.results,
    payment: pay ? { status: pay.status, provider: pay.provider } : null,
    timeline: events.results,
  });
}

const tokenOf = (req: Request) => new URL(req.url).searchParams.get("token");

export async function getOrder(env: Env, req: Request, p: Params): Promise<Response> {
  return orderView(env, await authorizeOrder(env, req, p.number ?? "", tokenOf(req)));
}

/** The customer came back from the payment page. We ask the provider; we do not trust the redirect. */
export async function verifyOrder(env: Env, req: Request, p: Params): Promise<Response> {
  assertSameOrigin(req);
  await rateLimit(env, `verify:ip:${clientIp(req)}`, 40, 600);
  const o = await authorizeOrder(env, req, p.number ?? "", tokenOf(req));
  const provider = getProvider(env);
  const pay = await env.DB.prepare("SELECT reference FROM payments WHERE order_id=?1 AND provider='paystack' ORDER BY rowid DESC LIMIT 1").bind(o.id).first<{ reference: string }>();
  if (provider && pay) {
    try {
      await settlePayment(env, provider, pay.reference);
    } catch (e) {
      if (!(e instanceof HttpError) || e.status !== 502) throw e; // provider temporarily unreachable: show current state
    }
  }
  const fresh = await env.DB.prepare("SELECT * FROM orders WHERE id=?1").bind(o.id).first<OrderRow>();
  return orderView(env, fresh ?? o);
}

/** Try paying again for an order that is still unpaid and whose stock hold is still valid. */
export async function payAgain(env: Env, req: Request, p: Params): Promise<Response> {
  assertSameOrigin(req);
  await rateLimit(env, `payagain:ip:${clientIp(req)}`, 10, 600);
  const o = await authorizeOrder(env, req, p.number ?? "", tokenOf(req));
  const provider = getProvider(env);
  if (!provider) throw new HttpError(503, "Online payment is not switched on yet.");
  if (o.status !== "unpaid") throw new HttpError(409, o.status === "cancelled" ? "This order has expired. Please place it again from your cart." : "This order does not need payment.");
  const held = await env.DB.prepare("SELECT COUNT(*) AS total, SUM(CASE WHEN status='active' AND expires_at > ?2 THEN 1 ELSE 0 END) AS live FROM stock_reservations WHERE order_id=?1").bind(o.id, Math.floor(Date.now() / 1000)).first<{ total: number; live: number | null }>();
  if (held && held.total > 0 && (held.live ?? 0) < held.total) throw new HttpError(409, "The hold on your items has expired. Please place the order again from your cart.");
  const shop = await getShop(env);
  const reference = newReference("MS");
  await env.DB.batch([
    env.DB.prepare("UPDATE payments SET status='abandoned' WHERE order_id=?1 AND status IN ('initiated','pending')").bind(o.id),
    env.DB.prepare("INSERT INTO payments (id, order_id, provider, reference, amount_minor, currency, status) VALUES (?1,?2,?3,?4,?5,?6,'initiated')").bind(crypto.randomUUID(), o.id, provider.name, reference, o.total_minor, o.currency),
    env.DB.prepare("UPDATE stock_reservations SET expires_at=?2 WHERE order_id=?1 AND status='active'").bind(o.id, Math.floor(Date.now() / 1000) + shop.reservationMinutes * 60),
  ]);
  const token = tokenOf(req);
  const origin = new URL(req.url).origin;
  const init = await provider.initialize({
    email: o.guest_email ?? "customer@example.com", amountMinor: o.total_minor, currency: o.currency, reference,
    callbackUrl: `${origin}/order/${o.order_number}${token ? `?token=${token}` : ""}`, metadata: { order_number: o.order_number },
  });
  return json({ authorizationUrl: init.authorizationUrl });
}

/** Paystack calls this after a payment. The signature proves it came from Paystack; we still verify with the API. */
export async function paystackWebhook(env: Env, req: Request): Promise<Response> {
  const provider = getProvider(env);
  if (!provider) return json({ error: "Payments are not enabled." }, 503);
  const raw = await req.text();
  if (raw.length > 100_000) return json({ error: "Too large." }, 413);
  if (!(await provider.verifyWebhookSignature(raw, req.headers.get("x-paystack-signature")))) {
    await audit(env, { actor: null, action: "webhook.bad_signature", ip: clientIp(req) });
    return json({ error: "Invalid signature." }, 401);
  }
  let evt: { event?: string; data?: { reference?: string } };
  try {
    evt = JSON.parse(raw);
  } catch {
    return json({ error: "Invalid JSON." }, 400);
  }
  const eventId = await sha256Hex(raw);
  const ins = await env.DB.prepare("INSERT OR IGNORE INTO webhook_events (provider, event_id, payload) VALUES ('paystack', ?1, ?2)").bind(eventId, raw.slice(0, 20_000)).run();
  if (!ins.meta.changes) return json({ ok: true, duplicate: true }); // already handled: repeated webhooks do nothing
  if (evt.event === "charge.success" && typeof evt.data?.reference === "string") {
    try {
      await settlePayment(env, provider, evt.data.reference);
    } catch (e) {
      if (e instanceof HttpError && e.status === 404) {
        // not one of our payments; nothing to do
      } else {
        await env.DB.prepare("DELETE FROM webhook_events WHERE provider='paystack' AND event_id=?1").bind(eventId).run(); // let Paystack retry
        throw e;
      }
    }
  }
  await env.DB.prepare("UPDATE webhook_events SET processed_at=CAST(strftime('%s','now') AS INTEGER) WHERE provider='paystack' AND event_id=?1").bind(eventId).run();
  return json({ ok: true });
}

/* ---------------- the signed-in customer's own orders and addresses ---------------- */

async function needUser(env: Env, req: Request) {
  const u = await getSessionUser(env, req);
  if (!u) throw new HttpError(401, "Please sign in.");
  return u;
}

export async function accountOrders(env: Env, req: Request): Promise<Response> {
  const u = await needUser(env, req);
  const rows = await env.DB.prepare(
    "SELECT order_number AS number, status, currency, total_minor AS totalMinor, created_at AS createdAt FROM orders WHERE user_id=?1 ORDER BY created_at DESC, rowid DESC LIMIT 100",
  ).bind(u.id).all();
  return json({ orders: rows.results });
}

export async function listAddresses(env: Env, req: Request): Promise<Response> {
  const u = await needUser(env, req);
  const rows = await env.DB.prepare(
    "SELECT id, label, recipient_name AS recipientName, phone, line1, line2, city, state, postal_code AS postalCode, country_code AS countryCode, is_default AS isDefault FROM addresses WHERE user_id=?1 ORDER BY is_default DESC, created_at DESC LIMIT 20",
  ).bind(u.id).all();
  return json({ addresses: rows.results });
}

export async function saveAddress(env: Env, req: Request): Promise<Response> {
  assertSameOrigin(req);
  const u = await needUser(env, req);
  const b = await readJson(req);
  const count = (await env.DB.prepare("SELECT COUNT(*) AS n FROM addresses WHERE user_id=?1").bind(u.id).first<{ n: number }>())?.n ?? 0;
  if (count >= 10) throw new HttpError(422, "You can save up to 10 addresses.");
  const id = crypto.randomUUID();
  const makeDefault = v.bool(b.isDefault) || count === 0;
  const stmts = [];
  if (makeDefault) stmts.push(env.DB.prepare("UPDATE addresses SET is_default=0 WHERE user_id=?1").bind(u.id));
  stmts.push(
    env.DB.prepare("INSERT INTO addresses (id, user_id, label, recipient_name, phone, line1, line2, city, state, postal_code, country_code, is_default) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,'NG',?11)")
      .bind(id, u.id, v.optText(b.label, "Label", 40), v.text(b.recipientName, "Recipient name", 2, 80), v.requiredPhone(b.phone), v.text(b.line1, "Address", 3, 120), v.optText(b.line2, "Address line 2", 120),
        v.text(b.city, "City or town", 2, 80), v.text(b.state, "State", 2, 60), v.optText(b.postalCode, "Postal code", 20), makeDefault ? 1 : 0),
  );
  await env.DB.batch(stmts);
  return json({ id }, 201);
}

export async function deleteAddress(env: Env, req: Request, p: Params): Promise<Response> {
  assertSameOrigin(req);
  const u = await needUser(env, req);
  await env.DB.prepare("DELETE FROM addresses WHERE id=?1 AND user_id=?2").bind(v.id(p.id), u.id).run();
  return json({ ok: true });
}
