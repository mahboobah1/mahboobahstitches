import type { Env } from "../types";
import { audit } from "../lib/audit";
import { guard, ip } from "../lib/guard";
import { HttpError, assertSameOrigin, clientIp, json, readJson } from "../lib/http";
import { rateLimit } from "../lib/ratelimit";
import { addDays, fromEpoch, getBookingSettings } from "../lib/time";
import * as v from "../lib/validate";

type Params = Record<string, string>;
const now = () => Math.floor(Date.now() / 1000);
const PAID = "('paid_verified','fulfilling','completed')";

/* ---------------- analytics: real records only ---------------- */

export async function analytics(env: Env, req: Request): Promise<Response> {
  await guard(env, req, "analytics:read");
  const days = Math.max(1, Math.min(366, Math.floor(Number(new URL(req.url).searchParams.get("days") ?? 30)) || 30));
  const tz = (await getBookingSettings(env)).tzOffsetMinutes;
  const since = now() - days * 86400;
  const n = async (sql: string, ...b: unknown[]) => (await env.DB.prepare(sql).bind(...b).first<{ n: number }>())?.n ?? 0;
  const [dailyRows, topProducts, byCollection, lowStock, statuses, promos] = await Promise.all([
    env.DB.prepare(`SELECT strftime('%Y-%m-%d', paid_at + ?1*60, 'unixepoch') AS d, SUM(total_minor) AS revenueMinor, COUNT(*) AS orders FROM orders WHERE currency='NGN' AND status IN ${PAID} AND paid_at >= ?2 GROUP BY d ORDER BY d`).bind(tz, since).all<{ d: string; revenueMinor: number; orders: number }>(),
    env.DB.prepare(`SELECT i.product_name AS name, SUM(i.qty) AS qty, SUM(i.line_total_minor) AS revenueMinor FROM order_items i JOIN orders o ON o.id=i.order_id WHERE o.currency='NGN' AND o.status IN ${PAID} AND o.paid_at >= ?1 AND i.variant_sku NOT LIKE 'PKG-%' GROUP BY i.product_name ORDER BY revenueMinor DESC LIMIT 10`).bind(since).all(),
    env.DB.prepare(`SELECT COALESCE(c.name,'Custom and other') AS name, SUM(i.qty) AS qty, SUM(i.line_total_minor) AS revenueMinor FROM order_items i JOIN orders o ON o.id=i.order_id LEFT JOIN product_variants v ON v.id=i.variant_id LEFT JOIN products p ON p.id=v.product_id LEFT JOIN collections c ON c.id=p.collection_id WHERE o.currency='NGN' AND o.status IN ${PAID} AND o.paid_at >= ?1 GROUP BY COALESCE(c.name,'Custom and other') ORDER BY revenueMinor DESC`).bind(since).all(),
    env.DB.prepare(`SELECT p.name AS name, v.sku AS sku, v.size AS size, v.colour AS colour, i.on_hand AS onHand, (i.on_hand - i.reserved) AS available FROM inventory i JOIN product_variants v ON v.id=i.variant_id JOIN products p ON p.id=v.product_id WHERE i.track_stock=1 AND p.status='active' AND v.is_active=1 AND (i.on_hand - i.reserved) <= 3 ORDER BY available, p.name LIMIT 15`).all(),
    env.DB.prepare("SELECT status, COUNT(*) AS n FROM orders WHERE created_at >= ?1 GROUP BY status").bind(since).all<{ status: string; n: number }>(),
    env.DB.prepare(`SELECT promotion_code AS code, COUNT(*) AS orders, SUM(discount_minor - bundle_discount_minor) AS discountMinor FROM orders WHERE promotion_code IS NOT NULL AND status IN ${PAID} AND paid_at >= ?1 GROUP BY promotion_code ORDER BY orders DESC LIMIT 10`).bind(since).all(),
  ]);
  // Fill days with no sales so the chart has no gaps.
  const map = new Map(dailyRows.results.map((r) => [r.d, r]));
  const today = fromEpoch(now(), tz).date;
  const daily: { date: string; revenueMinor: number; orders: number }[] = [];
  for (let d = addDays(today, -(days - 1)); d <= today; d = addDays(d, 1)) { const r = map.get(d); daily.push({ date: d, revenueMinor: r?.revenueMinor ?? 0, orders: r?.orders ?? 0 }); }
  const revenueMinor = daily.reduce((s, d) => s + d.revenueMinor, 0);
  const orders = daily.reduce((s, d) => s + d.orders, 0);
  return json({
    days,
    totals: {
      revenueMinor, orders, averageOrderMinor: orders ? Math.floor(revenueMinor / orders) : 0,
      unitsSold: await n(`SELECT COALESCE(SUM(i.qty),0) AS n FROM order_items i JOIN orders o ON o.id=i.order_id WHERE o.status IN ${PAID} AND o.paid_at >= ?1 AND i.variant_sku NOT LIKE 'PKG-%'`, since),
      newCustomers: await n("SELECT COUNT(*) AS n FROM users WHERE role='CUSTOMER' AND created_at >= ?1", since),
      newSubscribers: await n("SELECT COUNT(*) AS n FROM newsletter_subscribers WHERE created_at >= ?1", since),
      bookings: await n("SELECT COUNT(*) AS n FROM bookings WHERE created_at >= ?1", since),
      bespokeRequests: await n("SELECT COUNT(*) AS n FROM bespoke_requests WHERE created_at >= ?1", since),
      giftOrders: await n(`SELECT COUNT(DISTINCT g.order_id) AS n FROM order_gifts g JOIN orders o ON o.id=g.order_id WHERE o.status IN ${PAID} AND o.paid_at >= ?1`, since),
    },
    daily, topProducts: topProducts.results, byCollection: byCollection.results, lowStock: lowStock.results, ordersByStatus: statuses.results, promotions: promos.results,
    note: "Figures come from paid orders and other saved records. Website visits and conversion rates are not tracked.",
  });
}

