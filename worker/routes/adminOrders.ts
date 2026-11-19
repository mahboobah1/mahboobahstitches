import type { Env } from "../types";
import { audit } from "../lib/audit";
import { randomToken } from "../lib/crypto";
import { guard, ip } from "../lib/guard";
import { HttpError, json, readJson } from "../lib/http";
import { cancelUnpaidOrder, finalizePaid } from "../lib/orders";
import * as v from "../lib/validate";

type Params = Record<string, string>;
const STATUSES = ["enquiry", "unpaid", "paid_verified", "fulfilling", "completed", "cancelled", "refunded"] as const;
/** Allowed moves. Paying an order is only ever done by a verified payment or an audited manual confirmation. */
const NEXT: Record<string, string[]> = {
  unpaid: ["cancelled"],
  paid_verified: ["fulfilling", "completed", "refunded"],
  fulfilling: ["paid_verified", "completed", "refunded"],
  completed: ["refunded"],
};

export async function listOrders(env: Env, req: Request): Promise<Response> {
  await guard(env, req, "orders:manage");
  const u = new URL(req.url).searchParams;
  const status = u.get("status") ?? "";
  const q = (u.get("q") ?? "").trim().toLowerCase().slice(0, 60);
  if (status && !(STATUSES as readonly string[]).includes(status)) throw new HttpError(422, "Unknown status.");
  const rows = await env.DB.prepare(
    `SELECT id, order_number AS number, status, currency, total_minor AS totalMinor, guest_name AS name, guest_email AS email, created_at AS createdAt, paid_at AS paidAt
       FROM orders WHERE (?1 = '' OR status = ?1) AND (?2 = '' OR lower(order_number) LIKE '%' || ?2 || '%' OR lower(COALESCE(guest_name,'')) LIKE '%' || ?2 || '%' OR lower(COALESCE(guest_email,'')) LIKE '%' || ?2 || '%')
      ORDER BY created_at DESC, rowid DESC LIMIT 200`,
  ).bind(status, q).all();
  return json({ orders: rows.results });
}

export async function getOrderAdmin(env: Env, req: Request, p: Params): Promise<Response> {
  await guard(env, req, "orders:manage");
  const id = v.id(p.id);
  const o = await env.DB.prepare(
    `SELECT id, order_number AS number, status, currency, subtotal_minor AS subtotalMinor, discount_minor AS discountMinor, shipping_minor AS shippingMinor, total_minor AS totalMinor,
            promotion_code AS promotionCode, guest_name AS name, guest_email AS email, phone, shipping_address_json AS address, gift_message AS giftMessage, notes, created_at AS createdAt, paid_at AS paidAt, placed_via AS placedVia
       FROM orders WHERE id=?1`,
  ).bind(id).first<Record<string, unknown> & { address: string | null }>();
  if (!o) throw new HttpError(404, "Order not found.");
  const [items, pays, events] = await Promise.all([
    env.DB.prepare("SELECT product_name AS name, variant_sku AS sku, size, colour, unit_price_minor AS unitMinor, qty, line_total_minor AS lineMinor FROM order_items WHERE order_id=?1 ORDER BY rowid").bind(id).all(),
    env.DB.prepare("SELECT id, provider, reference, amount_minor AS amountMinor, currency, status, verified_at AS verifiedAt, created_at AS createdAt FROM payments WHERE order_id=?1 ORDER BY rowid").bind(id).all(),
    env.DB.prepare("SELECT e.from_status AS fromStatus, e.to_status AS toStatus, e.note, e.created_at AS at, u.email AS actorEmail FROM order_events e LEFT JOIN users u ON u.id = e.actor_user_id WHERE e.order_id=?1 ORDER BY e.id").bind(id).all(),
  ]);
  return json({ order: { ...o, address: o.address ? JSON.parse(o.address) : null }, items: items.results, payments: pays.results, events: events.results, allowedNext: NEXT[String(o.status)] ?? [] });
}

export async function setOrderStatus(env: Env, req: Request, p: Params): Promise<Response> {
  const user = await guard(env, req, "orders:manage");
  const id = v.id(p.id);
  const b = await readJson(req);
  const to = v.oneOf(b.status, "Status", STATUSES);
  const note = v.optText(b.note, "Note", 300);
  const o = await env.DB.prepare("SELECT status FROM orders WHERE id=?1").bind(id).first<{ status: string }>();
  if (!o) throw new HttpError(404, "Order not found.");
  if (!(NEXT[o.status] ?? []).includes(to)) throw new HttpError(409, `An order that is "${o.status}" cannot be moved to "${to}".`);
  if (to === "cancelled") {
    await cancelUnpaidOrder(env, id, note ?? "Cancelled by staff", user.id);
  } else {
    const [res] = await env.DB.batch([
      env.DB.prepare("UPDATE orders SET status=?2, updated_at=CAST(strftime('%s','now') AS INTEGER) WHERE id=?1 AND status=?3").bind(id, to, o.status),
      env.DB.prepare("INSERT INTO order_events (order_id, from_status, to_status, note, actor_user_id) SELECT ?1,?2,?3,?4,?5 WHERE changes() > 0").bind(id, o.status, to, note, user.id),
    ]);
    if (!res.meta.changes) throw new HttpError(409, "That order was changed by someone else. Reload and try again.");
  }
  await audit(env, { actor: user.id, action: "order.status", entity: "order", entityId: id, ip: ip(req), meta: { from: o.status, to } });
  return json({ ok: true });
}

