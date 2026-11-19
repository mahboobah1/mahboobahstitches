import type { Env } from "../types";
import { audit } from "./audit";
import { randomToken, sha256Hex } from "./crypto";
import { HttpError } from "./http";
import type { PaymentProvider } from "./paystack";

const MAX_QTY = 10;
const MAX_LINES = 30;
const now = () => Math.floor(Date.now() / 1000);

export interface PricedLine {
  variantId: string; productName: string; sku: string; size: string; colour: string;
  unitMinor: number; qty: number; currency: string;
  /** true when stock is counted and we must hold it while the customer pays */
  reserve: boolean;
}
export interface Issue { variantId: string | null; message: string }
export interface Quote {
  lines: PricedLine[]; issues: Issue[]; currency: string;
  subtotalMinor: number; discountMinor: number; deliveryMinor: number; totalMinor: number;
  promoCode: string | null;
}
export interface Shop { deliveryFeeMinor: number; deliveryNote: string; reservationMinutes: number }

export async function getShop(env: Env): Promise<Shop> {
  const rows = await env.DB.prepare("SELECT key, value FROM settings WHERE key IN ('site.deliveryFeeMinor','site.deliveryNote','shop.reservationMinutes')").all<{ key: string; value: string }>();
  const m = new Map(rows.results.map((r) => [r.key, r.value]));
  const fee = Number(m.get("site.deliveryFeeMinor"));
  const mins = Number(m.get("shop.reservationMinutes"));
  return {
    deliveryFeeMinor: Number.isInteger(fee) && fee >= 0 ? fee : 0,
    deliveryNote: m.get("site.deliveryNote") ?? "",
    reservationMinutes: Number.isInteger(mins) && mins >= 5 && mins <= 240 ? mins : 30,
  };
}

/* ---------------- pricing (always from the database, never from the browser) ---------------- */

interface VRow {
  id: string; sku: string; size: string; colour: string; price_minor: number; currency: string; is_active: number;
  name: string; status: string; track_stock: number | null; on_hand: number | null; reserved: number | null; allow_backorder: number | null;
}

export function parseItems(raw: unknown): { variantId: string; qty: number }[] {
  if (!Array.isArray(raw) || raw.length === 0) throw new HttpError(422, "Your cart is empty.");
  if (raw.length > MAX_LINES) throw new HttpError(422, "Too many different items in one order.");
  const merged = new Map<string, number>();
  for (const it of raw) {
    const o = it as { variantId?: unknown; qty?: unknown };
    if (typeof o?.variantId !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(o.variantId)) throw new HttpError(422, "An item in your cart is not valid.");
    if (typeof o.qty !== "number" || !Number.isInteger(o.qty) || o.qty < 1 || o.qty > MAX_QTY) throw new HttpError(422, `You can order 1 to ${MAX_QTY} of each item online.`);
    merged.set(o.variantId, Math.min(MAX_QTY, (merged.get(o.variantId) ?? 0) + o.qty));
  }
  return [...merged].map(([variantId, qty]) => ({ variantId, qty }));
}

