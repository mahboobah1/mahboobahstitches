import type { Env } from "../types";
import { newToken, refCode, tokenMatches } from "../lib/access";
import { audit } from "../lib/audit";
import { guard, ip } from "../lib/guard";
import { HttpError, assertSameOrigin, clientIp, json, readJson } from "../lib/http";
import { saveImage } from "../lib/media";
import { orderNumber } from "../lib/orders";
import { can } from "../lib/permissions";
import { rateLimit } from "../lib/ratelimit";
import { getSessionUser } from "../lib/session";
import { isDateStr } from "../lib/time";
import * as v from "../lib/validate";

type Params = Record<string, string>;
export const OUTFITS = ["Jilbab", "Abaya", "Dress", "Two-piece set", "Khimar set", "Prayer dress", "Kiddies outfit", "Gift outfit", "Other"] as const;
export const STATUSES = ["submitted", "under_review", "awaiting_information", "quotation_prepared", "awaiting_approval", "approved", "in_production", "completed", "rejected", "cancelled"] as const;
const FINAL = ["completed", "rejected", "cancelled"];
/** What staff may do next. Quotation is only visible to the customer once it is sent (awaiting_approval). */
const NEXT: Record<string, string[]> = {
  submitted: ["under_review", "awaiting_information", "rejected", "cancelled"],
  under_review: ["awaiting_information", "quotation_prepared", "rejected", "cancelled"],
  awaiting_information: ["under_review", "quotation_prepared", "rejected", "cancelled"],
  quotation_prepared: ["awaiting_approval", "under_review", "rejected", "cancelled"],
  awaiting_approval: ["approved", "quotation_prepared", "rejected", "cancelled"],
  approved: ["in_production", "cancelled"],
  in_production: ["completed", "cancelled"],
};
const CUSTOMER_CAN_CANCEL = ["submitted", "under_review", "awaiting_information", "quotation_prepared", "awaiting_approval", "approved"];
const MEASURE_KEYS = ["bust", "waist", "hips", "shoulder", "sleeveLength", "dressLength", "height"] as const;
const now = () => Math.floor(Date.now() / 1000);
const tokenOf = (req: Request) => new URL(req.url).searchParams.get("token");

export function bespokeConfig(): Response {
  return json({ outfits: OUTFITS, measurements: MEASURE_KEYS, maxPhotos: 5 });
}

/** Customer reference photos. Public, so strictly limited; unattached ones are deleted after a day. */
export async function uploadReference(env: Env, req: Request): Promise<Response> {
  assertSameOrigin(req);
  await rateLimit(env, `bespoke-upload:ip:${clientIp(req)}`, 20, 3600);
  const saved = await saveImage(env, await readJson(req, 1_000_000), null);
  return json({ id: saved.id, url: saved.url }, 201);
}

function parseMeasurements(raw: unknown, unit: "cm" | "in"): Record<string, number> {
  if (raw === undefined || raw === null || raw === "") return {};
  if (typeof raw !== "object" || Array.isArray(raw)) throw new HttpError(422, "Measurements are not valid.");
  const [lo, hi] = unit === "cm" ? [5, 260] : [2, 105];
  const out: Record<string, number> = {};
  for (const [k, val] of Object.entries(raw as Record<string, unknown>)) {
    if (val === "" || val === null || val === undefined) continue;
    if (!(MEASURE_KEYS as readonly string[]).includes(k)) throw new HttpError(422, "Unknown measurement.");
    const n = typeof val === "number" ? val : Number(val);
    if (!Number.isFinite(n) || n < lo || n > hi) throw new HttpError(422, `${k} must be between ${lo} and ${hi} ${unit}.`);
    out[k] = Math.round(n * 10) / 10;
  }
  return out;
}

