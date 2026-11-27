import type { Env } from "../types";
import { audit } from "../lib/audit";
import { guard, ip } from "../lib/guard";
import { HttpError, clientIp, json, readJson } from "../lib/http";
import { rateLimit } from "../lib/ratelimit";
import { activeCountries, ratesFor, zonesConfigured } from "../lib/shipping";
import * as v from "../lib/validate";

type Params = Record<string, string>;
const now = () => Math.floor(Date.now() / 1000);

/* ---------------- public: what can customers choose at checkout ---------------- */

export async function publicCountries(env: Env): Promise<Response> {
  const configured = await zonesConfigured(env);
  return json({ configured, countries: configured ? await activeCountries(env) : ["NG"] });
}

export async function publicOptions(env: Env, req: Request): Promise<Response> {
  await rateLimit(env, `ship:ip:${clientIp(req)}`, 120, 600);
  const u = new URL(req.url).searchParams;
  const country = (u.get("country") ?? "").toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) throw new HttpError(422, "Choose a country.");
  const subtotal = Number(u.get("subtotal") ?? 0);
  return json({ options: await ratesFor(env, country, u.get("state") ?? "", Number.isFinite(subtotal) && subtotal >= 0 ? Math.floor(subtotal) : 0) });
}

/* ---------------- admin: zones and rates ---------------- */

export async function adminShipping(env: Env, req: Request): Promise<Response> {
  await guard(env, req, "orders:manage");
  const [zones, rates] = await Promise.all([
    env.DB.prepare("SELECT id, name, countries_json, states_json, is_active, sort_order FROM shipping_zones ORDER BY sort_order, rowid").all<{ id: string; name: string; countries_json: string; states_json: string | null; is_active: number; sort_order: number }>(),
    env.DB.prepare("SELECT id, zone_id, name, price_minor, min_days, max_days, free_over_minor, is_active FROM shipping_rates ORDER BY sort_order, rowid").all<{ id: string; zone_id: string; name: string; price_minor: number; min_days: number | null; max_days: number | null; free_over_minor: number | null; is_active: number }>(),
  ]);
  return json({
    zones: zones.results.map((z) => ({
      id: z.id, name: z.name, countries: JSON.parse(z.countries_json), states: z.states_json ? JSON.parse(z.states_json) : null, isActive: z.is_active, sortOrder: z.sort_order,
      rates: rates.results.filter((r) => r.zone_id === z.id).map((r) => ({ id: r.id, name: r.name, priceMinor: r.price_minor, minDays: r.min_days, maxDays: r.max_days, freeOverMinor: r.free_over_minor, isActive: r.is_active })),
    })),
  });
}

