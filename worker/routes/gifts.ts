import type { Env } from "../types";
import { audit } from "../lib/audit";
import { guard, ip } from "../lib/guard";
import { HttpError, json, readJson } from "../lib/http";
import * as v from "../lib/validate";

type Params = Record<string, string>;
interface VRow { id: string; size: string; colour: string; price_minor: number; is_active: number; name: string; status: string; track_stock: number | null; on_hand: number | null; reserved: number | null; allow_backorder: number | null; image: string | null }

const variantInfo = async (env: Env, ids: string[]) => {
  const map = new Map<string, VRow>();
  if (ids.length === 0) return map;
  const marks = ids.map((_, i) => `?${i + 1}`).join(",");
  const rows = await env.DB.prepare(
    `SELECT v.id, v.size, v.colour, v.price_minor, v.is_active, p.name, p.status, i.track_stock, i.on_hand, i.reserved, i.allow_backorder,
            (SELECT url FROM product_images x WHERE x.product_id = p.id ORDER BY x.sort_order, x.rowid LIMIT 1) AS image
       FROM product_variants v JOIN products p ON p.id = v.product_id LEFT JOIN inventory i ON i.variant_id = v.id WHERE v.id IN (${marks})`,
  ).bind(...ids).all<VRow>();
  for (const r of rows.results) map.set(r.id, r);
  return map;
};
/** Free units of a product (null = not counted, so always available). */
const free = (r: VRow): number | null => (r.track_stock === 1 && r.allow_backorder !== 1 ? (r.on_hand ?? 0) - (r.reserved ?? 0) : null);
const sellable = (r: VRow | undefined): r is VRow => !!r && r.is_active === 1 && r.status === "active" && r.track_stock !== null;
const optionView = (r: VRow, qty = 1) => ({ variantId: r.id, name: r.name, size: r.size, colour: r.colour, priceMinor: r.price_minor, imageUrl: r.image, qty, available: sellable(r) && (free(r) === null || (free(r) as number) >= qty), onRequest: r.price_minor === 0 });

/** The Gift Studio catalogue. Availability and prices come live from the component products. */
export async function publicGifts(env: Env): Promise<Response> {
  const [bundles, items, slots, opts, pack] = await Promise.all([
    env.DB.prepare("SELECT id, slug, name, description, kind, image_url, discount_percent FROM gift_bundles WHERE is_active=1 ORDER BY sort_order, rowid").all<{ id: string; slug: string; name: string; description: string | null; kind: string; image_url: string | null; discount_percent: number }>(),
    env.DB.prepare("SELECT bundle_id, variant_id, qty FROM gift_bundle_items ORDER BY rowid").all<{ bundle_id: string; variant_id: string; qty: number }>(),
    env.DB.prepare("SELECT id, bundle_id, label FROM gift_slots ORDER BY sort_order, rowid").all<{ id: string; bundle_id: string; label: string }>(),
    env.DB.prepare("SELECT slot_id, variant_id FROM gift_slot_options ORDER BY rowid").all<{ slot_id: string; variant_id: string }>(),
    env.DB.prepare("SELECT id, name, description, price_minor FROM gift_packaging WHERE is_active=1 ORDER BY sort_order, rowid").all<{ id: string; name: string; description: string | null; price_minor: number }>(),
  ]);
  const info = await variantInfo(env, [...new Set([...items.results.map((i) => i.variant_id), ...opts.results.map((o) => o.variant_id)])]);
  const out = bundles.results.map((b) => {
    if (b.kind === "fixed") {
      const comps = items.results.filter((i) => i.bundle_id === b.id).map((i) => { const r = info.get(i.variant_id); return r ? optionView(r, i.qty) : null; }).filter((x): x is NonNullable<typeof x> => x !== null);
      const total = comps.reduce((s, c) => s + c.priceMinor * c.qty, 0);
      const saving = Math.floor((total * b.discount_percent) / 100);
      const ready = comps.length > 0 && comps.every((c) => c.available && !c.onRequest);
      return { id: b.id, slug: b.slug, name: b.name, description: b.description, kind: b.kind, imageUrl: b.image_url ?? comps[0]?.imageUrl ?? null, discountPercent: b.discount_percent, items: comps, priceMinor: total - saving, savingMinor: saving, available: ready };
    }
    const sl = slots.results.filter((s) => s.bundle_id === b.id).map((s) => ({ id: s.id, label: s.label, options: opts.results.filter((o) => o.slot_id === s.id).map((o) => info.get(o.variant_id)).filter((r): r is VRow => !!r).map((r) => optionView(r)).filter((o) => o.available && !o.onRequest) }));
    const ready = sl.length > 0 && sl.every((s) => s.options.length > 0);
    const from = ready ? sl.reduce((t, s) => t + Math.min(...s.options.map((o) => o.priceMinor)), 0) : 0;
    return { id: b.id, slug: b.slug, name: b.name, description: b.description, kind: b.kind, imageUrl: b.image_url ?? sl[0]?.options[0]?.imageUrl ?? null, discountPercent: b.discount_percent, slots: sl, fromMinor: from, available: ready };
  });
  return json({ bundles: out, packaging: pack.results.map((p) => ({ id: p.id, name: p.name, description: p.description, priceMinor: p.price_minor })) }, 200, { "cache-control": "public, max-age=30" });
}

