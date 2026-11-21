import type { Env } from "../types";
import { newToken, refCode, tokenMatches } from "../lib/access";
import { audit } from "../lib/audit";
import { guard, ip } from "../lib/guard";
import { HttpError, assertSameOrigin, clientIp, json, readJson } from "../lib/http";
import { can } from "../lib/permissions";
import { rateLimit } from "../lib/ratelimit";
import { getSessionUser } from "../lib/session";
import { addDays, fromEpoch, getBookingSettings, isDateStr, slotsForRange, type BookingSettings } from "../lib/time";
import * as v from "../lib/validate";

type Params = Record<string, string>;
const now = () => Math.floor(Date.now() / 1000);
const tokenOf = (req: Request) => new URL(req.url).searchParams.get("token");
const LIVE = ["requested", "confirmed"];
const STATUSES = ["requested", "confirmed", "cancelled", "completed", "no_show"] as const;
const NEXT: Record<string, string[]> = { requested: ["confirmed", "cancelled"], confirmed: ["completed", "no_show", "cancelled"] };

interface TypeRow { id: string; name: string; duration_minutes: number; description: string | null; is_active: number }
async function getType(env: Env, id: unknown): Promise<TypeRow> {
  const t = await env.DB.prepare("SELECT id, name, duration_minutes, description, is_active FROM booking_types WHERE id=?1").bind(v.id(id, "Appointment type")).first<TypeRow>();
  if (!t || t.is_active !== 1) throw new HttpError(422, "That appointment type is not available.");
  return t;
}

/** The requested start must be exactly one of the currently free slots (inside opening hours, not closed, not taken). */
async function assertFreeSlot(env: Env, minutes: number, startsAt: number, s: BookingSettings, ignoreId?: string): Promise<void> {
  const { date } = fromEpoch(startsAt, s.tzOffsetMinutes);
  const day = await slotsForRange(env, minutes, date, date, s, now(), ignoreId);
  if (!(day[date] ?? []).some((x) => x.startsAt === startsAt)) throw new HttpError(409, "That time is not available. Please choose another.");
}

export async function bookingConfig(env: Env): Promise<Response> {
  const [types, rules, s] = await Promise.all([
    env.DB.prepare("SELECT id, name, duration_minutes AS durationMinutes, description FROM booking_types WHERE is_active=1 ORDER BY sort_order, rowid").all(),
    env.DB.prepare("SELECT COUNT(*) AS n FROM availability_rules").first<{ n: number }>(),
    getBookingSettings(env),
  ]);
  return json({ types: types.results, hasAvailability: (rules?.n ?? 0) > 0, minNoticeHours: s.minNoticeHours, maxDaysAhead: s.maxDaysAhead, cancelHours: s.cancelHours, autoConfirm: s.autoConfirm, tzOffsetMinutes: s.tzOffsetMinutes });
}

export async function bookingDays(env: Env, req: Request): Promise<Response> {
  await rateLimit(env, `slots:ip:${clientIp(req)}`, 120, 600);
  const u = new URL(req.url).searchParams;
  const month = u.get("month") ?? "";
  if (!/^\d{4}-\d{2}$/.test(month) || !isDateStr(`${month}-01`)) throw new HttpError(422, "Choose a month.");
  const t = await getType(env, u.get("type"));
  const s = await getBookingSettings(env);
  const from = `${month}-01`;
  let to = from;
  for (let i = 0; i < 31; i++) { const nx = addDays(to, 1); if (nx.slice(0, 7) !== month) break; to = nx; }
  const range = await slotsForRange(env, t.duration_minutes, from, to, s);
  return json({ days: Object.fromEntries(Object.entries(range).filter(([, sl]) => sl.length > 0).map(([d, sl]) => [d, sl.length])) });
}

export async function bookingSlots(env: Env, req: Request): Promise<Response> {
  await rateLimit(env, `slots:ip:${clientIp(req)}`, 120, 600);
  const u = new URL(req.url).searchParams;
  const date = u.get("date");
  if (!isDateStr(date)) throw new HttpError(422, "Choose a date.");
  const t = await getType(env, u.get("type"));
  const s = await getBookingSettings(env);
  const day = await slotsForRange(env, t.duration_minutes, date, date, s);
  return json({ date, slots: day[date] ?? [] });
}