function parseZone(b: Record<string, unknown>) {
  if (!Array.isArray(b.countries) || b.countries.length === 0 || b.countries.length > 60) throw new HttpError(422, "Add at least one country (two-letter code, e.g. NG).");
  const countries = [...new Set(b.countries.map((c) => (typeof c === "string" ? c.trim().toUpperCase() : "")))];
  if (countries.some((c) => !/^[A-Z]{2}$/.test(c))) throw new HttpError(422, "Countries must be two-letter codes such as NG, GH, GB.");
  let states: string[] | null = null;
  if (Array.isArray(b.states) && b.states.length > 0) {
    if (b.states.length > 60 || b.states.some((s) => typeof s !== "string" || s.trim().length < 2 || s.length > 40)) throw new HttpError(422, "States are not valid.");
    states = b.states.map((s) => (s as string).trim());
  }
  return { name: v.text(b.name, "Zone name", 2, 60), countries, states, active: b.isActive === undefined || v.bool(b.isActive) ? 1 : 0, order: v.int(b.sortOrder ?? 0, "Order", 0, 1000) };
}
export async function createZone(env: Env, req: Request): Promise<Response> {
  const user = await guard(env, req, "orders:manage");
  const d = parseZone(await readJson(req));
  const id = `zone_${crypto.randomUUID().slice(0, 8)}`;
  await env.DB.prepare("INSERT INTO shipping_zones (id, name, countries_json, states_json, is_active, sort_order) VALUES (?1,?2,?3,?4,?5,?6)").bind(id, d.name, JSON.stringify(d.countries), d.states ? JSON.stringify(d.states) : null, d.active, d.order).run();
  await audit(env, { actor: user.id, action: "shipping.zone.create", entity: "zone", entityId: id, ip: ip(req) });
  return json({ id }, 201);
}
export async function updateZone(env: Env, req: Request, p: Params): Promise<Response> {
  const user = await guard(env, req, "orders:manage");
  const d = parseZone(await readJson(req));
  const r = await env.DB.prepare("UPDATE shipping_zones SET name=?2, countries_json=?3, states_json=?4, is_active=?5, sort_order=?6 WHERE id=?1").bind(v.id(p.id), d.name, JSON.stringify(d.countries), d.states ? JSON.stringify(d.states) : null, d.active, d.order).run();
  if (!r.meta.changes) throw new HttpError(404, "Zone not found.");
  await audit(env, { actor: user.id, action: "shipping.zone.update", entity: "zone", entityId: p.id, ip: ip(req) });
  return json({ ok: true });
}
export async function deleteZone(env: Env, req: Request, p: Params): Promise<Response> {
  const user = await guard(env, req, "orders:manage");
  await env.DB.prepare("DELETE FROM shipping_zones WHERE id=?1").bind(v.id(p.id)).run();
  await audit(env, { actor: user.id, action: "shipping.zone.delete", entity: "zone", entityId: p.id, ip: ip(req) });
  return json({ ok: true });
}
function parseRate(b: Record<string, unknown>) {
  const opt = (x: unknown, label: string, lo: number, hi: number) => (x === undefined || x === null || x === "" ? null : v.int(x, label, lo, hi));
  const minDays = opt(b.minDays, "Minimum days", 0, 90), maxDays = opt(b.maxDays, "Maximum days", 0, 90);
  if (minDays !== null && maxDays !== null && maxDays < minDays) throw new HttpError(422, "Maximum days must not be less than minimum days.");
  return { name: v.text(b.name, "Delivery option name", 2, 60), price: v.int(b.priceMinor, "Price", 0, 1_000_000_000), minDays, maxDays, freeOver: opt(b.freeOverMinor, "Free-delivery amount", 1, 1_000_000_000), active: b.isActive === undefined || v.bool(b.isActive) ? 1 : 0 };
}
export async function createRate(env: Env, req: Request, p: Params): Promise<Response> {
  const user = await guard(env, req, "orders:manage");
  const zoneId = v.id(p.id);
  if (!(await env.DB.prepare("SELECT 1 AS x FROM shipping_zones WHERE id=?1").bind(zoneId).first())) throw new HttpError(404, "Zone not found.");
  const d = parseRate(await readJson(req));
  const id = `rate_${crypto.randomUUID().slice(0, 8)}`;
  await env.DB.prepare("INSERT INTO shipping_rates (id, zone_id, name, price_minor, currency, min_days, max_days, free_over_minor, is_active, sort_order) VALUES (?1,?2,?3,?4,'NGN',?5,?6,?7,?8,(SELECT COALESCE(MAX(sort_order),0)+1 FROM shipping_rates WHERE zone_id=?2))").bind(id, zoneId, d.name, d.price, d.minDays, d.maxDays, d.freeOver, d.active).run();
  await audit(env, { actor: user.id, action: "shipping.rate.create", entity: "rate", entityId: id, ip: ip(req) });
  return json({ id }, 201);
}
export async function updateRate(env: Env, req: Request, p: Params): Promise<Response> {
  const user = await guard(env, req, "orders:manage");
  const d = parseRate(await readJson(req));
  const r = await env.DB.prepare("UPDATE shipping_rates SET name=?2, price_minor=?3, min_days=?4, max_days=?5, free_over_minor=?6, is_active=?7 WHERE id=?1").bind(v.id(p.id), d.name, d.price, d.minDays, d.maxDays, d.freeOver, d.active).run();
  if (!r.meta.changes) throw new HttpError(404, "Delivery option not found.");
  await audit(env, { actor: user.id, action: "shipping.rate.update", entity: "rate", entityId: p.id, ip: ip(req) });
  return json({ ok: true });
}
export async function deleteRate(env: Env, req: Request, p: Params): Promise<Response> {
  const user = await guard(env, req, "orders:manage");
  await env.DB.prepare("DELETE FROM shipping_rates WHERE id=?1").bind(v.id(p.id)).run();
  await audit(env, { actor: user.id, action: "shipping.rate.delete", entity: "rate", entityId: p.id, ip: ip(req) });
  return json({ ok: true });
}

/* ---------------- admin: fulfilment (shipments) ---------------- */

const SHIP_STATUS = ["preparing", "shipped", "delivered", "returned"] as const;
const SHIP_NEXT: Record<string, string[]> = { preparing: ["shipped"], shipped: ["delivered", "returned"], delivered: ["returned"] };
const httpsUrl = (x: unknown) => { if (x === undefined || x === null || x === "") return null; if (typeof x !== "string" || x.length > 300 || !/^https:\/\/[^\s]+$/.test(x.trim())) throw new HttpError(422, "The tracking link must start with https://"); return x.trim(); };

