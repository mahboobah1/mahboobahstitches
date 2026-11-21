import { useCallback, useEffect, useState } from "react";
import { CheckField, Notice, SelectField, errText, type Msg } from "../../components/admin/kit";
import { FormField } from "../../components/FormField";
import { api } from "../../lib/api";
import { minuteLabel, toMinutes, WEEKDAYS } from "../../lib/bookingTime";
import { usePageMeta } from "../../lib/usePageMeta";

interface Cfg {
  types: { id: string; name: string; durationMinutes: number; description: string | null; isActive: number }[];
  rules: { id: string; weekday: number; startMinute: number; endMinute: number }[];
  closedDates: { date: string; reason: string | null }[];
  settings: { minNoticeHours: number; maxDaysAhead: number; cancelHours: number; autoConfirm: boolean; tzOffsetMinutes: number };
}

export default function AdminAvailabilityPage() {
  usePageMeta("Availability");
  const [c, setC] = useState<Cfg | null>(null);
  const [msg, setMsg] = useState<Msg | null>(null);
  const [rule, setRule] = useState({ weekday: "1", start: "10:00", end: "17:00" });
  const [closed, setClosed] = useState({ date: "", reason: "" });
  const [s, setS] = useState<Cfg["settings"] | null>(null);
  const [nt, setNt] = useState({ name: "", minutes: "30", description: "" });
  const load = useCallback(() => { api<Cfg>("/api/admin/booking-config").then((x) => { setC(x); setS(x.settings); }).catch((e) => setMsg({ ok: false, text: errText(e) })); }, []);
  useEffect(load, [load]);
  const run = async (fn: () => Promise<unknown>, ok: string) => { setMsg(null); try { await fn(); setMsg({ ok: true, text: ok }); load(); } catch (e) { setMsg({ ok: false, text: errText(e) }); } };
  if (!c || !s) return msg ? <Notice msg={msg} /> : <p role="status">Loading…</p>;
  return (
    <>
      <h1 className="text-4xl">Availability</h1>
      <p className="mt-2 max-w-xl text-sm text-royal/75">Customers can only book inside the opening hours you set here. Until you add hours, no booking times are offered.</p>
      <Notice msg={msg} />

      <section className="mt-8" aria-labelledby="hrs"><h2 id="hrs" className="!text-2xl">Opening hours</h2>
        <ul className="mt-3 space-y-2">{c.rules.map((r) => <li key={r.id} className="flex items-center justify-between gap-3 border border-dashed border-gold p-3 text-sm"><span>{WEEKDAYS[r.weekday]} · {minuteLabel(r.startMinute)} to {minuteLabel(r.endMinute)}</span><button type="button" className="link-line" onClick={() => void run(() => api(`/api/admin/availability/${r.id}`, { method: "DELETE" }), "Removed.")}>Remove</button></li>)}{c.rules.length === 0 && <li className="text-sm">No opening hours yet.</li>}</ul>
        <div className="mt-4 grid max-w-xl gap-3 sm:grid-cols-4 sm:items-end">
          <SelectField label="Day" value={rule.weekday} onChange={(e) => setRule({ ...rule, weekday: e.target.value })}>{WEEKDAYS.map((w, i) => <option key={w} value={i}>{w}</option>)}</SelectField>
          <FormField label="From" type="time" value={rule.start} onChange={(e) => setRule({ ...rule, start: e.target.value })} />
          <FormField label="To" type="time" value={rule.end} onChange={(e) => setRule({ ...rule, end: e.target.value })} />
          <button type="button" className="btn-primary" onClick={() => void run(() => api("/api/admin/availability", { method: "POST", body: { weekday: Number(rule.weekday), startMinute: toMinutes(rule.start), endMinute: toMinutes(rule.end) } }), "Hours added.")}>Add</button>
        </div></section>

      <section className="mt-10" aria-labelledby="cl"><h2 id="cl" className="!text-2xl">Days closed</h2>
        <ul className="mt-3 space-y-2">{c.closedDates.map((d) => <li key={d.date} className="flex items-center justify-between gap-3 border border-dashed border-gold p-3 text-sm"><span>{d.date}{d.reason ? ` · ${d.reason}` : ""}</span><button type="button" className="link-line" onClick={() => void run(() => api(`/api/admin/closed-dates/${d.date}`, { method: "DELETE" }), "Reopened.")}>Reopen</button></li>)}{c.closedDates.length === 0 && <li className="text-sm">No closed days set.</li>}</ul>
        <div className="mt-4 grid max-w-xl gap-3 sm:grid-cols-3 sm:items-end"><FormField label="Date" type="date" value={closed.date} onChange={(e) => setClosed({ ...closed, date: e.target.value })} /><FormField label="Reason (optional)" value={closed.reason} maxLength={100} onChange={(e) => setClosed({ ...closed, reason: e.target.value })} /><button type="button" className="btn-primary" disabled={!closed.date} onClick={() => void run(() => api("/api/admin/closed-dates", { method: "POST", body: closed }), "Day closed.")}>Close this day</button></div></section>

      <section className="mt-10" aria-labelledby="ty"><h2 id="ty" className="!text-2xl">Appointment types</h2>
        <ul className="mt-3 space-y-3">{c.types.map((t) => <TypeRow key={t.id} t={t} onSave={(body) => run(() => api(`/api/admin/booking-types/${t.id}`, { method: "PUT", body }), "Saved.")} />)}</ul>
        <div className="mt-4 grid max-w-xl gap-3 border border-gold p-4 sm:grid-cols-3 sm:items-end"><FormField label="New type" value={nt.name} maxLength={60} onChange={(e) => setNt({ ...nt, name: e.target.value })} /><FormField label="Minutes" type="number" min={10} max={240} value={nt.minutes} onChange={(e) => setNt({ ...nt, minutes: e.target.value })} /><button type="button" className="btn-primary" disabled={nt.name.trim().length < 2} onClick={() => void run(() => api("/api/admin/booking-types", { method: "POST", body: { name: nt.name, durationMinutes: Number(nt.minutes), description: nt.description || undefined, isActive: true } }), "Added.")}>Add type</button></div></section>

      <section className="mt-10 max-w-xl" aria-labelledby="rl"><h2 id="rl" className="!text-2xl">Booking rules</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <FormField label="Minimum notice (hours)" type="number" min={0} value={s.minNoticeHours} onChange={(e) => setS({ ...s, minNoticeHours: Number(e.target.value) })} hint="How far ahead a customer must book." />
          <FormField label="Book up to (days ahead)" type="number" min={1} value={s.maxDaysAhead} onChange={(e) => setS({ ...s, maxDaysAhead: Number(e.target.value) })} />
          <FormField label="Free cancellation (hours before)" type="number" min={0} value={s.cancelHours} onChange={(e) => setS({ ...s, cancelHours: Number(e.target.value) })} hint="After this, customers must contact you." />
          <FormField label="Time zone (minutes from UTC)" type="number" value={s.tzOffsetMinutes} onChange={(e) => setS({ ...s, tzOffsetMinutes: Number(e.target.value) })} hint="Nigeria: 60 (West Africa Time)." />
        </div>
        <CheckField label="Confirm bookings automatically (untick to approve each one yourself)" checked={s.autoConfirm} onChange={(e) => setS({ ...s, autoConfirm: e.target.checked })} />
        <button type="button" className="btn-primary mt-3" onClick={() => void run(() => api("/api/admin/booking-settings", { method: "PUT", body: s }), "Rules saved.")}>Save rules</button></section>
    </>
  );
}

function TypeRow({ t, onSave }: { t: Cfg["types"][number]; onSave: (b: unknown) => Promise<void> }) {
  const [name, setName] = useState(t.name);
  const [min, setMin] = useState(String(t.durationMinutes));
  const [desc, setDesc] = useState(t.description ?? "");
  const [on, setOn] = useState(t.isActive === 1);
  return (
    <li className="border border-dashed border-gold p-3">
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr]"><FormField label="Name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} /><FormField label="Minutes" type="number" value={min} onChange={(e) => setMin(e.target.value)} /></div>
      <div className="mt-2"><FormField label="Short description (optional)" value={desc} maxLength={200} onChange={(e) => setDesc(e.target.value)} /></div>
      <CheckField label="Customers can book this" checked={on} onChange={(e) => setOn(e.target.checked)} />
      <button type="button" className="btn-ghost" onClick={() => void onSave({ name, durationMinutes: Number(min), description: desc || undefined, isActive: on })}>Save</button>
    </li>
  );
}