/* ---------------- customers ---------------- */

export async function listCustomers(env: Env, req: Request): Promise<Response> {
  await guard(env, req, "orders:manage");
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().toLowerCase().slice(0, 60);
  const rows = await env.DB.prepare(
    `SELECT u.id, u.full_name AS name, u.email, u.phone, u.is_active AS isActive, u.created_at AS createdAt,
            (SELECT COUNT(*) FROM orders o WHERE o.user_id=u.id AND o.status IN ${PAID}) AS paidOrders,
            (SELECT COALESCE(SUM(o.total_minor),0) FROM orders o WHERE o.user_id=u.id AND o.status IN ${PAID} AND o.currency='NGN') AS spentMinor
       FROM users u WHERE u.role='CUSTOMER' AND (?1='' OR lower(u.email) LIKE '%'||?1||'%' OR lower(u.full_name) LIKE '%'||?1||'%')
      ORDER BY u.created_at DESC LIMIT 200`,
  ).bind(q).all();
  return json({ customers: rows.results });
}

export async function getCustomer(env: Env, req: Request, p: Params): Promise<Response> {
  await guard(env, req, "orders:manage");
  const id = v.id(p.id);
  const u = await env.DB.prepare("SELECT id, full_name AS name, email, phone, is_active AS isActive, created_at AS createdAt FROM users WHERE id=?1 AND role='CUSTOMER'").bind(id).first();
  if (!u) throw new HttpError(404, "Customer not found.");
  const [orders, bookings, bespoke, addresses] = await Promise.all([
    env.DB.prepare("SELECT id, order_number AS number, status, currency, total_minor AS totalMinor, created_at AS createdAt FROM orders WHERE user_id=?1 ORDER BY created_at DESC LIMIT 50").bind(id).all(),
    env.DB.prepare("SELECT b.id, b.reference, b.status, b.starts_at AS startsAt, t.name AS type FROM bookings b JOIN booking_types t ON t.id=b.booking_type_id WHERE b.user_id=?1 ORDER BY b.starts_at DESC LIMIT 50").bind(id).all(),
    env.DB.prepare("SELECT id, reference, outfit_category AS category, status, created_at AS createdAt FROM bespoke_requests WHERE user_id=?1 ORDER BY created_at DESC LIMIT 50").bind(id).all(),
    env.DB.prepare("SELECT label, recipient_name AS recipientName, line1, city, state, country_code AS countryCode FROM addresses WHERE user_id=?1 ORDER BY is_default DESC LIMIT 10").bind(id).all(),
  ]);
  return json({ customer: u, orders: orders.results, bookings: bookings.results, bespoke: bespoke.results, addresses: addresses.results });
}

/* ---------------- CSV exports (spreadsheet-safe) ---------------- */

