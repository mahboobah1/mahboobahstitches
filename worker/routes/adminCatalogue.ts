import type { Env } from "../types";
import { audit } from "../lib/audit";
import { guard, ip } from "../lib/guard";
import { HttpError, json, readJson } from "../lib/http";
import { rebuildSnapshot } from "../lib/snapshot";
import * as v from "../lib/validate";

const TYPES = ["ready_to_wear", "made_to_order", "pre_order", "custom"] as const;
const STATUSES = ["draft", "active", "archived"] as const;
const MOVE_REASONS = ["restock", "sale", "return", "adjustment"] as const;
type Params = Record<string, string>;

const uniqueGuard = async <T>(fn: () => Promise<T>, msg: string): Promise<T> => {
  try {
    return await fn();
  } catch (e) {
    if (String(e).includes("UNIQUE")) throw new HttpError(409, msg);
    if (String(e).includes("FOREIGN KEY")) throw new HttpError(409, "That is still in use, so it cannot be removed.");
    throw e;
  }
};

/* ---------------- collections and categories ---------------- */

export async function listCollections(env: Env, req: Request): Promise<Response> {
  await guard(env, req, "products:write");
  const [cols, cats] = await Promise.all([
    env.DB.prepare("SELECT id, slug, name, blurb, sort_order AS sortOrder, is_active AS isActive FROM collections ORDER BY sort_order, name").all(),
    env.DB.prepare("SELECT id, collection_id AS collectionId, slug, name, sort_order AS sortOrder FROM categories ORDER BY sort_order, name").all(),
  ]);
  return json({ collections: cols.results, categories: cats.results });
}

export async function createCollection(env: Env, req: Request): Promise<Response> {
  const user = await guard(env, req, "products:write");
  const b = await readJson(req);
  const name = v.text(b.name, "Name", 2, 80);
  const slug = v.slug(b.slug, name);
  const id = `col_${crypto.randomUUID().slice(0, 8)}`;
  await uniqueGuard(
    () => env.DB.prepare("INSERT INTO collections (id, slug, name, blurb, sort_order) VALUES (?1,?2,?3,?4,(SELECT COALESCE(MAX(sort_order),0)+1 FROM collections))").bind(id, slug, name, v.optText(b.blurb, "Description", 300)).run(),
    "That web address is already used.",
  );
  await audit(env, { actor: user.id, action: "collection.create", entity: "collection", entityId: id, ip: ip(req) });
  await rebuildSnapshot(env);
  return json({ id }, 201);
}

export async function updateCollection(env: Env, req: Request, p: Params): Promise<Response> {
  const user = await guard(env, req, "products:write");
  const b = await readJson(req);
  const id = v.id(p.id);
  const res = await env.DB.prepare("UPDATE collections SET name=?2, blurb=?3, sort_order=?4, is_active=?5 WHERE id=?1")
    .bind(id, v.text(b.name, "Name", 2, 80), v.optText(b.blurb, "Description", 300), v.int(b.sortOrder, "Order", 0, 1000), v.bool(b.isActive) ? 1 : 0).run();
  if (!res.meta.changes) throw new HttpError(404, "Collection not found.");
  await audit(env, { actor: user.id, action: "collection.update", entity: "collection", entityId: id, ip: ip(req) });
  await rebuildSnapshot(env);
  return json({ ok: true });
}

export async function createCategory(env: Env, req: Request): Promise<Response> {
  const user = await guard(env, req, "products:write");
  const b = await readJson(req);
  const name = v.text(b.name, "Name", 2, 80);
  const collectionId = v.id(b.collectionId, "Collection");
  const id = `cat_${crypto.randomUUID().slice(0, 8)}`;
  await uniqueGuard(
    () => env.DB.prepare("INSERT INTO categories (id, collection_id, slug, name, sort_order) VALUES (?1,?2,?3,?4,(SELECT COALESCE(MAX(sort_order),0)+1 FROM categories WHERE collection_id=?2))").bind(id, collectionId, v.slug(b.slug, name), name).run(),
    "That name or web address is already used in this collection.",
  );
  await audit(env, { actor: user.id, action: "category.create", entity: "category", entityId: id, ip: ip(req) });
  await rebuildSnapshot(env);
  return json({ id }, 201);
}