export async function createBooking(env: Env, req: Request): Promise<Response> {
  assertSameOrigin(req);
  const addr = clientIp(req);
  await rateLimit(env, `book:ip:${addr}`, 8, 3600);
  const b = await readJson(req);
  const t = await getType(env, b.typeId);
  const name = v.text(b.name, "Your name", 2, 80);
  const email = v.email(b.email);
  const phone = v.requiredPhone(b.phone);
  const notes = v.optText(b.notes, "Notes", 500);
  const startsAt = v.int(b.startsAt, "Time", 1, 4_102_444_800);
  const s = await getBookingSettings(env);
  await assertFreeSlot(env, t.duration_minutes, startsAt, s);
  const endsAt = startsAt + t.duration_minutes * 60;
  const user = await getSessionUser(env, req);
  const { token, hash } = await newToken();
  const status = s.autoConfirm ? "confirmed" : "requested";
  for (let attempt = 0; attempt < 5; attempt++) {
    const id = crypto.randomUUID();
    const reference = refCode("BK");
    try {
      // One statement checks for a clash AND inserts, so two people cannot both take the same time.
      const [ins] = await env.DB.batch([
        env.DB.prepare(
          `INSERT INTO bookings (id, reference, booking_type_id, user_id, name, email, phone, starts_at, ends_at, status, notes, public_token_hash)
           SELECT ?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12
            WHERE NOT EXISTS (SELECT 1 FROM bookings WHERE status IN ('requested','confirmed') AND starts_at < ?9 AND ends_at > ?8)`,
        ).bind(id, reference, t.id, user?.id ?? null, name, email, phone, startsAt, endsAt, status, notes, hash),
        env.DB.prepare("INSERT INTO booking_events (booking_id, from_status, to_status, note, actor_user_id) SELECT ?1, NULL, ?2, 'Booked on the website', ?3 WHERE changes() > 0").bind(id, status, user?.id ?? null),
      ]);
      if (!ins.meta.changes) throw new HttpError(409, "Sorry, that time was just taken. Please choose another.");
      await audit(env, { actor: user?.id ?? null, action: "booking.created", entity: "booking", entityId: id, ip: addr, meta: { reference } });
      return json({ reference, token, status }, 201);
    } catch (e) {
      if (String(e).includes("UNIQUE") && String(e).includes("reference")) continue;
      if (String(e).includes("UNIQUE")) throw new HttpError(409, "Sorry, that time was just taken. Please choose another.");
      throw e;
    }
  }
  throw new HttpError(500, "Could not save your booking. Please try again.");
}

interface Bk {
  id: string; reference: string; booking_type_id: string; user_id: string | null; name: string; email: string; phone: string | null; starts_at: number; ends_at: number;
  status: string; notes: string | null; public_token_hash: string | null; cancel_reason: string | null; type_name: string; duration_minutes: number;
}
async function authorize(env: Env, req: Request, ref: string): Promise<{ b: Bk; staff: boolean }> {
  if (!/^BK-[A-Z0-9]{6}$/.test(ref)) throw new HttpError(404, "Booking not found.");
  const b = await env.DB.prepare("SELECT b.*, t.name AS type_name, t.duration_minutes FROM bookings b JOIN booking_types t ON t.id = b.booking_type_id WHERE b.reference=?1").bind(ref).first<Bk>();
  if (!b) throw new HttpError(404, "Booking not found.");
  const user = await getSessionUser(env, req);
  const staff = !!user && can(user.role, "bookings:manage");
  if (!(await tokenMatches(tokenOf(req), b.public_token_hash)) && !(user && user.id === b.user_id) && !staff) throw new HttpError(404, "Booking not found.");
  return { b, staff };
}
const view = (b: Bk, s: BookingSettings) => ({
  reference: b.reference, status: b.status, type: b.type_name, typeId: b.booking_type_id, durationMinutes: b.duration_minutes, startsAt: b.starts_at, endsAt: b.ends_at, notes: b.notes, cancelReason: b.cancel_reason,
  customer: { name: b.name, email: b.email, phone: b.phone }, tzOffsetMinutes: s.tzOffsetMinutes,
  // Customers may only change a booking up to `cancelHours` before it starts; after that they contact the business.
  canChange: LIVE.includes(b.status) && b.starts_at - now() >= s.cancelHours * 3600, cancelHours: s.cancelHours,
});