export async function priceLines(env: Env, items: { variantId: string; qty: number }[]): Promise<{ lines: PricedLine[]; issues: Issue[] }> {
  const marks = items.map((_, i) => `?${i + 1}`).join(",");
  const rows = await env.DB.prepare(
    `SELECT v.id, v.sku, v.size, v.colour, v.price_minor, v.currency, v.is_active, p.name, p.status,
            i.track_stock, i.on_hand, i.reserved, i.allow_backorder
       FROM product_variants v JOIN products p ON p.id = v.product_id LEFT JOIN inventory i ON i.variant_id = v.id
      WHERE v.id IN (${marks})`,
  ).bind(...items.map((i) => i.variantId)).all<VRow>();
  const byId = new Map(rows.results.map((r) => [r.id, r]));
  const lines: PricedLine[] = [];
  const issues: Issue[] = [];
  for (const it of items) {
    const r = byId.get(it.variantId);
    if (!r || r.is_active !== 1 || r.status !== "active") { issues.push({ variantId: it.variantId, message: "An item in your cart is no longer available." }); continue; }
    const label = `${r.name}${[r.size, r.colour].filter(Boolean).length ? ` (${[r.size, r.colour].filter(Boolean).join(", ")})` : ""}`;
    if (r.price_minor <= 0) { issues.push({ variantId: r.id, message: `${label} has no online price yet. Please ask for the price on WhatsApp.` }); continue; }
    const tracked = r.track_stock === 1;
    const reserve = tracked && r.allow_backorder !== 1;
    if (r.track_stock === null) { issues.push({ variantId: r.id, message: `${label} is unavailable.` }); continue; }
    if (reserve) {
      const free = (r.on_hand ?? 0) - (r.reserved ?? 0);
      if (free < it.qty) { issues.push({ variantId: r.id, message: free <= 0 ? `${label} is sold out.` : `Only ${free} of ${label} left.` }); continue; }
    }
    lines.push({ variantId: r.id, productName: r.name, sku: r.sku, size: r.size, colour: r.colour, unitMinor: r.price_minor, qty: it.qty, currency: r.currency, reserve });
  }
  return { lines, issues };
}

export async function evaluatePromo(env: Env, code: string, subtotal: number, currency: string): Promise<{ code: string; discountMinor: number }> {
  const bad = () => new HttpError(422, "That discount code is not valid.");
  if (!/^[A-Za-z0-9_-]{2,30}$/.test(code)) throw bad();
  const p = await env.DB.prepare(
    "SELECT code, kind, value, currency, min_subtotal_minor, starts_at, ends_at, max_redemptions, redeemed_count, is_active FROM promotions WHERE code = ?1",
  ).bind(code).first<{ code: string; kind: string; value: number; currency: string | null; min_subtotal_minor: number; starts_at: number | null; ends_at: number | null; max_redemptions: number | null; redeemed_count: number; is_active: number }>();
  const t = now();
  if (!p || p.is_active !== 1) throw bad();
  if ((p.starts_at && p.starts_at > t) || (p.ends_at && p.ends_at < t)) throw new HttpError(422, "That discount code has expired or is not active yet.");
  if (p.max_redemptions !== null && p.redeemed_count >= p.max_redemptions) throw new HttpError(422, "That discount code has been fully used.");
  if (subtotal < p.min_subtotal_minor) throw new HttpError(422, "Your order is below the minimum for that discount code.");
  if (p.kind === "fixed" && p.currency !== currency) throw bad();
  const off = p.kind === "percent" ? Math.floor((subtotal * p.value) / 100) : Math.min(p.value, subtotal);
  return { code: p.code, discountMinor: Math.max(0, Math.min(off, subtotal)) };
}

export async function quote(env: Env, rawItems: unknown, promoCode: unknown): Promise<Quote> {
  const { lines, issues } = await priceLines(env, parseItems(rawItems));
  const currencies = new Set(lines.map((l) => l.currency));
  if (currencies.size > 1) issues.push({ variantId: null, message: "Items priced in different currencies cannot be ordered together." });
  const currency = lines[0]?.currency ?? "NGN";
  const subtotalMinor = lines.reduce((s, l) => s + l.unitMinor * l.qty, 0);
  let discountMinor = 0;
  let code: string | null = null;
  if (typeof promoCode === "string" && promoCode.trim() && lines.length) {
    const r = await evaluatePromo(env, promoCode.trim(), subtotalMinor, currency);
    discountMinor = r.discountMinor;
    code = r.code;
  }
  const shop = await getShop(env);
  const deliveryMinor = lines.length ? shop.deliveryFeeMinor : 0;
  return { lines, issues, currency, subtotalMinor, discountMinor, deliveryMinor, totalMinor: subtotalMinor - discountMinor + deliveryMinor, promoCode: code };
}

/* ---------------- creating an order and holding stock ---------------- */

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const orderNumber = () => "MS-" + [...crypto.getRandomValues(new Uint8Array(6))].map((b) => ALPHABET[b % ALPHABET.length]).join("");
export const newReference = (num: string) => `${num}-${randomToken(5)}`;