export async function updateCategory(env: Env, req: Request, p: Params): Promise<Response> {
  const user = await guard(env, req, "products:write");
  const b = await readJson(req);
  const id = v.id(p.id);
  const res = await env.DB.prepare("UPDATE categories SET name=?2, sort_order=?3 WHERE id=?1").bind(id, v.text(b.name, "Name", 2, 80), v.int(b.sortOrder, "Order", 0, 1000)).run();
  if (!res.meta.changes) throw new HttpError(404, "Category not found.");
  await audit(env, { actor: user.id, action: "category.update", entity: "category", entityId: id, ip: ip(req) });
  await rebuildSnapshot(env);
  return json({ ok: true });
}

export async function deleteCategory(env: Env, req: Request, p: Params): Promise<Response> {
  const user = await guard(env, req, "products:write");
  const id = v.id(p.id);
  await uniqueGuard(() => env.DB.prepare("DELETE FROM categories WHERE id=?1").bind(id).run(), "");
  await audit(env, { actor: user.id, action: "category.delete", entity: "category", entityId: id, ip: ip(req) });
  await rebuildSnapshot(env);
  return json({ ok: true });
}

/* ---------------- products ---------------- */

export async function listProducts(env: Env, req: Request): Promise<Response> {
  await guard(env, req, "products:write");
  const q = new URL(req.url).searchParams.get("q")?.trim().toLowerCase().slice(0, 60) ?? "";
  const rows = await env.DB.prepare(
    `SELECT p.id, p.slug, p.name, p.status, p.product_type AS type, c.name AS collectionName,
            (SELECT COUNT(*) FROM product_variants x WHERE x.product_id = p.id) AS variantCount,
            (SELECT COUNT(*) FROM product_images i WHERE i.product_id = p.id) AS imageCount
       FROM products p JOIN collections c ON c.id = p.collection_id
      WHERE (?1 = '' OR lower(p.name) LIKE '%' || ?1 || '%') ORDER BY p.created_at DESC, p.rowid DESC LIMIT 200`,
  ).bind(q).all();
  return json({ products: rows.results });
}

async function parseProduct(env: Env, b: Record<string, unknown>) {
  const name = v.text(b.name, "Product name", 2, 120);
  const collectionId = v.id(b.collectionId, "Collection");
  const categoryId = b.categoryId ? v.id(b.categoryId, "Category") : null;
  const col = await env.DB.prepare("SELECT id FROM collections WHERE id=?1").bind(collectionId).first();
  if (!col) throw new HttpError(422, "Choose a collection.");
  if (categoryId) {
    const cat = await env.DB.prepare("SELECT id FROM categories WHERE id=?1 AND collection_id=?2").bind(categoryId, collectionId).first();
    if (!cat) throw new HttpError(422, "That category does not belong to the chosen collection.");
  }
  return {
    name, slug: v.slug(b.slug, name), collectionId, categoryId,
    description: v.optText(b.description, "Description", 4000),
    type: v.oneOf(b.type, "Product type", TYPES),
    status: v.oneOf(b.status, "Status", STATUSES),
    isNew: v.bool(b.isNew) ? 1 : 0, isBestseller: v.bool(b.isBestseller) ? 1 : 0,
    fulfilmentInfo: v.optText(b.fulfilmentInfo, "Production information", 1000),
    shippingInfo: v.optText(b.shippingInfo, "Shipping information", 1000),
  };
}