export async function getBooking(env: Env, req: Request, p: Params): Promise<Response> {
  const { b } = await authorize(env, req, p.ref ?? "");
  return json({ booking: view(b, await getBookingSettings(env)) });
}

const icsTime = (e: number) => new Date(e * 1000).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
export async function bookingIcs(env: Env, req: Request, p: Params): Promise<Response> {
  const { b } = await authorize(env, req, p.ref ?? "");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Mahboobah Stitches//Bookings//EN", "BEGIN:VEVENT", `UID:${b.reference}@mahboobahstitches`, `DTSTAMP:${icsTime(now())}`,
    `DTSTART:${icsTime(b.starts_at)}`, `DTEND:${icsTime(b.ends_at)}`, `SUMMARY:${b.type_name} at Mahboobah Stitches`, `DESCRIPTION:Booking reference ${b.reference}`, `STATUS:${b.status === "confirmed" ? "CONFIRMED" : "TENTATIVE"}`, "END:VEVENT", "END:VCALENDAR"];
  return new Response(lines.join("\r\n") + "\r\n", { headers: { "content-type": "text/calendar; charset=utf-8", "content-disposition": `attachment; filename="${b.reference}.ics"`, "cache-control": "no-store" } });
}

async function setStatus(env: Env, b: Bk, to: string, note: string | null, actor: string | null, extra = ""): Promise<boolean> {
  const [r] = await env.DB.batch([
    env.DB.prepare(`UPDATE bookings SET status=?2${extra} WHERE id=?1 AND status=?3`).bind(b.id, to, b.status),
    env.DB.prepare("INSERT INTO booking_events (booking_id, from_status, to_status, note, actor_user_id) SELECT ?1,?2,?3,?4,?5 WHERE changes() > 0").bind(b.id, b.status, to, note, actor),
  ]);
  return (r.meta.changes ?? 0) > 0;
}

export async function cancelBooking(env: Env, req: Request, p: Params): Promise<Response> {
  assertSameOrigin(req);
  await rateLimit(env, `book-change:ip:${clientIp(req)}`, 20, 3600);
  const { b } = await authorize(env, req, p.ref ?? "");
  const s = await getBookingSettings(env);
  if (!LIVE.includes(b.status)) throw new HttpError(409, "This booking is already closed.");
  if (b.starts_at - now() < s.cancelHours * 3600) throw new HttpError(409, `Bookings can be cancelled online up to ${s.cancelHours} hours before. Please contact us on WhatsApp.`);
  const reason = v.optText((await readJson(req)).reason, "Reason", 300);
  if (!(await setStatus(env, b, "cancelled", reason ?? "Cancelled by the customer", null, `, cancelled_at=${now()}`))) throw new HttpError(409, "That booking was just changed. Please reload.");
  if (reason) await env.DB.prepare("UPDATE bookings SET cancel_reason=?2 WHERE id=?1").bind(b.id, reason).run();
  return json({ status: "cancelled" });
}

async function move(env: Env, b: Bk, startsAt: number, s: BookingSettings, status: string, actor: string | null, note: string): Promise<void> {
  await assertFreeSlot(env, b.duration_minutes, startsAt, s, b.id);
  const endsAt = startsAt + b.duration_minutes * 60;
  const [r] = await env.DB.batch([
    env.DB.prepare(
      `UPDATE bookings SET starts_at=?2, ends_at=?3, status=?4 WHERE id=?1 AND status IN ('requested','confirmed')
         AND NOT EXISTS (SELECT 1 FROM bookings o WHERE o.id <> ?1 AND o.status IN ('requested','confirmed') AND o.starts_at < ?3 AND o.ends_at > ?2)`,
    ).bind(b.id, startsAt, endsAt, status),
    env.DB.prepare("INSERT INTO booking_events (booking_id, from_status, to_status, note, actor_user_id) SELECT ?1,?2,?3,?4,?5 WHERE changes() > 0").bind(b.id, b.status, status, note, actor),
  ]);
  if (!r.meta.changes) throw new HttpError(409, "Sorry, that time was just taken. Please choose another.");
}

