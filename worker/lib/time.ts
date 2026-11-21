import type { Env } from "../types";

/**
 * Appointment time maths. Opening hours are stored as "minutes after midnight, business time".
 * Nigeria has no daylight saving, so business time is a fixed offset from UTC (default +60 minutes).
 */
export interface BookingSettings { minNoticeHours: number; maxDaysAhead: number; cancelHours: number; autoConfirm: boolean; tzOffsetMinutes: number }
export interface Slot { startsAt: number; endsAt: number; time: string }

export async function getBookingSettings(env: Env): Promise<BookingSettings> {
  const rows = await env.DB.prepare("SELECT key, value FROM settings WHERE key LIKE 'booking.%'").all<{ key: string; value: string }>();
  const m = new Map(rows.results.map((r) => [r.key, r.value]));
  const num = (k: string, d: number, lo: number, hi: number) => { const n = Number(m.get(k)); return Number.isFinite(n) && n >= lo && n <= hi ? Math.floor(n) : d; };
  return {
    minNoticeHours: num("booking.minNoticeHours", 12, 0, 720),
    maxDaysAhead: num("booking.maxDaysAhead", 60, 1, 365),
    cancelHours: num("booking.cancelHours", 24, 0, 720),
    autoConfirm: m.get("booking.autoConfirm") !== "0",
    tzOffsetMinutes: num("booking.tzOffsetMinutes", 60, -720, 840),
  };
}

export const isDateStr = (s: unknown): s is string => {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
};

const utcMidnight = (date: string) => { const [y, m, d] = date.split("-").map(Number); return Date.UTC(y, m - 1, d) / 1000; };
/** Weekday (0 = Sunday) of a calendar date. */
export const weekdayOf = (date: string) => new Date(utcMidnight(date) * 1000).getUTCDay();
/** The moment (Unix seconds) that `minute` minutes after midnight on `date` happens in business time. */
export const toEpoch = (date: string, minute: number, tzOffset: number) => utcMidnight(date) + minute * 60 - tzOffset * 60;
/** Business-time date and minute-of-day for a Unix time. */
export function fromEpoch(epoch: number, tzOffset: number): { date: string; minute: number } {
  const local = epoch + tzOffset * 60;
  const d = new Date(local * 1000);
  const date = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  return { date, minute: d.getUTCHours() * 60 + d.getUTCMinutes() };
}
export const hhmm = (minute: number) => `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
export const addDays = (date: string, n: number) => new Date((utcMidnight(date) + n * 86400) * 1000).toISOString().slice(0, 10);

/**
 * Free appointment slots for each date in [from, to]. A slot is free when: it lies inside the weekly opening hours,
 * the day is not closed, it is far enough ahead (minimum notice) and not too far ahead, and it does not overlap a live booking.
 */
export async function slotsForRange(env: Env, durationMinutes: number, from: string, to: string, s: BookingSettings, now = Math.floor(Date.now() / 1000), ignoreBookingId?: string): Promise<Record<string, Slot[]>> {
  const rangeStart = toEpoch(from, 0, s.tzOffsetMinutes);
  const rangeEnd = toEpoch(addDays(to, 1), 0, s.tzOffsetMinutes);
  const [rules, closed, booked] = await Promise.all([
    env.DB.prepare("SELECT weekday, start_minute, end_minute FROM availability_rules").all<{ weekday: number; start_minute: number; end_minute: number }>(),
    env.DB.prepare("SELECT date FROM closed_dates WHERE date >= ?1 AND date <= ?2").bind(from, to).all<{ date: string }>(),
    env.DB.prepare("SELECT starts_at, ends_at FROM bookings WHERE status IN ('requested','confirmed') AND starts_at < ?2 AND ends_at > ?1 AND (?3 IS NULL OR id <> ?3)").bind(rangeStart, rangeEnd, ignoreBookingId ?? null).all<{ starts_at: number; ends_at: number }>(),
  ]);
  const closedSet = new Set(closed.results.map((c) => c.date));
  const earliest = now + s.minNoticeHours * 3600;
  const latest = now + s.maxDaysAhead * 86400;
  const out: Record<string, Slot[]> = {};
  for (let date = from; date <= to; date = addDays(date, 1)) {
    const slots = new Map<number, Slot>();
    if (!closedSet.has(date)) {
      for (const r of rules.results.filter((x) => x.weekday === weekdayOf(date))) {
        for (let t = r.start_minute; t + durationMinutes <= r.end_minute; t += durationMinutes) {
          const startsAt = toEpoch(date, t, s.tzOffsetMinutes);
          const endsAt = startsAt + durationMinutes * 60;
          if (startsAt < earliest || startsAt > latest) continue;
          if (booked.results.some((b) => b.starts_at < endsAt && b.ends_at > startsAt)) continue;
          slots.set(startsAt, { startsAt, endsAt, time: hhmm(t) });
        }
      }
    }
    out[date] = [...slots.values()].sort((a, b) => a.startsAt - b.startsAt);
  }
  return out;
}