export async function submitBespoke(env: Env, req: Request): Promise<Response> {
  assertSameOrigin(req);
  const addr = clientIp(req);
  await rateLimit(env, `bespoke:ip:${addr}`, 5, 3600);
  const b = await readJson(req, 30_000);
  const unit = v.oneOf(b.unit ?? "cm", "Unit", ["cm", "in"] as const);
  const name = v.text(b.name, "Your name", 2, 80);
  const email = v.email(b.email);
  const phone = v.requiredPhone(b.phone);
  const category = v.oneOf(b.category, "Outfit type", OUTFITS);
  const description = v.text(b.description, "Design description", 10, 2000);
  const measurements = parseMeasurements(b.measurements, unit);
  let deadline: number | null = null;
  if (b.deadline !== undefined && b.deadline !== null && b.deadline !== "") {
    if (!isDateStr(b.deadline)) throw new HttpError(422, "Enter the deadline as a date.");
    deadline = Math.floor(Date.parse(`${b.deadline}T23:59:59Z`) / 1000);
    if (deadline < now()) throw new HttpError(422, "The delivery deadline must be in the future.");
    if (deadline > now() + 2 * 365 * 86400) throw new HttpError(422, "That deadline is too far away.");
  }
  const photoIds = Array.isArray(b.photoIds) ? b.photoIds.map((x) => v.id(x, "Photo")) : [];
  if (photoIds.length > 5) throw new HttpError(422, "You can attach up to 5 reference photos.");
  if (new Set(photoIds).size !== photoIds.length) throw new HttpError(422, "A photo was attached twice.");
  if (photoIds.length) {
    // Only unattached customer uploads may be attached (never staff uploads or another request's photos).
    const marks = photoIds.map((_, i) => `?${i + 1}`).join(",");
    const found = await env.DB.prepare(`SELECT id FROM media WHERE id IN (${marks}) AND created_by IS NULL AND NOT EXISTS (SELECT 1 FROM bespoke_images i WHERE i.url = '/api/media/' || media.id)`).bind(...photoIds).all();
    if (found.results.length !== photoIds.length) throw new HttpError(422, "One of the photos could not be used. Please upload it again.");
  }
  const user = await getSessionUser(env, req);
  const { token, hash } = await newToken();
  for (let attempt = 0; attempt < 5; attempt++) {
    const id = crypto.randomUUID();
    const reference = refCode("BR");
    const stmts = [
      env.DB.prepare(
        `INSERT INTO bespoke_requests (id, reference, user_id, name, email, phone, outfit_category, description, fabric, colour, measurements_json, unit, deadline, notes, status, public_token_hash)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,'submitted',?15)`,
      ).bind(id, reference, user?.id ?? null, name, email, phone, category, description, v.optText(b.fabric, "Preferred fabric", 120), v.optText(b.colour, "Preferred colour", 80), JSON.stringify(measurements), unit, deadline, v.optText(b.notes, "Additional instructions", 1000), hash),
      ...photoIds.map((pid, i) => env.DB.prepare("INSERT INTO bespoke_images (id, request_id, url, sort_order) VALUES (?1,?2,?3,?4)").bind(crypto.randomUUID(), id, `/api/media/${pid}`, i + 1)),
      env.DB.prepare("INSERT INTO bespoke_events (request_id, from_status, to_status, note, actor_user_id) VALUES (?1, NULL, 'submitted', 'Request submitted', ?2)").bind(id, user?.id ?? null),
    ];
    try {
      await env.DB.batch(stmts);
      await audit(env, { actor: user?.id ?? null, action: "bespoke.submitted", entity: "bespoke", entityId: id, ip: addr, meta: { reference } });
      return json({ reference, token }, 201);
    } catch (e) {
      if (String(e).includes("UNIQUE") && String(e).includes("reference")) continue;
      throw e;
    }
  }
  throw new HttpError(500, "Could not save your request. Please try again.");
}

interface Req {
  id: string; reference: string; user_id: string | null; name: string; email: string; phone: string | null; outfit_category: string; description: string; fabric: string | null; colour: string | null;
  measurements_json: string | null; unit: string; deadline: number | null; notes: string | null; status: string; quote_minor: number | null; quote_currency: string | null; quote_note: string | null;
  quote_sent_at: number | null; approved_at: number | null; order_id: string | null; created_at: number; updated_at: number; public_token_hash: string | null;
}

