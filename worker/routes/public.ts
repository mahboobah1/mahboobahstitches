import type { Env } from "../types";
import { HttpError, json } from "../lib/http";
import { readSnapshot } from "../lib/snapshot";
import { SLUG_RE } from "../lib/validate";

type Params = Record<string, string>;

export async function catalogue(env: Env): Promise<Response> {
  const body = await readSnapshot(env);
  return new Response(body, { headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=30" } });
}

const SITE_FIELDS = ["whatsappNumber", "phone", "email", "instagram", "tiktok", "facebook", "address", "openingHours", "announcement", "demoMode", "heroImage", "bespokeImage"] as const;

export async function siteSettings(env: Env): Promise<Response> {
  const rows = await env.DB.prepare("SELECT key, value FROM settings WHERE key LIKE 'site.%'").all<{ key: string; value: string }>();
  const out: Record<string, string | boolean> = {};
  for (const f of SITE_FIELDS) out[f] = f === "demoMode" ? false : "";
  for (const r of rows.results) {
    const k = r.key.slice(5);
    if ((SITE_FIELDS as readonly string[]).includes(k)) out[k] = k === "demoMode" ? r.value === "1" : r.value;
  }
  return json(out, 200, { "cache-control": "public, max-age=30" });
}

export async function media(env: Env, _req: Request, p: Params): Promise<Response> {
  if (!/^[0-9a-f-]{36}$/.test(p.id ?? "")) throw new HttpError(404, "Not found.");
  const row = await env.DB.prepare("SELECT mime, data_b64 FROM media WHERE id=?1").bind(p.id).first<{ mime: string; data_b64: string }>();
  if (!row) throw new HttpError(404, "Not found.");
  const bin = atob(row.data_b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Response(bytes, {
    headers: { "content-type": row.mime, "cache-control": "public, max-age=31536000, immutable", "x-content-type-options": "nosniff" },
  });
}

export async function publicPage(env: Env, _req: Request, p: Params): Promise<Response> {
  if (!SLUG_RE.test(p.slug ?? "")) throw new HttpError(404, "Not found.");
  const row = await env.DB.prepare("SELECT slug, kind, title, body, published_at AS publishedAt FROM content_pages WHERE slug=?1 AND is_published=1").bind(p.slug).first();
  if (!row) throw new HttpError(404, "Not found.");
  return json({ page: row }, 200, { "cache-control": "public, max-age=30" });
}

export async function journalList(env: Env): Promise<Response> {
  const rows = await env.DB.prepare(
    "SELECT slug, title, substr(body,1,220) AS excerpt, published_at AS publishedAt FROM content_pages WHERE kind='journal' AND is_published=1 ORDER BY published_at DESC LIMIT 50",
  ).all();
  return json({ posts: rows.results }, 200, { "cache-control": "public, max-age=30" });
}