export async function createProduct(env: Env, req: Request): Promise<Response> {
  const user = await guard(env, req, "products:write");
  const d = await parseProduct(env, await readJson(req));
  const id = crypto.randomUUID();
  await uniqueGuard(
    () => env.DB.prepare(
      `INSERT INTO products (id, slug, name, description, collection_id, category_id, product_type, status, is_new, is_bestseller, fulfilment_info, shipping_info)
       VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12)`,
    ).bind(id, d.slug, d.name, d.description, d.collectionId, d.categoryId, d.type, d.status, d.isNew, d.isBestseller, d.fulfilmentInfo, d.shippingInfo).run(),
    "That web address is already used by another product.",
  );
  await audit(env, { actor: user.id, action: "product.create", entity: "product", entityId: id, ip: ip(req), meta: { name: d.name } });
  await rebuildSnapshot(env);
  return json({ id }, 201);
}

export async function getProduct(env: Env, req: Request, p: Params): Promise<Response> {
  await guard(env, req, "products:write");
  const id = v.id(p.id);
  const product = await env.DB.prepare(
    `SELECT id, slug, name, description, collection_id AS collectionId, category_id AS categoryId, product_type AS type, status,
            is_new AS isNew, is_bestseller AS isBestseller, fulfilment_info AS fulfilmentInfo, shipping_info AS shippingInfo FROM products WHERE id=?1`,
  ).bind(id).first();
  if (!product) throw new HttpError(404, "Product not found.");
  const [variants, images] = await Promise.all([
    env.DB.prepare(
      `SELECT v.id, v.sku, v.size, v.colour, v.price_minor AS priceMinor, v.currency, v.is_active AS isActive,
              COALESCE(i.track_stock,1) AS trackStock, COALESCE(i.on_hand,0) AS onHand, COALESCE(i.reserved,0) AS reserved, COALESCE(i.allow_backorder,0) AS allowBackorder
         FROM product_variants v LEFT JOIN inventory i ON i.variant_id = v.id WHERE v.product_id=?1 ORDER BY v.rowid`,
    ).bind(id).all(),
    env.DB.prepare("SELECT id, url, alt_text AS alt, sort_order AS sortOrder FROM product_images WHERE product_id=?1 ORDER BY sort_order, rowid").bind(id).all(),
  ]);
  return json({ product, variants: variants.results, images: images.results });
}

export async function updateProduct(env: Env, req: Request, p: Params): Promise<Response> {
  const user = await guard(env, req, "products:write");
  const id = v.id(p.id);
  const d = await parseProduct(env, await readJson(req));
  const res = await uniqueGuard(
    () => env.DB.prepare(
      `UPDATE products SET slug=?2, name=?3, description=?4, collection_id=?5, category_id=?6, product_type=?7, status=?8,
              is_new=?9, is_bestseller=?10, fulfilment_info=?11, shipping_info=?12, updated_at=CAST(strftime('%s','now') AS INTEGER) WHERE id=?1`,
    ).bind(id, d.slug, d.name, d.description, d.collectionId, d.categoryId, d.type, d.status, d.isNew, d.isBestseller, d.fulfilmentInfo, d.shippingInfo).run(),
    "That web address is already used by another product.",
  );
  if (!res.meta.changes) throw new HttpError(404, "Product not found.");
  await audit(env, { actor: user.id, action: "product.update", entity: "product", entityId: id, ip: ip(req), meta: { status: d.status } });
  await rebuildSnapshot(env);
  return json({ ok: true });
}

/* ---------------- variants and stock ---------------- */

const SKU_RE = /^[A-Za-z0-9._-]{2,40}$/;