async function authorize(env: Env, req: Request, ref: string): Promise<{ r: Req; staff: boolean }> {
  if (!/^BR-[A-Z0-9]{6}$/.test(ref)) throw new HttpError(404, "Request not found.");
  const r = await env.DB.prepare("SELECT * FROM bespoke_requests WHERE reference=?1").bind(ref).first<Req>();
  if (!r) throw new HttpError(404, "Request not found.");
  const user = await getSessionUser(env, req);
  const staff = !!user && can(user.role, "bespoke:manage");
  if (!(await tokenMatches(tokenOf(req), r.public_token_hash)) && !(user && user.id === r.user_id) && !staff) throw new HttpError(404, "Request not found.");
  return { r, staff };
}

async function details(env: Env, r: Req, forStaff: boolean) {
  const [photos, messages, events, order] = await Promise.all([
    env.DB.prepare("SELECT url FROM bespoke_images WHERE request_id=?1 ORDER BY sort_order").bind(r.id).all<{ url: string }>(),
    env.DB.prepare("SELECT author, body, created_at AS at FROM bespoke_messages WHERE request_id=?1 ORDER BY id").bind(r.id).all(),
    env.DB.prepare("SELECT e.to_status AS status, e.note, e.created_at AS at, u.email AS actorEmail FROM bespoke_events e LEFT JOIN users u ON u.id = e.actor_user_id WHERE e.request_id=?1 ORDER BY e.id").bind(r.id).all<{ status: string; note: string | null; at: number; actorEmail: string | null }>(),
    r.order_id ? env.DB.prepare("SELECT id, order_number AS number, status, total_minor AS totalMinor, currency FROM orders WHERE id=?1").bind(r.order_id).first() : Promise.resolve(null),
  ]);
  const quoteVisible = forStaff || ["awaiting_approval", "approved", "in_production", "completed"].includes(r.status) || (r.quote_sent_at !== null && r.status !== "quotation_prepared");
  return {
    request: {
      reference: r.reference, status: r.status, category: r.outfit_category, description: r.description, fabric: r.fabric, colour: r.colour, unit: r.unit,
      measurements: r.measurements_json ? JSON.parse(r.measurements_json) : {}, deadline: r.deadline, notes: r.notes, createdAt: r.created_at, updatedAt: r.updated_at, approvedAt: r.approved_at,
      customer: { name: r.name, email: r.email, phone: r.phone },
      quote: quoteVisible && r.quote_minor ? { amountMinor: r.quote_minor, currency: r.quote_currency ?? "NGN", note: r.quote_note, sentAt: r.quote_sent_at } : null,
      canApprove: r.status === "awaiting_approval" && !!r.quote_minor, canCancel: CUSTOMER_CAN_CANCEL.includes(r.status),
    },
    photos: photos.results.map((p) => p.url),
    messages: messages.results,
    // Customers see the steps but not staff e-mail addresses.
    timeline: events.results.map((e) => ({ status: e.status, note: e.note, at: e.at, ...(forStaff ? { actorEmail: e.actorEmail } : {}) })),
    order: order ?? null,
  };
}

export async function viewBespoke(env: Env, req: Request, p: Params): Promise<Response> {
  const { r, staff } = await authorize(env, req, p.ref ?? "");
  return json(await details(env, r, staff && !tokenOf(req)));
}

/** The customer writes back (for example answering a question). */
export async function customerMessage(env: Env, req: Request, p: Params): Promise<Response> {
  assertSameOrigin(req);
  await rateLimit(env, `bespoke-msg:ip:${clientIp(req)}`, 20, 3600);
  const { r } = await authorize(env, req, p.ref ?? "");
  if (FINAL.includes(r.status)) throw new HttpError(409, "This request is closed. Please message us on WhatsApp.");
  const body = v.text((await readJson(req)).body, "Your message", 2, 1000);
  const stmts = [env.DB.prepare("INSERT INTO bespoke_messages (request_id, author, body) VALUES (?1,'customer',?2)").bind(r.id, body)];
  if (r.status === "awaiting_information") {
    stmts.push(
      env.DB.prepare("UPDATE bespoke_requests SET status='under_review', updated_at=?2 WHERE id=?1 AND status='awaiting_information'").bind(r.id, now()),
      env.DB.prepare("INSERT INTO bespoke_events (request_id, from_status, to_status, note) SELECT ?1,'awaiting_information','under_review','Customer replied' WHERE changes() > 0").bind(r.id),
    );
  }
  await env.DB.batch(stmts);
  return json({ ok: true }, 201);
}

