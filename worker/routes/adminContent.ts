import type { Env } from "../types";
import { audit } from "../lib/audit";
import { guard, ip } from "../lib/guard";
import { HttpError, json, readJson } from "../lib/http";
import type { Role } from "../lib/permissions";
import * as v from "../lib/validate";

type Params = Record<string, string>;
const KINDS = ["page", "journal", "faq", "policy"] as const;
const ROLES: readonly Role[] = ["CUSTOMER", "OWNER", "MANAGER", "INVENTORY_MANAGER", "CONTENT_MANAGER"];

/* ---------------- pages (the CMS) ---------------- */

export async function listPages(env: Env, req: Request): Promise<Response> {
  await guard(env, req, "content:write");
  const rows = await env.DB.prepare("SELECT id, slug, kind, title, is_published AS isPublished, updated_at AS updatedAt FROM content_pages ORDER BY kind, title").all();
  return json({ pages: rows.results });
}

export async function getPage(env: Env, req: Request, p: Params): Promise<Response> {
  await guard(env, req, "content:write");
  const row = await env.DB.prepare("SELECT id, slug, kind, title, body, is_published AS isPublished FROM content_pages WHERE id=?1").bind(v.id(p.id)).first();
  if (!row) throw new HttpError(404, "Page not found.");
  return json({ page: row });
}

function parsePage(b: Record<string, unknown>) {
  const title = v.text(b.title, "Title", 2, 120);
  const body = typeof b.body === "string" ? b.body : "";
  if (body.length > 30_000) throw new HttpError(422, "That text is too long.");
  return { title, slug: v.slug(b.slug, title), kind: v.oneOf(b.kind, "Type", KINDS), body, published: v.bool(b.isPublished) ? 1 : 0 };
}

export async function createPage(env: Env, req: Request): Promise<Response> {
  const user = await guard(env, req, "content:write");
  const d = parsePage(await readJson(req, 40_000));
  const id = crypto.randomUUID();
  try {
    await env.DB.prepare(
      "INSERT INTO content_pages (id, slug, kind, title, body, is_published, published_at) VALUES (?1,?2,?3,?4,?5,?6, CASE WHEN ?6=1 THEN CAST(strftime('%s','now') AS INTEGER) END)",
    ).bind(id, d.slug, d.kind, d.title, d.body, d.published).run();
  } catch (e) {
    if (String(e).includes("UNIQUE")) throw new HttpError(409, "That web address is already used by another page.");
    throw e;
  }
  await audit(env, { actor: user.id, action: "page.create", entity: "page", entityId: id, ip: ip(req), meta: { slug: d.slug } });
  return json({ id }, 201);
}

export async function updatePage(env: Env, req: Request, p: Params): Promise<Response> {
  const user = await guard(env, req, "content:write");
  const id = v.id(p.id);
  const d = parsePage(await readJson(req, 40_000));
  let res;
  try {
    res = await env.DB.prepare(
      `UPDATE content_pages SET slug=?2, kind=?3, title=?4, body=?5, is_published=?6,
         published_at = CASE WHEN ?6=1 AND published_at IS NULL THEN CAST(strftime('%s','now') AS INTEGER) ELSE published_at END,
         updated_at = CAST(strftime('%s','now') AS INTEGER) WHERE id=?1`,
    ).bind(id, d.slug, d.kind, d.title, d.body, d.published).run();
  } catch (e) {
    if (String(e).includes("UNIQUE")) throw new HttpError(409, "That web address is already used by another page.");
    throw e;
  }
  if (!res.meta.changes) throw new HttpError(404, "Page not found.");
  await audit(env, { actor: user.id, action: "page.update", entity: "page", entityId: id, ip: ip(req), meta: { published: d.published } });
  return json({ ok: true });
}

export async function deletePage(env: Env, req: Request, p: Params): Promise<Response> {
  const user = await guard(env, req, "content:write");
  const id = v.id(p.id);
  await env.DB.prepare("DELETE FROM content_pages WHERE id=?1").bind(id).run();
  await audit(env, { actor: user.id, action: "page.delete", entity: "page", entityId: id, ip: ip(req) });
  return json({ ok: true });
}

/* ---------------- business settings ---------------- */

const SETTING_KEYS = ["whatsappNumber", "phone", "email", "instagram", "tiktok", "facebook", "address", "openingHours", "announcement", "demoMode", "heroImage", "bespokeImage"] as const;