export interface NewOrder {
  q: Quote; userId: string | null; name: string; email: string; phone: string; address: Record<string, string>;
  giftMessage: string | null; notes: string | null; provider: string; reference: string; reservationMinutes: number;
}

/**
 * Creates the order, its line snapshots, stock holds and the first payment record in ONE database batch.
 * Stock is held by raising inventory.reserved; the database CHECK (reserved <= on_hand) makes the whole batch
 * fail if another customer took the last item, so two people can never both reserve it.
 */
export async function createOrder(env: Env, o: NewOrder): Promise<{ orderId: string; orderNumber: string; token: string }> {
  if (o.q.totalMinor <= 0) throw new HttpError(422, "That order total is not valid.");
  const token = randomToken(24);
  const tokenHash = await sha256Hex(token);
  const expires = now() + o.reservationMinutes * 60;
  for (let attempt = 0; attempt < 5; attempt++) {
    const orderId = crypto.randomUUID();
    const num = orderNumber();
    const stmts = [
      env.DB.prepare(
        `INSERT INTO orders (id, order_number, user_id, guest_email, guest_name, phone, status, placed_via, currency, subtotal_minor, discount_minor,
                             shipping_minor, total_minor, promotion_code, shipping_address_json, gift_message, notes, public_token_hash)
         VALUES (?1,?2,?3,?4,?5,?6,'unpaid','web',?7,?8,?9,?10,?11,?12,?13,?14,?15,?16)`,
      ).bind(orderId, num, o.userId, o.email, o.name, o.phone, o.q.currency, o.q.subtotalMinor, o.q.discountMinor, o.q.deliveryMinor, o.q.totalMinor, o.q.promoCode, JSON.stringify(o.address), o.giftMessage, o.notes, tokenHash),
    ];
    for (const l of o.q.lines) {
      stmts.push(
        env.DB.prepare(
          "INSERT INTO order_items (id, order_id, variant_id, product_name, variant_sku, size, colour, unit_price_minor, qty, line_total_minor, currency) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)",
        ).bind(crypto.randomUUID(), orderId, l.variantId, l.productName, l.sku, l.size, l.colour, l.unitMinor, l.qty, l.unitMinor * l.qty, l.currency),
      );
      if (l.reserve) {
        stmts.push(
          env.DB.prepare("INSERT INTO stock_reservations (id, variant_id, order_id, qty, status, expires_at) VALUES (?1,?2,?3,?4,'active',?5)").bind(crypto.randomUUID(), l.variantId, orderId, l.qty, expires),
          env.DB.prepare("UPDATE inventory SET reserved = reserved + ?2, updated_at = CAST(strftime('%s','now') AS INTEGER) WHERE variant_id = ?1").bind(l.variantId, l.qty),
        );
      }
    }
    stmts.push(
      env.DB.prepare("INSERT INTO order_events (order_id, from_status, to_status, note, actor_user_id) VALUES (?1, NULL, 'unpaid', 'Order placed on the website', ?2)").bind(orderId, o.userId),
      env.DB.prepare("INSERT INTO payments (id, order_id, provider, reference, amount_minor, currency, status) VALUES (?1,?2,?3,?4,?5,?6,'initiated')").bind(crypto.randomUUID(), orderId, o.provider, o.reference, o.q.totalMinor, o.q.currency),
    );
    try {
      await env.DB.batch(stmts);
      return { orderId, orderNumber: num, token };
    } catch (e) {
      const s = String(e);
      if (s.includes("CHECK")) throw new HttpError(409, "Sorry, one of your items was just taken by another customer. Please review your cart.");
      if (s.includes("UNIQUE") && s.includes("order_number")) continue;
      throw e;
    }
  }
  throw new HttpError(500, "Could not create the order. Please try again.");
}

/* ---------------- releasing, cancelling, finalising ---------------- */

interface ResRow { id: string; variant_id: string; qty: number; status: string }
const reservationsOf = (env: Env, orderId: string) =>
  env.DB.prepare("SELECT id, variant_id, qty, status FROM stock_reservations WHERE order_id = ?1").bind(orderId).all<ResRow>();