/** The customer approves or declines the quotation, or cancels the request. */
export async function customerRespond(env: Env, req: Request, p: Params): Promise<Response> {
  assertSameOrigin(req);
  await rateLimit(env, `bespoke-respond:ip:${clientIp(req)}`, 20, 3600);
  const { r } = await authorize(env, req, p.ref ?? "");
  const b = await readJson(req);
  const action = v.oneOf(b.action, "Action", ["approve", "decline", "cancel"] as const);
  const note = v.optText(b.note, "Note", 300);
  let to: string, from: string[], text: string;
  if (action === "approve") { if (!r.quote_minor) throw new HttpError(409, "There is no quotation to approve yet."); to = "approved"; from = ["awaiting_approval"]; text = note ?? "Customer approved the quotation"; }
  else if (action === "decline") { to = "cancelled"; from = ["awaiting_approval"]; text = note ?? "Customer declined the quotation"; }
  else { to = "cancelled"; from = CUSTOMER_CAN_CANCEL; text = note ?? "Customer cancelled the request"; }
  if (!from.includes(r.status)) throw new HttpError(409, action === "cancel" ? "This request can no longer be cancelled here. Please message us on WhatsApp." : "There is nothing to approve or decline right now.");
  const marks = from.map((_, i) => `?${i + 4}`).join(",");
  const [res] = await env.DB.batch([
    env.DB.prepare(`UPDATE bespoke_requests SET status=?2, approved_at=CASE WHEN ?2='approved' THEN ?3 ELSE approved_at END, updated_at=?3 WHERE id=?1 AND status IN (${marks})`).bind(r.id, to, now(), ...from),
    env.DB.prepare("INSERT INTO bespoke_events (request_id, from_status, to_status, note) SELECT ?1,?2,?3,?4 WHERE changes() > 0").bind(r.id, r.status, to, text),
  ]);
  if (!res.meta.changes) throw new HttpError(409, "That request was just updated. Please reload.");
  return json({ status: to });
}

export async function accountBespoke(env: Env, req: Request): Promise<Response> {
  const u = await getSessionUser(env, req);
  if (!u) throw new HttpError(401, "Please sign in.");
  const rows = await env.DB.prepare("SELECT reference, outfit_category AS category, status, created_at AS createdAt FROM bespoke_requests WHERE user_id=?1 ORDER BY created_at DESC, rowid DESC LIMIT 100").bind(u.id).all();
  return json({ requests: rows.results });
}

/* ---------------- admin ---------------- */

export async function adminList(env: Env, req: Request): Promise<Response> {
  await guard(env, req, "bespoke:manage");
  const u = new URL(req.url).searchParams;
  const status = u.get("status") ?? "";
  const q = (u.get("q") ?? "").trim().toLowerCase().slice(0, 60);
  if (status && !(STATUSES as readonly string[]).includes(status)) throw new HttpError(422, "Unknown status.");
  const rows = await env.DB.prepare(
    `SELECT id, reference, name, email, outfit_category AS category, status, deadline, created_at AS createdAt, quote_minor AS quoteMinor
       FROM bespoke_requests WHERE (?1='' OR status=?1) AND (?2='' OR lower(reference) LIKE '%'||?2||'%' OR lower(name) LIKE '%'||?2||'%' OR lower(email) LIKE '%'||?2||'%')
      ORDER BY created_at DESC, rowid DESC LIMIT 200`,
  ).bind(status, q).all();
  return json({ requests: rows.results });
}

async function byId(env: Env, id: string): Promise<Req> {
  const r = await env.DB.prepare("SELECT * FROM bespoke_requests WHERE id=?1").bind(v.id(id)).first<Req>();
  if (!r) throw new HttpError(404, "Request not found.");
  return r;
}

export async function adminGet(env: Env, req: Request, p: Params): Promise<Response> {
  await guard(env, req, "bespoke:manage");
  const r = await byId(env, p.id);
  const d = await details(env, r, true);
  return json({ ...d, id: r.id, allowedNext: NEXT[r.status] ?? [] });
}