export async function getSettings(env: Env, req: Request): Promise<Response> {
  await guard(env, req, "settings:write");
  const rows = await env.DB.prepare("SELECT key, value FROM settings WHERE key LIKE 'site.%'").all<{ key: string; value: string }>();
  const out: Record<string, string | boolean> = {};
  for (const k of SETTING_KEYS) out[k] = k === "demoMode" ? false : "";
  for (const r of rows.results) {
    const k = r.key.slice(5);
    if ((SETTING_KEYS as readonly string[]).includes(k)) out[k] = k === "demoMode" ? r.value === "1" : r.value;
  }
  return json({ settings: out });
}

const httpsUrl = (val: unknown, label: string): string => {
  const s = typeof val === "string" ? val.trim() : "";
  if (!s) return "";
  if (s.length > 200 || !/^https:\/\/[^\s]+$/.test(s)) throw new HttpError(422, `${label} must be a full link starting with https://`);
  return s;
};

export async function saveSettings(env: Env, req: Request): Promise<Response> {
  const user = await guard(env, req, "settings:write");
  const b = await readJson(req);
  const wa = typeof b.whatsappNumber === "string" ? b.whatsappNumber.replace(/[^0-9]/g, "") : "";
  if (wa && (wa.length < 8 || wa.length > 15)) throw new HttpError(422, "WhatsApp number: use digits with the country code, e.g. 2348012345678.");
  const emailVal = typeof b.email === "string" && b.email.trim() ? v.email(b.email) : "";
  const values: Record<string, string> = {
    whatsappNumber: wa,
    phone: v.optionalPhone(b.phone) ?? "",
    email: emailVal,
    instagram: httpsUrl(b.instagram, "Instagram"),
    tiktok: httpsUrl(b.tiktok, "TikTok"),
    facebook: httpsUrl(b.facebook, "Facebook"),
    address: v.optText(b.address, "Address", 200) ?? "",
    openingHours: v.optText(b.openingHours, "Opening hours", 120) ?? "",
    announcement: v.optText(b.announcement, "Announcement", 160) ?? "",
    demoMode: v.bool(b.demoMode) ? "1" : "0",
    heroImage: v.imagePath(b.heroImage, "Homepage picture") ?? "",
    bespokeImage: v.imagePath(b.bespokeImage, "Bespoke picture") ?? "",
  };
  await env.DB.batch(
    SETTING_KEYS.map((k) =>
      env.DB.prepare("INSERT INTO settings (key, value, updated_by) VALUES (?1,?2,?3) ON CONFLICT(key) DO UPDATE SET value=?2, updated_by=?3, updated_at=CAST(strftime('%s','now') AS INTEGER)").bind(`site.${k}`, values[k], user.id),
    ),
  );
  await audit(env, { actor: user.id, action: "settings.update", entity: "settings", ip: ip(req) });
  return json({ ok: true });
}

/* ---------------- staff ---------------- */

export async function listStaff(env: Env, req: Request): Promise<Response> {
  await guard(env, req, "staff:manage");
  const rows = await env.DB.prepare(
    "SELECT id, email, full_name AS fullName, role, is_active AS isActive, created_at AS createdAt FROM users ORDER BY (role='CUSTOMER'), created_at DESC LIMIT 300",
  ).all();
  return json({ users: rows.results });
}

export async function updateUser(env: Env, req: Request, p: Params): Promise<Response> {
  const owner = await guard(env, req, "staff:manage");
  const id = v.id(p.id);
  if (id === owner.id) throw new HttpError(422, "You cannot change your own role or access.");
  const b = await readJson(req);
  const role = v.oneOf(b.role, "Role", ROLES);
  const active = v.bool(b.isActive) ? 1 : 0;
  const res = await env.DB.prepare("UPDATE users SET role=?2, is_active=?3, updated_at=CAST(strftime('%s','now') AS INTEGER) WHERE id=?1").bind(id, role, active).run();
  if (!res.meta.changes) throw new HttpError(404, "User not found.");
  if (!active || role === "CUSTOMER") await env.DB.prepare("DELETE FROM sessions WHERE user_id=?1").bind(id).run();
  await audit(env, { actor: owner.id, action: "user.update", entity: "user", entityId: id, ip: ip(req), meta: { role, active } });
  return json({ ok: true });
}