export async function createVariant(env: Env, req: Request, p: Params): Promise<Response> {
  const user = await guard(env, req, "products:write");
  const productId = v.id(p.id);
  const b = await readJson(req);
  const sku = typeof b.sku === "string" ? b.sku.trim().toUpperCase() : "";
  if (!SKU_RE.test(sku)) throw new HttpError(422, "SKU must be 2 to 40 letters, numbers, dots or hyphens.");
  const size = v.optText(b.size, "Size", 40) ?? "";
  const colour = v.optText(b.colour, "Colour", 40) ?? "";
  const price = v.int(b.priceMinor, "Price", 0, 1_000_000_000);
  const track = v.bool(b.trackStock) ? 1 : 0;
  const onHand = v.int(b.onHand ?? 0, "Stock", 0, 100_000);
  if (!(await env.DB.prepare("SELECT 1 AS x FROM products WHERE id=?1").bind(productId).first())) throw new HttpError(404, "Product not found.");
  const id = crypto.randomUUID();
  await uniqueGuard(
    () => env.DB.batch([
      env.DB.prepare("INSERT INTO product_variants (id, product_id, sku, size, colour, price_minor) VALUES (?1,?2,?3,?4,?5,?6)").bind(id, productId, sku, size, colour, price),
      env.DB.prepare("INSERT INTO inventory (variant_id, track_stock, on_hand, allow_backorder) VALUES (?1,?2,?3,?4)").bind(id, track, onHand, v.bool(b.allowBackorder) ? 1 : 0),
      env.DB.prepare("INSERT INTO inventory_movements (variant_id, delta, reason, note, actor_user_id) SELECT ?1, ?2, 'restock', 'Opening stock', ?3 WHERE ?2 > 0").bind(id, onHand, user.id),
    ]),
    "That SKU, or that size and colour combination, already exists.",
  );
  await audit(env, { actor: user.id, action: "variant.create", entity: "variant", entityId: id, ip: ip(req), meta: { sku } });
  await rebuildSnapshot(env);
  return json({ id }, 201);
}

export async function updateVariant(env: Env, req: Request, p: Params): Promise<Response> {
  const user = await guard(env, req, "products:write");
  const id = v.id(p.id);
  const b = await readJson(req);
  const sku = typeof b.sku === "string" ? b.sku.trim().toUpperCase() : "";
  if (!SKU_RE.test(sku)) throw new HttpError(422, "SKU must be 2 to 40 letters, numbers, dots or hyphens.");
  const [res] = await uniqueGuard(
    () => env.DB.batch([
      env.DB.prepare("UPDATE product_variants SET sku=?2, size=?3, colour=?4, price_minor=?5, is_active=?6 WHERE id=?1")
        .bind(id, sku, v.optText(b.size, "Size", 40) ?? "", v.optText(b.colour, "Colour", 40) ?? "", v.int(b.priceMinor, "Price", 0, 1_000_000_000), v.bool(b.isActive) ? 1 : 0),
      env.DB.prepare("UPDATE inventory SET track_stock=?2, allow_backorder=?3, updated_at=CAST(strftime('%s','now') AS INTEGER) WHERE variant_id=?1")
        .bind(id, v.bool(b.trackStock) ? 1 : 0, v.bool(b.allowBackorder) ? 1 : 0),
    ]),
    "That SKU, or that size and colour combination, already exists.",
  );
  if (!res.meta.changes) throw new HttpError(404, "Variant not found.");
  await audit(env, { actor: user.id, action: "variant.update", entity: "variant", entityId: id, ip: ip(req) });
  await rebuildSnapshot(env);
  return json({ ok: true });
}