export async function adminStatus(env: Env, req: Request, p: Params): Promise<Response> {
  const user = await guard(env, req, "bespoke:manage");
  const r = await byId(env, p.id);
  const b = await readJson(req);
  const to = v.oneOf(b.status, "Status", STATUSES);
  const note = v.optText(b.note, "Note", 300);
  if (!(NEXT[r.status] ?? []).includes(to)) throw new HttpError(409, `A request that is "${r.status}" cannot be moved to "${to}".`);
  if (to === "awaiting_approval" && !r.quote_minor) throw new HttpError(409, "Prepare a quotation before sending it for approval.");
  const [res] = await env.DB.batch([
    env.DB.prepare("UPDATE bespoke_requests SET status=?2, quote_sent_at=CASE WHEN ?2='awaiting_approval' THEN ?4 ELSE quote_sent_at END, approved_at=CASE WHEN ?2='approved' THEN ?4 ELSE approved_at END, updated_at=?4 WHERE id=?1 AND status=?3").bind(r.id, to, r.status, now()),
    env.DB.prepare("INSERT INTO bespoke_events (request_id, from_status, to_status, note, actor_user_id) SELECT ?1,?2,?3,?4,?5 WHERE changes() > 0").bind(r.id, r.status, to, note ?? (to === "approved" ? "Approval recorded by staff" : null), user.id),
  ]);
  if (!res.meta.changes) throw new HttpError(409, "That request was changed by someone else. Reload and try again.");
  await audit(env, { actor: user.id, action: "bespoke.status", entity: "bespoke", entityId: r.id, ip: ip(req), meta: { from: r.status, to } });
  return json({ ok: true });
}

/** Staff writes to the customer, optionally asking for more information. */
export async function adminMessage(env: Env, req: Request, p: Params): Promise<Response> {
  const user = await guard(env, req, "bespoke:manage");
  const r = await byId(env, p.id);
  const b = await readJson(req);
  const body = v.text(b.body, "Message", 2, 1000);
  const ask = v.bool(b.askForInformation);
  if (FINAL.includes(r.status)) throw new HttpError(409, "This request is closed.");
  const stmts = [env.DB.prepare("INSERT INTO bespoke_messages (request_id, author, body, staff_user_id) VALUES (?1,'staff',?2,?3)").bind(r.id, body, user.id)];
  if (ask && ["submitted", "under_review"].includes(r.status)) {
    stmts.push(
      env.DB.prepare("UPDATE bespoke_requests SET status='awaiting_information', updated_at=?2 WHERE id=?1 AND status IN ('submitted','under_review')").bind(r.id, now()),
      env.DB.prepare("INSERT INTO bespoke_events (request_id, from_status, to_status, note, actor_user_id) SELECT ?1,?2,'awaiting_information','Clarification requested',?3 WHERE changes() > 0").bind(r.id, r.status, user.id),
    );
  }
  await env.DB.batch(stmts);
  await audit(env, { actor: user.id, action: "bespoke.message", entity: "bespoke", entityId: r.id, ip: ip(req) });
  return json({ ok: true }, 201);
}

/** Saves the price quoted for the request. It is only shown to the customer after "Send for approval". */
export async function adminQuote(env: Env, req: Request, p: Params): Promise<Response> {
  const user = await guard(env, req, "bespoke:manage");
  const r = await byId(env, p.id);
  if (!["submitted", "under_review", "awaiting_information", "quotation_prepared", "awaiting_approval"].includes(r.status)) throw new HttpError(409, "A quotation can no longer be changed on this request.");
  const b = await readJson(req);
  const amount = v.int(b.amountMinor, "Quotation", 100, 1_000_000_000);
  const note = v.optText(b.note, "Quotation note", 600);
  const to = r.status === "quotation_prepared" ? "quotation_prepared" : "quotation_prepared";
  const [res] = await env.DB.batch([
    env.DB.prepare("UPDATE bespoke_requests SET quote_minor=?2, quote_currency='NGN', quote_note=?3, quote_sent_at=NULL, status=?4, updated_at=?5 WHERE id=?1 AND status=?6").bind(r.id, amount, note, to, now(), r.status),
    env.DB.prepare("INSERT INTO bespoke_events (request_id, from_status, to_status, note, actor_user_id) SELECT ?1,?2,?3,'Quotation prepared',?4 WHERE changes() > 0").bind(r.id, r.status, to, user.id),
  ]);
  if (!res.meta.changes) throw new HttpError(409, "That request was changed by someone else. Reload and try again.");
  await audit(env, { actor: user.id, action: "bespoke.quote", entity: "bespoke", entityId: r.id, ip: ip(req), meta: { amount } });
  return json({ ok: true });
}