/* ---------------- admin ---------------- */

export async function adminGifts(env: Env, req: Request): Promise<Response> {
  await guard(env, req, "products:write");
  const [bundles, items, slots, opts, pack] = await Promise.all([
    env.DB.prepare("SELECT id, slug, name, description, kind, image_url AS imageUrl, discount_percent AS discountPercent, is_active AS isActive, sort_order AS sortOrder FROM gift_bundles ORDER BY sort_order, rowid").all(),
    env.DB.prepare("SELECT bundle_id AS bundleId, variant_id AS variantId, qty FROM gift_bundle_items ORDER BY rowid").all<{ bundleId: string; variantId: string; qty: number }>(),
    env.DB.prepare("SELECT id, bundle_id AS bundleId, label FROM gift_slots ORDER BY sort_order, rowid").all<{ id: string; bundleId: string; label: string }>(),
    env.DB.prepare("SELECT slot_id AS slotId, variant_id AS variantId FROM gift_slot_options ORDER BY rowid").all<{ slotId: string; variantId: string }>(),
    env.DB.prepare("SELECT id, name, description, price_minor AS priceMinor, is_active AS isActive, sort_order AS sortOrder FROM gift_packaging ORDER BY sort_order, rowid").all(),
  ]);
  const info = await variantInfo(env, [...new Set([...items.results.map((i) => i.variantId), ...opts.results.map((o) => o.variantId)])]);
  const label = (id: string) => { const r = info.get(id); return r ? `${r.name}${[r.size, r.colour].filter(Boolean).length ? ` (${[r.size, r.colour].filter(Boolean).join(", ")})` : ""}` : id; };
  return json({
    bundles: (bundles.results as Record<string, unknown>[]).map((b) => ({
      ...b,
      items: items.results.filter((i) => i.bundleId === b.id).map((i) => ({ variantId: i.variantId, qty: i.qty, label: label(i.variantId) })),
      slots: slots.results.filter((s) => s.bundleId === b.id).map((s) => ({ id: s.id, label: s.label, variantIds: opts.results.filter((o) => o.slotId === s.id).map((o) => o.variantId), options: opts.results.filter((o) => o.slotId === s.id).map((o) => ({ variantId: o.variantId, label: label(o.variantId) })) })),
    })),
    packaging: pack.results,
  });
}

function parseBundle(b: Record<string, unknown>) {
  const name = v.text(b.name, "Name", 2, 80);
  return { name, slug: v.slug(b.slug, name), description: v.optText(b.description, "Description", 600), kind: v.oneOf(b.kind, "Type", ["fixed", "configurable"] as const), image: v.imagePath(b.imageUrl, "Picture"), discount: v.int(b.discountPercent ?? 0, "Discount", 0, 50), active: v.bool(b.isActive) ? 1 : 0, order: v.int(b.sortOrder ?? 0, "Order", 0, 1000) };
}
const dup = (e: unknown) => { if (String(e).includes("UNIQUE")) throw new HttpError(409, "That web address is already used by another gift."); throw e; };