/** Add or remove stock ("mode":"add"), or set the counted total ("mode":"set"). Every change is logged. */
export async function adjustStock(env: Env, req: Request, p: Params): Promise<Response> {
  const user = await guard(env, req, "inventory:write", "products:write");
  const id = v.id(p.id);
  const b = await readJson(req);
  const mode = v.oneOf(b.mode, "Mode", ["add", "set"] as const);
  const reason = v.oneOf(b.reason ?? "adjustment", "Reason", MOVE_REASONS);
  const note = v.optText(b.note, "Note", 200);
  const cur = await env.DB.prepare("SELECT on_hand AS onHand, reserved FROM inventory WHERE variant_id=?1").bind(id).first<{ onHand: number; reserved: number }>();
  if (!cur) throw new HttpError(404, "Stock record not found.");
  const delta = mode === "add" ? v.int(b.qty, "Quantity", -100_000, 100_000) : v.int(b.qty, "Counted stock", 0, 100_000) - cur.onHand;
  if (delta === 0) return json({ onHand: cur.onHand, unchanged: true });
  const next = cur.onHand + delta;
  if (next < 0) throw new HttpError(422, "That would take stock below zero.");
  if (next < cur.reserved) throw new HttpError(422, `${cur.reserved} are held for customers at checkout, so stock cannot go below that.`);
  // Guarded by the value we read: if stock changed meanwhile, nothing is written. The movement row is only
  // inserted when the update really happened (changes() counts the previous statement).
  const [upd] = await env.DB.batch([
    env.DB.prepare("UPDATE inventory SET on_hand=?2, updated_at=CAST(strftime('%s','now') AS INTEGER) WHERE variant_id=?1 AND on_hand=?3").bind(id, next, cur.onHand),
    env.DB.prepare("INSERT INTO inventory_movements (variant_id, delta, reason, note, actor_user_id) SELECT ?1, ?2, ?3, ?4, ?5 WHERE changes() > 0").bind(id, delta, reason, note, user.id),
  ]);
  if (!upd.meta.changes) throw new HttpError(409, "Stock changed while you were editing. Reload and try again.");
  await audit(env, { actor: user.id, action: "stock.adjust", entity: "variant", entityId: id, ip: ip(req), meta: { delta, reason } });
  await rebuildSnapshot(env);
  return json({ onHand: next });
}

export async function listInventory(env: Env, req: Request): Promise<Response> {
  await guard(env, req, "inventory:write", "products:write");
  const rows = await env.DB.prepare(
    `SELECT v.id, v.sku, v.size, v.colour, v.is_active AS isActive, p.name AS productName, p.id AS productId,
            i.track_stock AS trackStock, i.on_hand AS onHand, i.reserved, i.allow_backorder AS allowBackorder
       FROM product_variants v JOIN products p ON p.id = v.product_id JOIN inventory i ON i.variant_id = v.id
      WHERE p.status <> 'archived' ORDER BY p.name, v.rowid LIMIT 500`,
  ).all();
  return json({ items: rows.results });
}

export async function movements(env: Env, req: Request, p: Params): Promise<Response> {
  await guard(env, req, "inventory:write", "products:write");
  const rows = await env.DB.prepare(
    `SELECT m.id, m.delta, m.reason, m.note, m.created_at AS createdAt, u.email AS actorEmail
       FROM inventory_movements m LEFT JOIN users u ON u.id = m.actor_user_id WHERE m.variant_id=?1 ORDER BY m.id DESC LIMIT 50`,
  ).bind(v.id(p.id)).all();
  return json({ movements: rows.results });
}

/* ---------------- images ---------------- */

export async function uploadMedia(env: Env, req: Request): Promise<Response> {
  const user = await guard(env, req, "products:write", "content:write");
  const b = await readJson(req, 1_000_000);
  const mime = v.oneOf(b.mime, "Image type", ["image/jpeg", "image/png", "image/webp"] as const);
  const data = typeof b.dataBase64 === "string" ? b.dataBase64 : "";
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(data) || data.length < 100) throw new HttpError(422, "That image could not be read.");
  const bytes = Math.floor((data.length * 3) / 4) - (data.endsWith("==") ? 2 : data.endsWith("=") ? 1 : 0);
  if (bytes > 600_000) throw new HttpError(413, "That image is too large (limit about 600 KB).");
  // Check the file's real signature, not just what the browser claims.
  const head = atob(data.slice(0, 24));
  const okSig = mime === "image/jpeg" ? head.startsWith("\xff\xd8\xff") : mime === "image/png" ? head.startsWith("\x89PNG") : head.startsWith("RIFF") && head.slice(8, 12) === "WEBP";
  if (!okSig) throw new HttpError(422, "That file is not a valid image.");
  const id = crypto.randomUUID();
  await env.DB.prepare("INSERT INTO media (id, mime, bytes, data_b64, created_by) VALUES (?1,?2,?3,?4,?5)").bind(id, mime, bytes, data, user.id).run();
  await audit(env, { actor: user.id, action: "media.upload", entity: "media", entityId: id, ip: ip(req), meta: { bytes } });
  return json({ id, url: `/api/media/${id}` }, 201);
}