export async function rescheduleBooking(env: Env, req: Request, p: Params): Promise<Response> {
  assertSameOrigin(req);
  await rateLimit(env, `book-change:ip:${clientIp(req)}`, 20, 3600);
  const { b } = await authorize(env, req, p.ref ?? "");
  const s = await getBookingSettings(env);
  if (!LIVE.includes(b.status)) throw new HttpError(409, "This booking is already closed.");
  if (b.starts_at - now() < s.cancelHours * 3600) throw new HttpError(409, `Bookings can be changed online up to ${s.cancelHours} hours before. Please contact us on WhatsApp.`);
  const startsAt = v.int((await readJson(req)).startsAt, "Time", 1, 4_102_444_800);
  await move(env, b, startsAt, s, s.autoConfirm ? "confirmed" : "requested", null, "Rescheduled by the customer");
  return json({ ok: true });
}

export async function accountBookings(env: Env, req: Request): Promise<Response> {
  const u = await getSessionUser(env, req);
  if (!u) throw new HttpError(401, "Please sign in.");
  const rows = await env.DB.prepare("SELECT b.reference, b.status, b.starts_at AS startsAt, t.name AS type FROM bookings b JOIN booking_types t ON t.id=b.booking_type_id WHERE b.user_id=?1 ORDER BY b.starts_at DESC LIMIT 100").bind(u.id).all();
  return json({ bookings: rows.results });
}

/* ---------------- admin: calendar ---------------- */

export async function adminList(env: Env, req: Request): Promise<Response> {
  await guard(env, req, "bookings:manage");
  const u = new URL(req.url).searchParams;
  const s = await getBookingSettings(env);
  const from = u.get("from") ?? fromEpoch(now(), s.tzOffsetMinutes).date;
  const to = u.get("to") ?? addDays(from, 30);
  if (!isDateStr(from) || !isDateStr(to)) throw new HttpError(422, "Dates must look like 2026-12-31.");
  const status = u.get("status") ?? "";
  if (status && !(STATUSES as readonly string[]).includes(status)) throw new HttpError(422, "Unknown status.");
  const lo = Date.parse(`${from}T00:00:00Z`) / 1000 - s.tzOffsetMinutes * 60;
  const hi = Date.parse(`${addDays(to, 1)}T00:00:00Z`) / 1000 - s.tzOffsetMinutes * 60;
  const rows = await env.DB.prepare(
    `SELECT b.id, b.reference, b.status, b.starts_at AS startsAt, b.ends_at AS endsAt, b.name, b.email, b.phone, b.notes, t.name AS type
       FROM bookings b JOIN booking_types t ON t.id=b.booking_type_id WHERE b.starts_at >= ?1 AND b.starts_at < ?2 AND (?3='' OR b.status=?3) ORDER BY b.starts_at`,
  ).bind(lo, hi, status).all();
  return json({ bookings: rows.results, tzOffsetMinutes: s.tzOffsetMinutes });
}

async function byId(env: Env, id: string): Promise<Bk> {
  const b = await env.DB.prepare("SELECT b.*, t.name AS type_name, t.duration_minutes FROM bookings b JOIN booking_types t ON t.id=b.booking_type_id WHERE b.id=?1").bind(v.id(id)).first<Bk>();
  if (!b) throw new HttpError(404, "Booking not found.");
  return b;
}

export async function adminGet(env: Env, req: Request, p: Params): Promise<Response> {
  await guard(env, req, "bookings:manage");
  const b = await byId(env, p.id);
  const ev = await env.DB.prepare("SELECT e.to_status AS status, e.note, e.created_at AS at, u.email AS actorEmail FROM booking_events e LEFT JOIN users u ON u.id=e.actor_user_id WHERE e.booking_id=?1 ORDER BY e.id").bind(b.id).all();
  return json({ booking: { ...view(b, await getBookingSettings(env)), id: b.id }, events: ev.results, allowedNext: NEXT[b.status] ?? [] });
}

