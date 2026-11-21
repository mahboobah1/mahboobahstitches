/** Appointment times are shown in the business's time zone (a fixed offset from UTC, set in Admin > Availability). */
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const local = (epoch: number, tz: number) => new Date((epoch + tz * 60) * 1000);
const p2 = (n: number) => String(n).padStart(2, "0");

export const fmtTime = (epoch: number, tz: number) => { const d = local(epoch, tz); return `${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}`; };
export const fmtDay = (epoch: number, tz: number) => { const d = local(epoch, tz); return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
export const fmtWhen = (epoch: number, tz: number) => `${fmtDay(epoch, tz)}, ${fmtTime(epoch, tz)}`;
export const dateKey = (epoch: number, tz: number) => { const d = local(epoch, tz); return `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}`; };
export const monthLabel = (ym: string) => { const [y, m] = ym.split("-").map(Number); return `${MONTHS[m - 1]} ${y}`; };
export const shiftMonth = (ym: string, n: number) => { const [y, m] = ym.split("-").map(Number); const d = new Date(Date.UTC(y, m - 1 + n, 1)); return `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}`; };
/** Grid cells for a month: leading blanks (weeks start on Sunday) then 1..N as YYYY-MM-DD. */
export function monthCells(ym: string): (string | null)[] {
  const [y, m] = ym.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return [...Array(first).fill(null), ...Array.from({ length: count }, (_, i) => `${ym}-${p2(i + 1)}`)];
}
export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const minuteLabel = (min: number) => `${p2(Math.floor(min / 60))}:${p2(min % 60)}`;
export const toMinutes = (hhmm: string) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