/** Cancels an UNPAID order and gives its held stock back. Safe to call more than once. */
export async function cancelUnpaidOrder(env: Env, orderId: string, note: string, actor: string | null, reservationStatus: "released" | "expired" = "released"): Promise<boolean> {
  const res = await reservationsOf(env, orderId);
  const stmts = [
    env.DB.prepare("UPDATE orders SET status='cancelled', updated_at=CAST(strftime('%s','now') AS INTEGER) WHERE id=?1 AND status='unpaid'").bind(orderId),
    env.DB.prepare("INSERT INTO order_events (order_id, from_status, to_status, note, actor_user_id) SELECT ?1,'unpaid','cancelled',?2,?3 WHERE changes() > 0").bind(orderId, note, actor),
  ];
  for (const r of res.results.filter((x) => x.status === "active")) {
    stmts.push(
      env.DB.prepare("UPDATE stock_reservations SET status=?2 WHERE id=?1 AND status='active'").bind(r.id, reservationStatus),
      env.DB.prepare("UPDATE inventory SET reserved = reserved - ?2, updated_at=CAST(strftime('%s','now') AS INTEGER) WHERE variant_id=?1 AND changes() > 0").bind(r.variant_id, r.qty),
    );
  }
  stmts.push(env.DB.prepare("UPDATE payments SET status='abandoned' WHERE order_id=?1 AND status IN ('initiated','pending')").bind(orderId));
  const out = await env.DB.batch(stmts);
  return (out[0].meta.changes ?? 0) > 0;
}

/** Frees stock held by orders whose payment window ran out. Runs on a schedule and before each checkout. */
export async function releaseExpired(env: Env): Promise<number> {
  const rows = await env.DB.prepare("SELECT DISTINCT order_id FROM stock_reservations WHERE status='active' AND expires_at < ?1 LIMIT 25").bind(now()).all<{ order_id: string }>();
  let n = 0;
  for (const r of rows.results) {
    if (await cancelUnpaidOrder(env, r.order_id, "Payment window expired; stock released", null, "expired")) n++;
  }
  return n;
}

/**
 * Marks an order paid and moves its held stock into real sales. Idempotent: each statement is guarded, so
 * calling it again (a repeated webhook, a second browser tab) changes nothing.
 */