const cell = (x: unknown): string => {
  let s = x === null || x === undefined ? "" : String(x);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // stops spreadsheet formula injection
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const naira = (m: number) => (m / 100).toFixed(2);
const csv = (name: string, head: string[], rows: unknown[][]) =>
  new Response([head.map(cell).join(","), ...rows.map((r) => r.map(cell).join(","))].join("\r\n") + "\r\n", { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${name}"`, "cache-control": "no-store" } });
const iso = (e: number | null) => (e ? new Date(e * 1000).toISOString() : "");

export async function exportOrders(env: Env, req: Request): Promise<Response> {
  await guard(env, req, "analytics:read");
  const days = Math.max(1, Math.min(3650, Math.floor(Number(new URL(req.url).searchParams.get("days") ?? 365)) || 365));
  const r = await env.DB.prepare("SELECT order_number, status, placed_via, created_at, paid_at, guest_name, guest_email, phone, currency, subtotal_minor, discount_minor, shipping_minor, total_minor, promotion_code, shipping_method FROM orders WHERE created_at >= ?1 ORDER BY created_at DESC LIMIT 5000").bind(now() - days * 86400).all<Record<string, number | string | null>>();
  return csv("orders.csv", ["Order", "Status", "Source", "Placed", "Paid", "Customer", "Email", "Phone", "Currency", "Subtotal", "Discount", "Delivery", "Total", "Discount code", "Delivery option"],
    r.results.map((o) => [o.order_number, o.status, o.placed_via, iso(o.created_at as number), iso(o.paid_at as number | null), o.guest_name, o.guest_email, o.phone, o.currency, naira(o.subtotal_minor as number), naira(o.discount_minor as number), naira(o.shipping_minor as number), naira(o.total_minor as number), o.promotion_code, o.shipping_method]));
}
export async function exportCustomers(env: Env, req: Request): Promise<Response> {
  await guard(env, req, "analytics:read");
  const r = await env.DB.prepare(`SELECT u.full_name, u.email, u.phone, u.created_at, (SELECT COUNT(*) FROM orders o WHERE o.user_id=u.id AND o.status IN ${PAID}) AS paid_orders, (SELECT COALESCE(SUM(o.total_minor),0) FROM orders o WHERE o.user_id=u.id AND o.status IN ${PAID}) AS spent FROM users u WHERE u.role='CUSTOMER' ORDER BY u.created_at DESC LIMIT 10000`).all<{ full_name: string; email: string; phone: string | null; created_at: number; paid_orders: number; spent: number }>();
  return csv("customers.csv", ["Name", "Email", "Phone", "Joined", "Paid orders", "Total spent"], r.results.map((u) => [u.full_name, u.email, u.phone, iso(u.created_at), u.paid_orders, naira(u.spent)]));
}
export async function exportSubscribers(env: Env, req: Request): Promise<Response> {
  await guard(env, req, "analytics:read");
  const r = await env.DB.prepare("SELECT email, source, created_at FROM newsletter_subscribers ORDER BY created_at DESC LIMIT 20000").all<{ email: string; source: string | null; created_at: number }>();
  return csv("subscribers.csv", ["Email", "Source", "Joined"], r.results.map((s) => [s.email, s.source, iso(s.created_at)]));
}

/* ---------------- newsletter ---------------- */

export async function subscribe(env: Env, req: Request): Promise<Response> {
  assertSameOrigin(req);
  await rateLimit(env, `news:ip:${clientIp(req)}`, 5, 3600);
  const b = await readJson(req);
  const email = v.email(b.email);
  await env.DB.prepare("INSERT OR IGNORE INTO newsletter_subscribers (id, email, source) VALUES (?1,?2,?3)").bind(crypto.randomUUID(), email, v.optText(b.source, "Source", 30) ?? "website").run();
  return json({ ok: true }, 201); // same answer whether or not the address was already there
}
export async function listSubscribers(env: Env, req: Request): Promise<Response> {
  await guard(env, req, "analytics:read");
  const r = await env.DB.prepare("SELECT id, email, source, created_at AS createdAt FROM newsletter_subscribers ORDER BY created_at DESC LIMIT 500").all();
  return json({ subscribers: r.results });
}
export async function removeSubscriber(env: Env, req: Request, p: Params): Promise<Response> {
  const user = await guard(env, req, "analytics:read");
  await env.DB.prepare("DELETE FROM newsletter_subscribers WHERE id=?1").bind(v.id(p.id)).run();
  await audit(env, { actor: user.id, action: "newsletter.remove", entity: "subscriber", entityId: p.id, ip: ip(req) });
  return json({ ok: true });
}