export async function addImage(env: Env, req: Request, p: Params): Promise<Response> {
  const user = await guard(env, req, "products:write");
  const productId = v.id(p.id);
  const b = await readJson(req);
  const mediaId = v.id(b.mediaId, "Image");
  if (!(await env.DB.prepare("SELECT 1 AS x FROM media WHERE id=?1").bind(mediaId).first())) throw new HttpError(404, "Upload the image first.");
  const id = crypto.randomUUID();
  await env.DB.prepare(
    "INSERT INTO product_images (id, product_id, url, alt_text, sort_order) VALUES (?1,?2,?3,?4,(SELECT COALESCE(MAX(sort_order),0)+1 FROM product_images WHERE product_id=?2))",
  ).bind(id, productId, `/api/media/${mediaId}`, v.text(b.alt, "Image description", 3, 160)).run();
  await audit(env, { actor: user.id, action: "image.add", entity: "product", entityId: productId, ip: ip(req) });
  await rebuildSnapshot(env);
  return json({ id }, 201);
}

export async function updateImage(env: Env, req: Request, p: Params): Promise<Response> {
  const user = await guard(env, req, "products:write");
  const b = await readJson(req);
  const res = await env.DB.prepare("UPDATE product_images SET alt_text=?2 WHERE id=?1").bind(v.id(p.id), v.text(b.alt, "Image description", 3, 160)).run();
  if (!res.meta.changes) throw new HttpError(404, "Image not found.");
  await audit(env, { actor: user.id, action: "image.update", entity: "image", entityId: p.id, ip: ip(req) });
  await rebuildSnapshot(env);
  return json({ ok: true });
}

export async function deleteImage(env: Env, req: Request, p: Params): Promise<Response> {
  const user = await guard(env, req, "products:write");
  const id = v.id(p.id);
  const row = await env.DB.prepare("SELECT url FROM product_images WHERE id=?1").bind(id).first<{ url: string }>();
  if (!row) throw new HttpError(404, "Image not found.");
  await env.DB.prepare("DELETE FROM product_images WHERE id=?1").bind(id).run();
  const mediaId = row.url.replace("/api/media/", "");
  // Remove the stored file too, unless another product image still uses it.
  await env.DB.prepare("DELETE FROM media WHERE id=?1 AND NOT EXISTS (SELECT 1 FROM product_images WHERE url=?2)").bind(mediaId, row.url).run();
  await audit(env, { actor: user.id, action: "image.delete", entity: "image", entityId: id, ip: ip(req) });
  await rebuildSnapshot(env);
  return json({ ok: true });
}

export async function reorderImages(env: Env, req: Request, p: Params): Promise<Response> {
  const user = await guard(env, req, "products:write");
  const productId = v.id(p.id);
  const b = await readJson(req);
  if (!Array.isArray(b.ids) || b.ids.length > 30) throw new HttpError(422, "Invalid order.");
  const ids = b.ids.map((x) => v.id(x, "Image"));
  await env.DB.batch(ids.map((imgId, i) => env.DB.prepare("UPDATE product_images SET sort_order=?3 WHERE id=?1 AND product_id=?2").bind(imgId, productId, i + 1)));
  await audit(env, { actor: user.id, action: "image.reorder", entity: "product", entityId: productId, ip: ip(req) });
  await rebuildSnapshot(env);
  return json({ ok: true });
}