export async function adminStatus(env: Env, req: Request, p: Params): Promise<Response> {
  const user = await guard(env, req, "bookings:manage");
  const b = await byId(env, p.id);
  const body = await readJson(req);
  const to = v.oneOf(body.status, "Status", STATUSES);
  if (!(NEXT[b.status] ?? []).includes(to)) throw new HttpError(409, `A booking that is "${b.status}" cannot be moved to "${to}".`);
  const note = v.optText(body.note, "Note", 300);
  if (!(await setStatus(env, b, to, note, user.id, to === "cancelled" ? `, cancelled_at=${now()}` : ""))) throw new HttpError(409, "That booking was changed by someone else. Reload and try again.");
  if (to === "cancelled" && note) await env.DB.prepare("UPDATE bookings SET cancel_reason=?2 WHERE id=?1").bind(b.id, note).run();
  await audit(env, { actor: user.id, action: "booking.status", entity: "booking", entityId: b.id, ip: ip(req), meta: { from: b.status, to } });
  return json({ ok: true });
}

export async function adminReschedule(env: Env, req: Request, p: Params): Promise<Response> {
  const user = await guard(env, req, "bookings:manage");
  const b = await byId(env, p.id);
  if (!LIVE.includes(b.status)) throw new HttpError(409, "This booking is already closed.");
  const startsAt = v.int((await readJson(req)).startsAt, "Time", 1, 4_102_444_800);
  await move(env, b, startsAt, await getBookingSettings(env), b.status, user.id, "Rescheduled by staff");
  await audit(env, { actor: user.id, action: "booking.reschedule", entity: "booking", entityId: b.id, ip: ip(req) });
  return json({ ok: true });
}

export async function adminNewLink(env: Env, req: Request, p: Params): Promise<Response> {
  const user = await guard(env, req, "bookings:manage");
  const b = await byId(env, p.id);
  const { token, hash } = await newToken();
  await env.DB.prepare("UPDATE bookings SET public_token_hash=?2 WHERE id=?1").bind(b.id, hash).run();
  await audit(env, { actor: user.id, action: "booking.new_link", entity: "booking", entityId: b.id, ip: ip(req) });
  return json({ path: `/bookings/${b.reference}?token=${token}` });
}

/* ---------------- admin: availability setup ---------------- */

export async function adminConfig(env: Env, req: Request): Promise<Response> {
  await guard(env, req, "bookings:manage");
  const [types, rules, closed, s] = await Promise.all([
    env.DB.prepare("SELECT id, name, duration_minutes AS durationMinutes, description, is_active AS isActive FROM booking_types ORDER BY sort_order, rowid").all(),
    env.DB.prepare("SELECT id, weekday, start_minute AS startMinute, end_minute AS endMinute FROM availability_rules ORDER BY weekday, start_minute").all(),
    env.DB.prepare("SELECT date, reason FROM closed_dates WHERE date >= date('now','-1 day') ORDER BY date LIMIT 200").all(),
    getBookingSettings(env),
  ]);
  return json({ types: types.results, rules: rules.results, closedDates: closed.results, settings: s });
}