/** Turns an approved request into an unpaid order that the customer can pay online. */
export async function adminConvert(env: Env, req: Request, p: Params): Promise<Response> {
  const user = await guard(env, req, "bespoke:manage");
  const r = await byId(env, p.id);
  if (r.status !== "approved") throw new HttpError(409, "Only an approved request can become an order.");
  if (r.order_id) throw new HttpError(409, "This request already has an order.");
  if (!r.quote_minor) throw new HttpError(409, "There is no quotation on this request.");
  const orderId = crypto.randomUUID();
  const num = orderNumber();
  const { hash } = await newToken(); // the customer reaches this order through their request page
  const label = `Bespoke ${r.outfit_category} (${r.reference})`;
  const res = await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO orders (id, order_number, user_id, guest_email, guest_name, phone, status, placed_via, currency, subtotal_minor, discount_minor, shipping_minor, total_minor, notes, public_token_hash)
       VALUES (?1,?2,?3,?4,?5,?6,'unpaid','bespoke',?7,?8,0,0,?8,?9,?10)`,
    ).bind(orderId, num, r.user_id, r.email, r.name, r.phone, r.quote_currency ?? "NGN", r.quote_minor, `From bespoke request ${r.reference}`, hash),
    env.DB.prepare("INSERT INTO order_items (id, order_id, variant_id, product_name, variant_sku, size, colour, unit_price_minor, qty, line_total_minor, currency) VALUES (?1,?2,NULL,?3,?4,'','',?5,1,?5,?6)").bind(crypto.randomUUID(), orderId, label, `BESPOKE-${r.reference}`, r.quote_minor, r.quote_currency ?? "NGN"),
    env.DB.prepare("INSERT INTO order_events (order_id, from_status, to_status, note, actor_user_id) VALUES (?1, NULL, 'unpaid', ?2, ?3)").bind(orderId, `Created from bespoke request ${r.reference}`, user.id),
    env.DB.prepare("UPDATE bespoke_requests SET order_id=?2, updated_at=?3 WHERE id=?1 AND order_id IS NULL").bind(r.id, orderId, now()),
  ]);
  if (!res[3].meta.changes) {
    await env.DB.prepare("DELETE FROM orders WHERE id=?1").bind(orderId).run(); // someone converted it at the same moment
    throw new HttpError(409, "This request already has an order.");
  }
  await env.DB.prepare("INSERT INTO bespoke_events (request_id, from_status, to_status, note, actor_user_id) VALUES (?1,'approved','approved',?2,?3)").bind(r.id, `Order ${num} created for payment`, user.id).run();
  await audit(env, { actor: user.id, action: "bespoke.convert", entity: "bespoke", entityId: r.id, ip: ip(req), meta: { order: num } });
  return json({ orderNumber: num, orderId }, 201);
}

/** Staff can give the customer a fresh private link (the old one stops working). Shown once, never stored. */
export async function adminNewLink(env: Env, req: Request, p: Params): Promise<Response> {
  const user = await guard(env, req, "bespoke:manage");
  const r = await byId(env, p.id);
  const { token, hash } = await newToken();
  await env.DB.prepare("UPDATE bespoke_requests SET public_token_hash=?2 WHERE id=?1").bind(r.id, hash).run();
  await audit(env, { actor: user.id, action: "bespoke.new_link", entity: "bespoke", entityId: r.id, ip: ip(req) });
  return json({ path: `/bespoke/request/${r.reference}?token=${token}` });
}
