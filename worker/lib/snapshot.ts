import type { Env } from "../types";

/**
 * The public catalogue is pre-built into one settings row. A shop visit then costs one
 * database read instead of hundreds (D1's free plan counts every row scanned).
 * Rebuilt after every admin change to products, variants, stock, images or collections.
 */
const KEY = "catalogue_snapshot";

interface PRow { id: string; slug: string; name: string; description: string | null; product_type: string; is_new: number; is_bestseller: number; fulfilment_info: string | null; shipping_info: string | null; collection_slug: string; collection_name: string; subcategory: string | null }
interface VRow { id: string; product_id: string; sku: string; size: string; colour: string; price_minor: number; currency: string; track_stock: number | null; on_hand: number | null; reserved: number | null; allow_backorder: number | null }

export async function buildCatalogue(env: Env): Promise<string> {
  const [cols, cats, prods, vars, imgs, ratings] = await Promise.all([
    env.DB.prepare("SELECT id, slug, name, blurb, image_url FROM collections WHERE is_active = 1 ORDER BY sort_order, name").all<{ id: string; slug: string; name: string; blurb: string | null; image_url: string | null }>(),
    env.DB.prepare("SELECT c.slug AS collection_slug, cat.slug, cat.name FROM categories cat JOIN collections c ON c.id = cat.collection_id WHERE c.is_active = 1 ORDER BY cat.sort_order, cat.name").all<{ collection_slug: string; slug: string; name: string }>(),
    env.DB.prepare(
      `SELECT p.id, p.slug, p.name, p.description, p.product_type, p.is_new, p.is_bestseller, p.fulfilment_info, p.shipping_info,
              c.slug AS collection_slug, c.name AS collection_name, cat.name AS subcategory
         FROM products p JOIN collections c ON c.id = p.collection_id AND c.is_active = 1
         LEFT JOIN categories cat ON cat.id = p.category_id
        WHERE p.status = 'active' ORDER BY p.created_at DESC, p.rowid DESC`,
    ).all<PRow>(),
    env.DB.prepare(
      `SELECT v.id, v.product_id, v.sku, v.size, v.colour, v.price_minor, v.currency, i.track_stock, i.on_hand, i.reserved, i.allow_backorder
         FROM product_variants v JOIN products p ON p.id = v.product_id AND p.status = 'active'
         LEFT JOIN inventory i ON i.variant_id = v.id WHERE v.is_active = 1 ORDER BY v.rowid`,
    ).all<VRow>(),
    env.DB.prepare(
      `SELECT i.product_id, i.url, i.alt_text FROM product_images i JOIN products p ON p.id = i.product_id AND p.status = 'active'
        ORDER BY i.product_id, i.sort_order, i.rowid`,
    ).all<{ product_id: string; url: string; alt_text: string }>(),
    env.DB.prepare("SELECT product_id, COUNT(*) AS c, AVG(rating) AS a FROM reviews WHERE status='approved' GROUP BY product_id").all<{ product_id: string; c: number; a: number }>(),
  ]);
  const ratingBy = new Map(ratings.results.map((r) => [r.product_id, { count: r.c, average: Math.round(r.a * 10) / 10 }]));

  const variantsBy = new Map<string, unknown[]>();
  for (const v of vars.results) {
    // Available = tracking is off, backorder is allowed, or free stock remains. No inventory row = unavailable.
    const available = v.track_stock === null ? false : v.track_stock === 0 || v.allow_backorder === 1 || (v.on_hand ?? 0) - (v.reserved ?? 0) > 0;
    const list = variantsBy.get(v.product_id) ?? [];
    list.push({ id: v.id, sku: v.sku, size: v.size, colour: v.colour, priceMinor: v.price_minor, currency: v.currency, available });
    variantsBy.set(v.product_id, list);
  }
  const imagesBy = new Map<string, unknown[]>();
  for (const im of imgs.results) {
    const list = imagesBy.get(im.product_id) ?? [];
    list.push({ url: im.url, alt: im.alt_text });
    imagesBy.set(im.product_id, list);
  }

  const products = prods.results
      .map((p) => ({
        id: p.id, slug: p.slug, name: p.name, description: p.description ?? "", collectionSlug: p.collection_slug,
        collectionName: p.collection_name, subcategory: p.subcategory ?? "", type: p.product_type,
        isNew: p.is_new === 1, isBestseller: p.is_bestseller === 1, fulfilmentInfo: p.fulfilment_info ?? "",
        shippingInfo: p.shipping_info ?? "", images: imagesBy.get(p.id) ?? [], variants: variantsBy.get(p.id) ?? [], rating: ratingBy.get(p.id) ?? null,
      }))
      .filter((p) => p.variants.length > 0);

  return JSON.stringify({
    generatedAt: Math.floor(Date.now() / 1000),
    collections: cols.results.map((c) => ({
      slug: c.slug, name: c.name, blurb: c.blurb ?? "", imageUrl: c.image_url ?? "",
      // The website only lists collections that have at least one live product.
      productCount: products.filter((p) => p.collectionSlug === c.slug).length,
      subcategories: cats.results.filter((x) => x.collection_slug === c.slug).map((x) => x.name),
    })),
    products,
  });
}

export async function rebuildSnapshot(env: Env): Promise<void> {
  const value = await buildCatalogue(env);
  await env.DB.prepare(
    "INSERT INTO settings (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = ?2, updated_at = CAST(strftime('%s','now') AS INTEGER)",
  ).bind(KEY, value).run();
}

export async function readSnapshot(env: Env): Promise<string> {
  const row = await env.DB.prepare("SELECT value FROM settings WHERE key = ?1").bind(KEY).first<{ value: string }>();
  if (row) return row.value;
  await rebuildSnapshot(env);
  return buildCatalogue(env);
}
