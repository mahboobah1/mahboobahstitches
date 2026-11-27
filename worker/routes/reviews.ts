import type { Env } from "../types";
import { audit } from "../lib/audit";
import { guard, ip } from "../lib/guard";
import { HttpError, assertSameOrigin, clientIp, json, readJson } from "../lib/http";
import { rateLimit } from "../lib/ratelimit";
import { getSessionUser } from "../lib/session";
import { rebuildSnapshot } from "../lib/snapshot";
import * as v from "../lib/validate";

type Params = Record<string, string>;
const PAID = "('paid_verified','fulfilling','completed')";
const author = (name: string) => { const p = name.trim().split(/\s+/); return p.length > 1 ? `${p[0]} ${p[p.length - 1][0]}.` : p[0]; };

const bought = (env: Env, userId: string, productId: string) =>
  env.DB.prepare(`SELECT 1 AS x FROM orders o JOIN order_items i ON i.order_id=o.id JOIN product_variants v ON v.id=i.variant_id WHERE o.user_id=?1 AND o.status IN ${PAID} AND v.product_id=?2 LIMIT 1`).bind(userId, productId).first();

export async function productReviews(env: Env, req: Request, p: Params): Promise<Response> {
  const prod = await env.DB.prepare("SELECT id FROM products WHERE slug=?1 AND status='active'").bind(p.slug ?? "").first<{ id: string }>();
  if (!prod) throw new HttpError(404, "Product not found.");
  const rows = await env.DB.prepare("SELECT r.rating, r.title, r.body, r.created_at AS at, u.full_name AS name FROM reviews r JOIN users u ON u.id=r.user_id WHERE r.product_id=?1 AND r.status='approved' ORDER BY r.created_at DESC LIMIT 50").bind(prod.id).all<{ rating: number; title: string | null; body: string | null; at: number; name: string }>();
  const count = rows.results.length;
  const user = await getSessionUser(env, req);
  let canReview = false, mine: string | null = null;
  if (user) {
    const m = await env.DB.prepare("SELECT status FROM reviews WHERE product_id=?1 AND user_id=?2").bind(prod.id, user.id).first<{ status: string }>();
    mine = m?.status ?? null;
    canReview = !m && !!(await bought(env, user.id, prod.id));
  }
  return json({
    summary: { count, average: count ? Math.round((rows.results.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10 : null },
    reviews: rows.results.map((r) => ({ rating: r.rating, title: r.title, body: r.body, at: r.at, author: author(r.name), verified: true })),
    canReview, mine,
  });
}

export async function submitReview(env: Env, req: Request): Promise<Response> {
  assertSameOrigin(req);
  await rateLimit(env, `review:ip:${clientIp(req)}`, 10, 3600);
  const user = await getSessionUser(env, req);
  if (!user) throw new HttpError(401, "Please sign in to write a review.");
  const b = await readJson(req);
  const prod = await env.DB.prepare("SELECT id FROM products WHERE slug=?1 AND status='active'").bind(typeof b.productSlug === "string" ? b.productSlug : "").first<{ id: string }>();
  if (!prod) throw new HttpError(404, "Product not found.");
  const rating = v.int(b.rating, "Rating", 1, 5);
  const title = v.optText(b.title, "Title", 80);
  const body = v.text(b.body, "Your review", 10, 1000);
  if (!(await bought(env, user.id, prod.id))) throw new HttpError(403, "Only customers who bought this product can review it.");
  try {
    await env.DB.prepare("INSERT INTO reviews (id, product_id, user_id, rating, title, body, status) VALUES (?1,?2,?3,?4,?5,?6,'pending')").bind(crypto.randomUUID(), prod.id, user.id, rating, title, body).run();
  } catch (e) {
    if (String(e).includes("UNIQUE")) throw new HttpError(409, "You have already reviewed this product.");
    throw e;
  }
  await audit(env, { actor: user.id, action: "review.submitted", entity: "product", entityId: prod.id, ip: clientIp(req) });
  return json({ ok: true, status: "pending" }, 201);
}

/** A few genuine, approved reviews for the homepage. Empty until real customers write some. */
export async function featuredReviews(env: Env): Promise<Response> {
  const rows = await env.DB.prepare("SELECT r.rating, r.title, r.body, u.full_name AS name, p.name AS product FROM reviews r JOIN users u ON u.id=r.user_id JOIN products p ON p.id=r.product_id WHERE r.status='approved' AND r.rating >= 4 AND p.status='active' ORDER BY r.created_at DESC LIMIT 6").all<{ rating: number; title: string | null; body: string; name: string; product: string }>();
  return json({ reviews: rows.results.map((r) => ({ rating: r.rating, title: r.title, body: r.body, author: author(r.name), product: r.product })) }, 200, { "cache-control": "public, max-age=60" });
}

export async function adminReviews(env: Env, req: Request): Promise<Response> {
  await guard(env, req, "reviews:manage");
  const status = new URL(req.url).searchParams.get("status") ?? "";
  if (status && !["pending", "approved", "rejected"].includes(status)) throw new HttpError(422, "Unknown status.");
  const rows = await env.DB.prepare("SELECT r.id, r.rating, r.title, r.body, r.status, r.created_at AS createdAt, u.full_name AS customer, u.email, p.name AS product FROM reviews r JOIN users u ON u.id=r.user_id JOIN products p ON p.id=r.product_id WHERE (?1='' OR r.status=?1) ORDER BY (r.status='pending') DESC, r.created_at DESC LIMIT 200").bind(status).all();
  return json({ reviews: rows.results });
}

export async function moderateReview(env: Env, req: Request, p: Params): Promise<Response> {
  const user = await guard(env, req, "reviews:manage");
  const status = v.oneOf((await readJson(req)).status, "Status", ["pending", "approved", "rejected"] as const);
  const r = await env.DB.prepare("UPDATE reviews SET status=?2 WHERE id=?1").bind(v.id(p.id), status).run();
  if (!r.meta.changes) throw new HttpError(404, "Review not found.");
  await rebuildSnapshot(env); // star ratings on the shop update
  await audit(env, { actor: user.id, action: "review.moderate", entity: "review", entityId: p.id, ip: ip(req), meta: { status } });
  return json({ ok: true });
}
