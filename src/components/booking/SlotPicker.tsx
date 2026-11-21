import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { dateKey, fmtDay, fmtTime, monthCells, monthLabel, shiftMonth, WEEKDAYS } from "../../lib/bookingTime";

interface Slot { startsAt: number; time: string }
interface Props { typeId: string; tz: number; value: number | null; onChange: (startsAt: number | null) => void }

/** Month calendar of days that still have free times, then the free times for the chosen day. */
export function SlotPicker({ typeId, tz, value, onChange }: Props) {
  const [month, setMonth] = useState(() => dateKey(Math.floor(Date.now() / 1000), tz).slice(0, 7));
  const [days, setDays] = useState<Record<string, number> | null>(null);
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    setDays(null);
    api<{ days: Record<string, number> }>(`/api/bookings/days?type=${encodeURIComponent(typeId)}&month=${month}`)
      .then((d) => alive && setDays(d.days)).catch((e) => alive && setError(e instanceof Error ? e.message : "Could not load dates."));
    return () => { alive = false; };
  }, [typeId, month]);

  useEffect(() => {
    if (!date) { setSlots(null); return; }
    let alive = true;
    setSlots(null);
    api<{ slots: Slot[] }>(`/api/bookings/slots?type=${encodeURIComponent(typeId)}&date=${date}`)
      .then((d) => alive && setSlots(d.slots)).catch((e) => alive && setError(e instanceof Error ? e.message : "Could not load times."));
    return () => { alive = false; };
  }, [typeId, date]);

  useEffect(() => { setDate(""); onChange(null); }, [typeId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div className="flex items-center justify-between">
        <button type="button" className="btn-ghost !px-3" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month">‹</button>
        <h3 className="!text-xl" aria-live="polite">{monthLabel(month)}</h3>
        <button type="button" className="btn-ghost !px-3" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Next month">›</button>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs text-royal/70" aria-hidden="true">{WEEKDAYS.map((w) => <span key={w}>{w.slice(0, 3)}</span>)}</div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {monthCells(month).map((d, i) =>
          d === null ? <span key={i} /> : (
            <button key={d} type="button" disabled={!days?.[d]} onClick={() => { setDate(d); onChange(null); }} aria-pressed={date === d}
              aria-label={`${d}${days?.[d] ? `, ${days[d]} times free` : ", no times"}`}
              className={`flex h-11 items-center justify-center rounded-sm border text-sm ${date === d ? "border-royal bg-royal text-cream" : days?.[d] ? "border-gold hover:bg-royal/5" : "border-transparent text-royal/30"}`}>
              {Number(d.slice(8))}
            </button>
          ),
        )}
      </div>
      {!days && !error && <p className="mt-3 text-sm" role="status">Loading dates…</p>}
      {days && Object.keys(days).length === 0 && <p className="mt-3 text-sm text-royal/75">No free times this month. Try the next month.</p>}
      {error && <p role="alert" className="mt-3 text-sm text-[#9b2c2c]">{error}</p>}
      {date && (
        <div className="mt-5">
          <h3 className="!text-xl">{slots && slots[0] ? fmtDay(slots[0].startsAt, tz) : date}</h3>
          {!slots && <p className="mt-2 text-sm" role="status">Loading times…</p>}
          {slots && slots.length === 0 && <p className="mt-2 text-sm">No free times on this day.</p>}
          <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Available times">
            {slots?.map((s) => (
              <button key={s.startsAt} type="button" aria-pressed={value === s.startsAt} onClick={() => onChange(s.startsAt)}
                className={`btn border ${value === s.startsAt ? "border-royal bg-royal text-cream" : "border-royal/30"}`}>{fmtTime(s.startsAt, tz)}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