/** For a bank transfer or cash payment the owner has checked personally. Recorded as a manual payment and audited. */
export async function markPaidManually(env: Env, req: Request, p: Params): Promise<Response> {
  const user = await guard(env, req, "orders:manage");
  const id = v.id(p.id);
  const b = await readJson(req);
  const note = v.text(b.note, "A note about how it was paid", 3, 200);
  const o = await env.DB.prepare("SELECT order_number, status, total_minor, currency FROM orders WHERE id=?1").bind(id).first<{ order_number: string; status: string; total_minor: number; currency: string }>();
  if (!o) throw new HttpError(404, "Order not found.");
  if (o.status !== "unpaid") throw new HttpError(409, "Only an unpaid order can be marked as paid.");
  await env.DB.prepare("INSERT INTO payments (id, order_id, provider, reference, amount_minor, currency, status, verified_at, provider_payload) VALUES (?1,?2,'manual',?3,?4,?5,'success',CAST(strftime('%s','now') AS INTEGER),?6)")
    .bind(crypto.randomUUID(), id, `MANUAL-${o.order_number}-${randomToken(3)}`, o.total_minor, o.currency, JSON.stringify({ note, by: user.email })).run();
  await finalizePaid(env, id, user.id, `Marked paid manually: ${note}`);
  await audit(env, { actor: user.id, action: "order.manual_payment", entity: "order", entityId: id, ip: ip(req), meta: { note } });
  return json({ ok: true });
}

export async function addOrderNote(env: Env, req: Request, p: Params): Promise<Response> {
  const user = await guard(env, req, "orders:manage");
  const id = v.id(p.id);
  const note = v.text((await readJson(req)).note, "Note", 2, 300);
  const o = await env.DB.prepare("SELECT status FROM orders WHERE id=?1").bind(id).first<{ status: string }>();
  if (!o) throw new HttpError(404, "Order not found.");
  await env.DB.prepare("INSERT INTO order_events (order_id, from_status, to_status, note, actor_user_id) VALUES (?1,?2,?2,?3,?4)").bind(id, o.status, note, user.id).run();
  return json({ ok: true });
}

export async function listPayments(env: Env, req: Request): Promise<Response> {
  await guard(env, req, "orders:manage");
  const rows = await env.DB.prepare(
    `SELECT p.id, p.provider, p.reference, p.amount_minor AS amountMinor, p.currency, p.status, p.verified_at AS verifiedAt, p.created_at AS createdAt, o.order_number AS orderNumber, o.id AS orderId
       FROM payments p JOIN orders o ON o.id = p.order_id ORDER BY p.created_at DESC, p.rowid DESC LIMIT 200`,
  ).all();
  return json({ payments: rows.results });
}

/* ---------------- discount codes ---------------- */

export async function listPromotions(env: Env, req: Request): Promise<Response> {
  await guard(env, req, "orders:manage");
  const rows = await env.DB.prepare(
    "SELECT id, code, kind, value, currency, min_subtotal_minor AS minSubtotalMinor, starts_at AS startsAt, ends_at AS endsAt, max_redemptions AS maxRedemptions, redeemed_count AS redeemedCount, is_active AS isActive FROM promotions ORDER BY rowid DESC LIMIT 200",
  ).all();
  return json({ promotions: rows.results });
}

function parsePromo(b: Record<string, unknown>) {
  const code = typeof b.code === "string" ? b.code.trim().toUpperCase() : "";
  if (!/^[A-Z0-9_-]{2,30}$/.test(code)) throw new HttpError(422, "The code must be 2 to 30 letters, numbers, hyphens or underscores.");
  const kind = v.oneOf(b.kind, "Type", ["percent", "fixed"] as const);
  const value = v.int(b.value, "Amount", 1, kind === "percent" ? 100 : 1_000_000_000);
  const opt = (x: unknown, label: string) => (x === null || x === undefined || x === "" ? null : v.int(x, label, 1, 4_102_444_800));
  return {
    code, kind, value, currency: kind === "fixed" ? "NGN" : null,
    min: v.int(b.minSubtotalMinor ?? 0, "Minimum order", 0, 1_000_000_000),
    startsAt: opt(b.startsAt, "Start date"), endsAt: opt(b.endsAt, "End date"), max: opt(b.maxRedemptions, "Maximum uses"),
    active: v.bool(b.isActive) ? 1 : 0,
  };
}

export async function createPromotion(env: Env, req: Request): Promise<Response> {
  const user = await guard(env, req, "orders:manage");
  const d = parsePromo(await readJson(req));
  const id = crypto.randomUUID();
  try {
    await env.DB.prepare("INSERT INTO promotions (id, code, kind, value, currency, min_subtotal_minor, starts_at, ends_at, max_redemptions, is_active) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)")
      .bind(id, d.code, d.kind, d.value, d.currency, d.min, d.startsAt, d.endsAt, d.max, d.active).run();
  } catch (e) {
    if (String(e).includes("UNIQUE")) throw new HttpError(409, "That code already exists.");
    throw e;
  }
  await audit(env, { actor: user.id, action: "promotion.create", entity: "promotion", entityId: id, ip: ip(req), meta: { code: d.code } });
  return json({ id }, 201);
}

export async function updatePromotion(env: Env, req: Request, p: Params): Promise<Response> {
  const user = await guard(env, req, "orders:manage");
  const id = v.id(p.id);
  const d = parsePromo(await readJson(req));
  const res = await env.DB.prepare("UPDATE promotions SET kind=?2, value=?3, currency=?4, min_subtotal_minor=?5, starts_at=?6, ends_at=?7, max_redemptions=?8, is_active=?9 WHERE id=?1")
    .bind(id, d.kind, d.value, d.currency, d.min, d.startsAt, d.endsAt, d.max, d.active).run();
  if (!res.meta.changes) throw new HttpError(404, "Code not found.");
  await audit(env, { actor: user.id, action: "promotion.update", entity: "promotion", entityId: id, ip: ip(req) });
  return json({ ok: true });
}