function parseType(b: Record<string, unknown>) {
  return { name: v.text(b.name, "Name", 2, 60), minutes: v.int(b.durationMinutes, "Duration", 10, 240), description: v.optText(b.description, "Description", 200), active: b.isActive === undefined || v.bool(b.isActive) ? 1 : 0 };
}
export async function adminCreateType(env: Env, req: Request): Promise<Response> {
  const user = await guard(env, req, "bookings:manage");
  const d = parseType(await readJson(req));
  const id = `bt_${crypto.randomUUID().slice(0, 8)}`;
  await env.DB.prepare("INSERT INTO booking_types (id, name, duration_minutes, description, is_active, sort_order) VALUES (?1,?2,?3,?4,?5,(SELECT COALESCE(MAX(sort_order),0)+1 FROM booking_types))").bind(id, d.name, d.minutes, d.description, d.active).run();
  await audit(env, { actor: user.id, action: "booking_type.create", entity: "booking_type", entityId: id, ip: ip(req) });
  return json({ id }, 201);
}
export async function adminUpdateType(env: Env, req: Request, p: Params): Promise<Response> {
  const user = await guard(env, req, "bookings:manage");
  const d = parseType(await readJson(req));
  const res = await env.DB.prepare("UPDATE booking_types SET name=?2, duration_minutes=?3, description=?4, is_active=?5 WHERE id=?1").bind(v.id(p.id), d.name, d.minutes, d.description, d.active).run();
  if (!res.meta.changes) throw new HttpError(404, "Appointment type not found.");
  await audit(env, { actor: user.id, action: "booking_type.update", entity: "booking_type", entityId: p.id, ip: ip(req) });
  return json({ ok: true });
}
export async function adminAddRule(env: Env, req: Request): Promise<Response> {
  const user = await guard(env, req, "bookings:manage");
  const b = await readJson(req);
  const weekday = v.int(b.weekday, "Day", 0, 6);
  const start = v.int(b.startMinute, "Opening time", 0, 1439);
  const end = v.int(b.endMinute, "Closing time", 1, 1440);
  if (end <= start) throw new HttpError(422, "Closing time must be after opening time.");
  const id = crypto.randomUUID();
  await env.DB.prepare("INSERT INTO availability_rules (id, weekday, start_minute, end_minute) VALUES (?1,?2,?3,?4)").bind(id, weekday, start, end).run();
  await audit(env, { actor: user.id, action: "availability.add", entity: "availability", entityId: id, ip: ip(req) });
  return json({ id }, 201);
}
export async function adminDeleteRule(env: Env, req: Request, p: Params): Promise<Response> {
  const user = await guard(env, req, "bookings:manage");
  await env.DB.prepare("DELETE FROM availability_rules WHERE id=?1").bind(v.id(p.id)).run();
  await audit(env, { actor: user.id, action: "availability.delete", entity: "availability", entityId: p.id, ip: ip(req) });
  return json({ ok: true });
}
export async function adminAddClosed(env: Env, req: Request): Promise<Response> {
  const user = await guard(env, req, "bookings:manage");
  const b = await readJson(req);
  if (!isDateStr(b.date)) throw new HttpError(422, "Choose a date.");
  await env.DB.prepare("INSERT INTO closed_dates (date, reason) VALUES (?1,?2) ON CONFLICT(date) DO UPDATE SET reason=?2").bind(b.date, v.optText(b.reason, "Reason", 100)).run();
  await audit(env, { actor: user.id, action: "closed_date.add", entity: "closed_date", entityId: b.date, ip: ip(req) });
  return json({ ok: true }, 201);
}
export async function adminDeleteClosed(env: Env, req: Request, p: Params): Promise<Response> {
  const user = await guard(env, req, "bookings:manage");
  if (!isDateStr(p.date)) throw new HttpError(422, "Not a date.");
  await env.DB.prepare("DELETE FROM closed_dates WHERE date=?1").bind(p.date).run();
  await audit(env, { actor: user.id, action: "closed_date.delete", entity: "closed_date", entityId: p.date, ip: ip(req) });
  return json({ ok: true });
}
export async function adminSaveSettings(env: Env, req: Request): Promise<Response> {
  const user = await guard(env, req, "bookings:manage");
  const b = await readJson(req);
  const vals: Record<string, string> = {
    "booking.minNoticeHours": String(v.int(b.minNoticeHours, "Minimum notice", 0, 720)),
    "booking.maxDaysAhead": String(v.int(b.maxDaysAhead, "Days ahead", 1, 365)),
    "booking.cancelHours": String(v.int(b.cancelHours, "Cancellation notice", 0, 720)),
    "booking.autoConfirm": v.bool(b.autoConfirm) ? "1" : "0",
    "booking.tzOffsetMinutes": String(v.int(b.tzOffsetMinutes, "Time zone", -720, 840)),
  };
  await env.DB.batch(Object.entries(vals).map(([k, val]) => env.DB.prepare("INSERT INTO settings (key, value, updated_by) VALUES (?1,?2,?3) ON CONFLICT(key) DO UPDATE SET value=?2, updated_by=?3, updated_at=CAST(strftime('%s','now') AS INTEGER)").bind(k, val, user.id)));
  await audit(env, { actor: user.id, action: "booking_settings.update", entity: "settings", ip: ip(req) });
  return json({ ok: true });
}