async function orderNote(env: Env, orderId: string, status: string, note: string, actor: string) {
  await env.DB.prepare("INSERT INTO order_events (order_id, from_status, to_status, note, actor_user_id) VALUES (?1,?2,?2,?3,?4)").bind(orderId, status, note, actor).run();
}

export async function createShipment(env: Env, req: Request, p: Params): Promise<Response> {
  const user = await guard(env, req, "orders:manage");
  const orderId = v.id(p.id);
  const o = await env.DB.prepare("SELECT status FROM orders WHERE id=?1").bind(orderId).first<{ status: string }>();
  if (!o) throw new HttpError(404, "Order not found.");
  if (!["paid_verified", "fulfilling", "completed"].includes(o.status)) throw new HttpError(409, "Only a paid order can be shipped.");
  const b = await readJson(req);
  const status = v.oneOf(b.status ?? "preparing", "Status", ["preparing", "shipped"] as const);
  const carrier = v.optText(b.carrier, "Carrier", 60);
  const tracking = v.optText(b.trackingNumber, "Tracking number", 60);
  const id = crypto.randomUUID();
  await env.DB.prepare("INSERT INTO shipments (id, order_id, carrier, tracking_number, tracking_url, status, note, shipped_at, created_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)")
    .bind(id, orderId, carrier, tracking, httpsUrl(b.trackingUrl), status, v.optText(b.note, "Note", 200), status === "shipped" ? now() : null, now()).run();
  if (status === "shipped" && o.status === "paid_verified") await env.DB.batch([
    env.DB.prepare("UPDATE orders SET status='fulfilling', updated_at=?2 WHERE id=?1 AND status='paid_verified'").bind(orderId, now()),
    env.DB.prepare("INSERT INTO order_events (order_id, from_status, to_status, note, actor_user_id) SELECT ?1,'paid_verified','fulfilling',?2,?3 WHERE changes() > 0").bind(orderId, `Shipped${carrier ? ` via ${carrier}` : ""}${tracking ? `: ${tracking}` : ""}`, user.id),
  ]);
  else await orderNote(env, orderId, o.status, `Shipment ${status}${carrier ? ` via ${carrier}` : ""}${tracking ? `: ${tracking}` : ""}`, user.id);
  await audit(env, { actor: user.id, action: "shipment.create", entity: "shipment", entityId: id, ip: ip(req) });
  return json({ id }, 201);
}

export async function updateShipment(env: Env, req: Request, p: Params): Promise<Response> {
  const user = await guard(env, req, "orders:manage");
  const s = await env.DB.prepare("SELECT id, order_id, status, shipped_at FROM shipments WHERE id=?1").bind(v.id(p.id)).first<{ id: string; order_id: string; status: string; shipped_at: number | null }>();
  if (!s) throw new HttpError(404, "Shipment not found.");
  const b = await readJson(req);
  const to = b.status === undefined ? s.status : v.oneOf(b.status, "Status", SHIP_STATUS);
  if (to !== s.status && !(SHIP_NEXT[s.status] ?? []).includes(to)) throw new HttpError(409, `A shipment that is "${s.status}" cannot be moved to "${to}".`);
  if (s.status === "returned") throw new HttpError(409, "This shipment is closed.");
  const carrier = v.optText(b.carrier, "Carrier", 60), tracking = v.optText(b.trackingNumber, "Tracking number", 60);
  await env.DB.prepare(
    `UPDATE shipments SET status=?2, carrier=?3, tracking_number=?4, tracking_url=?5, note=?6,
       shipped_at=CASE WHEN ?2='shipped' AND shipped_at IS NULL THEN ?7 ELSE shipped_at END, delivered_at=CASE WHEN ?2='delivered' THEN ?7 ELSE delivered_at END WHERE id=?1`,
  ).bind(s.id, to, carrier, tracking, httpsUrl(b.trackingUrl), v.optText(b.note, "Note", 200), now()).run();
  const o = await env.DB.prepare("SELECT status FROM orders WHERE id=?1").bind(s.order_id).first<{ status: string }>();
  if (to === "shipped" && o?.status === "paid_verified") await env.DB.batch([
    env.DB.prepare("UPDATE orders SET status='fulfilling', updated_at=?2 WHERE id=?1 AND status='paid_verified'").bind(s.order_id, now()),
    env.DB.prepare("INSERT INTO order_events (order_id, from_status, to_status, note, actor_user_id) SELECT ?1,'paid_verified','fulfilling','Shipped',?2 WHERE changes() > 0").bind(s.order_id, user.id),
  ]);
  else if (to !== s.status && o) await orderNote(env, s.order_id, o.status, `Shipment ${to}`, user.id);
  await audit(env, { actor: user.id, action: "shipment.update", entity: "shipment", entityId: s.id, ip: ip(req), meta: { to } });
  return json({ ok: true });
}