export async function createBundle(env: Env, req: Request): Promise<Response> {
  const user = await guard(env, req, "products:write");
  const d = parseBundle(await readJson(req));
  const id = `gift_${crypto.randomUUID().slice(0, 8)}`;
  try { await env.DB.prepare("INSERT INTO gift_bundles (id, slug, name, description, kind, image_url, discount_percent, is_active, sort_order) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)").bind(id, d.slug, d.name, d.description, d.kind, d.image, d.discount, d.active, d.order).run(); } catch (e) { dup(e); }
  await audit(env, { actor: user.id, action: "gift.create", entity: "gift", entityId: id, ip: ip(req) });
  return json({ id }, 201);
}
export async function updateBundle(env: Env, req: Request, p: Params): Promise<Response> {
  const user = await guard(env, req, "products:write");
  const d = parseBundle(await readJson(req));
  let r;
  try { r = await env.DB.prepare("UPDATE gift_bundles SET slug=?2, name=?3, description=?4, kind=?5, image_url=?6, discount_percent=?7, is_active=?8, sort_order=?9 WHERE id=?1").bind(v.id(p.id), d.slug, d.name, d.description, d.kind, d.image, d.discount, d.active, d.order).run(); } catch (e) { return dup(e) as never; }
  if (!r.meta.changes) throw new HttpError(404, "Gift not found.");
  await audit(env, { actor: user.id, action: "gift.update", entity: "gift", entityId: p.id, ip: ip(req) });
  return json({ ok: true });
}
const needVariants = async (env: Env, ids: string[]) => {
  const info = await variantInfo(env, ids);
  if (ids.some((i) => !info.has(i))) throw new HttpError(422, "One of the chosen products does not exist.");
};
export async function setItems(env: Env, req: Request, p: Params): Promise<Response> {
  const user = await guard(env, req, "products:write");
  const id = v.id(p.id);
  const b = await env.DB.prepare("SELECT kind FROM gift_bundles WHERE id=?1").bind(id).first<{ kind: string }>();
  if (!b) throw new HttpError(404, "Gift not found.");
  if (b.kind !== "fixed") throw new HttpError(409, "Only a fixed gift has a set list of products.");
  const body = await readJson(req);
  if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > 20) throw new HttpError(422, "Add 1 to 20 products.");
  const items = body.items.map((x) => ({ variantId: v.id((x as Record<string, unknown>).variantId, "Product"), qty: v.int((x as Record<string, unknown>).qty ?? 1, "Quantity", 1, 10) }));
  if (new Set(items.map((i) => i.variantId)).size !== items.length) throw new HttpError(422, "A product is listed twice.");
  await needVariants(env, items.map((i) => i.variantId));
  await env.DB.batch([env.DB.prepare("DELETE FROM gift_bundle_items WHERE bundle_id=?1").bind(id), ...items.map((i) => env.DB.prepare("INSERT INTO gift_bundle_items (bundle_id, variant_id, qty) VALUES (?1,?2,?3)").bind(id, i.variantId, i.qty))]);
  await audit(env, { actor: user.id, action: "gift.items", entity: "gift", entityId: id, ip: ip(req) });
  return json({ ok: true });
}
export async function setSlots(env: Env, req: Request, p: Params): Promise<Response> {
  const user = await guard(env, req, "products:write");
  const id = v.id(p.id);
  const b = await env.DB.prepare("SELECT kind FROM gift_bundles WHERE id=?1").bind(id).first<{ kind: string }>();
  if (!b) throw new HttpError(404, "Gift not found.");
  if (b.kind !== "configurable") throw new HttpError(409, "Only a build-your-own gift has choices.");
  const body = await readJson(req, 40_000);
  if (!Array.isArray(body.slots) || body.slots.length === 0 || body.slots.length > 6) throw new HttpError(422, "Add 1 to 6 choices (for example: prayer dress, prayer mat).");
  const slots = body.slots.map((s, n) => {
    const o = s as Record<string, unknown>;
    const ids = Array.isArray(o.variantIds) ? o.variantIds.map((x) => v.id(x, "Product")) : [];
    if (ids.length === 0 || ids.length > 40) throw new HttpError(422, "Each choice needs 1 to 40 products to pick from.");
    return { id: `slot_${crypto.randomUUID().slice(0, 8)}`, label: v.text(o.label, "Choice name", 2, 60), order: n, ids: [...new Set(ids)] };
  });
  await needVariants(env, slots.flatMap((s) => s.ids));
  await env.DB.batch([
    env.DB.prepare("DELETE FROM gift_slots WHERE bundle_id=?1").bind(id),
    ...slots.flatMap((s) => [env.DB.prepare("INSERT INTO gift_slots (id, bundle_id, label, sort_order) VALUES (?1,?2,?3,?4)").bind(s.id, id, s.label, s.order), ...s.ids.map((vid) => env.DB.prepare("INSERT INTO gift_slot_options (slot_id, variant_id) VALUES (?1,?2)").bind(s.id, vid))]),
  ]);
  await audit(env, { actor: user.id, action: "gift.slots", entity: "gift", entityId: id, ip: ip(req) });
  return json({ ok: true });
}
function parsePack(b: Record<string, unknown>) {
  return { name: v.text(b.name, "Name", 2, 60), description: v.optText(b.description, "Description", 200), price: v.int(b.priceMinor ?? 0, "Price", 0, 100_000_000), active: b.isActive === undefined || v.bool(b.isActive) ? 1 : 0 };
}
export async function createPackaging(env: Env, req: Request): Promise<Response> {
  const user = await guard(env, req, "products:write");
  const d = parsePack(await readJson(req));
  const id = `pack_${crypto.randomUUID().slice(0, 8)}`;
  await env.DB.prepare("INSERT INTO gift_packaging (id, name, description, price_minor, is_active, sort_order) VALUES (?1,?2,?3,?4,?5,(SELECT COALESCE(MAX(sort_order),0)+1 FROM gift_packaging))").bind(id, d.name, d.description, d.price, d.active).run();
  await audit(env, { actor: user.id, action: "packaging.create", entity: "packaging", entityId: id, ip: ip(req) });
  return json({ id }, 201);
}
export async function updatePackaging(env: Env, req: Request, p: Params): Promise<Response> {
  const user = await guard(env, req, "products:write");
  const d = parsePack(await readJson(req));
  const r = await env.DB.prepare("UPDATE gift_packaging SET name=?2, description=?3, price_minor=?4, is_active=?5 WHERE id=?1").bind(v.id(p.id), d.name, d.description, d.price, d.active).run();
  if (!r.meta.changes) throw new HttpError(404, "Packaging not found.");
  await audit(env, { actor: user.id, action: "packaging.update", entity: "packaging", entityId: p.id, ip: ip(req) });
  return json({ ok: true });
}