export async function finalizePaid(env: Env, orderId: string, actor: string | null, note: string): Promise<boolean> {
  const order = await env.DB.prepare("SELECT status, promotion_code FROM orders WHERE id=?1").bind(orderId).first<{ status: string; promotion_code: string | null }>();
  if (!order) throw new HttpError(404, "Order not found.");
  if (["fulfilling", "completed", "refunded"].includes(order.status)) return false;
  const res = await reservationsOf(env, orderId);
  const stmts = [
    env.DB.prepare("UPDATE orders SET status='paid_verified', paid_at=COALESCE(paid_at, ?2), updated_at=?2 WHERE id=?1 AND status IN ('unpaid','cancelled')").bind(orderId, now()),
    env.DB.prepare("INSERT INTO order_events (order_id, from_status, to_status, note, actor_user_id) SELECT ?1,?2,'paid_verified',?3,?4 WHERE changes() > 0").bind(orderId, order.status, note, actor),
  ];
  if (order.promotion_code) stmts.push(env.DB.prepare("UPDATE promotions SET redeemed_count = redeemed_count + 1 WHERE code=?1 AND changes() > 0").bind(order.promotion_code));
  for (const r of res.results.filter((x) => x.status === "active")) {
    stmts.push(
      env.DB.prepare("UPDATE stock_reservations SET status='committed' WHERE id=?1 AND status='active'").bind(r.id),
      env.DB.prepare("UPDATE inventory SET on_hand = on_hand - ?2, reserved = reserved - ?2, updated_at=CAST(strftime('%s','now') AS INTEGER) WHERE variant_id=?1 AND changes() > 0").bind(r.variant_id, r.qty),
      env.DB.prepare("INSERT INTO inventory_movements (variant_id, delta, reason, ref_type, ref_id, note) SELECT ?1, -?2, 'sale', 'order', ?3, 'Online sale' WHERE changes() > 0").bind(r.variant_id, r.qty, orderId),
    );
  }
  await env.DB.batch(stmts);
  // A payment can arrive after the hold expired (the customer was slow). The money is real, so the order is
  // honoured; take the stock now if it is still there, otherwise flag it for the owner.
  for (const r of res.results.filter((x) => x.status === "expired" || x.status === "released")) {
    const inv = await env.DB.prepare("SELECT track_stock, on_hand, reserved FROM inventory WHERE variant_id=?1").bind(r.variant_id).first<{ track_stock: number; on_hand: number; reserved: number }>();
    const ok = !!inv && inv.on_hand - inv.reserved >= r.qty;
    await env.DB.batch([
      env.DB.prepare("UPDATE stock_reservations SET status='committed' WHERE id=?1 AND status IN ('expired','released')").bind(r.id),
      ok
        ? env.DB.prepare("UPDATE inventory SET on_hand = on_hand - ?2, updated_at=CAST(strftime('%s','now') AS INTEGER) WHERE variant_id=?1 AND changes() > 0").bind(r.variant_id, r.qty)
        : env.DB.prepare("UPDATE orders SET notes = COALESCE(notes || char(10), '') || 'STOCK SHORTFALL: payment arrived after the stock hold expired. Check availability and contact the customer.' WHERE id=?1 AND changes() > 0").bind(orderId),
      ...(ok ? [env.DB.prepare("INSERT INTO inventory_movements (variant_id, delta, reason, ref_type, ref_id, note) SELECT ?1, -?2, 'sale', 'order', ?3, 'Online sale (late payment)' WHERE changes() > 0").bind(r.variant_id, r.qty, orderId)] : []),
    ]);
  }
  return true;
}

export type Settled = "success" | "failed" | "abandoned" | "pending" | "mismatch";

/**
 * The ONLY place an order becomes paid by a provider. It asks the provider directly (server to server) and checks
 * the amount and currency. A browser redirect or a webhook body alone is never trusted.
 */
export async function settlePayment(env: Env, provider: PaymentProvider, reference: string): Promise<Settled> {
  const pay = await env.DB.prepare("SELECT id, order_id, provider, amount_minor, currency, status FROM payments WHERE reference=?1").bind(reference).first<{ id: string; order_id: string; provider: string; amount_minor: number; currency: string; status: string }>();
  if (!pay || pay.provider !== provider.name) throw new HttpError(404, "Payment not found.");
  if (pay.status === "success") {
    await finalizePaid(env, pay.order_id, null, "Payment confirmed"); // repairs a half-finished earlier attempt
    return "success";
  }
  const v = await provider.verify(reference);
  if (v.reference !== reference) return "pending";
  if (v.status === "success") {
    if (v.amountMinor !== pay.amount_minor || v.currency !== pay.currency) {
      await env.DB.prepare("UPDATE payments SET status='failed', provider_payload=?2 WHERE id=?1 AND status<>'success'").bind(pay.id, JSON.stringify({ mismatch: true, expected: pay.amount_minor, got: v.amountMinor, currency: v.currency })).run();
      await audit(env, { actor: null, action: "payment.amount_mismatch", entity: "payment", entityId: pay.id, meta: { reference, expected: pay.amount_minor, got: v.amountMinor } });
      return "mismatch";
    }
    await env.DB.prepare("UPDATE payments SET status='success', verified_at=?2, provider_payload=?3 WHERE id=?1 AND status<>'success'").bind(pay.id, now(), JSON.stringify(v.raw)).run();
    await finalizePaid(env, pay.order_id, null, `Payment confirmed by ${provider.name}`);
    return "success";
  }
  if (v.status === "failed" || v.status === "abandoned") {
    await env.DB.prepare("UPDATE payments SET status=?2 WHERE id=?1 AND status IN ('initiated','pending')").bind(pay.id, v.status).run();
  }
  return v.status;
}
