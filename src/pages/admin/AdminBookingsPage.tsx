import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge, errText } from "../../components/admin/kit";
import { FormField } from "../../components/FormField";
import { api } from "../../lib/api";
import { dateKey, fmtDay, fmtTime } from "../../lib/bookingTime";
import { usePageMeta } from "../../lib/usePageMeta";

interface Row { id: string; reference: string; status: string; startsAt: number; endsAt: number; name: string; email: string; phone: string | null; notes: string | null; type: string }
const addDays = (ymd: string, n: number) => new Date(Date.parse(ymd + "T00:00:00Z") + n * 86400000).toISOString().slice(0, 10);

export default function AdminBookingsPage() {
  usePageMeta("Bookings");
  const [from, setFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [days, setDays] = useState(14);
  const [status, setStatus] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [tz, setTz] = useState(60);
  const [error, setError] = useState("");
  useEffect(() => {
    setRows(null);
    api<{ bookings: Row[]; tzOffsetMinutes: number }>(`/api/admin/bookings?from=${from}&to=${addDays(from, days - 1)}&status=${status}`)
      .then((d) => { setRows(d.bookings); setTz(d.tzOffsetMinutes); }).catch((e) => setError(errText(e)));
  }, [from, days, status]);
  const grouped = useMemo(() => { const g = new Map<string, Row[]>(); for (const r of rows ?? []) { const k = dateKey(r.startsAt, tz); g.set(k, [...(g.get(k) ?? []), r]); } return [...g]; }, [rows, tz]);
  return (
    <>
      <h1 className="text-4xl">Bookings calendar</h1>
      <div className="mt-6 grid max-w-2xl gap-4 sm:grid-cols-3">
        <FormField label="From" type="date" value={from} onChange={(e) => e.target.value && setFrom(e.target.value)} />
        <div><label htmlFor="bk-days" className="mb-1 block text-sm">Show</label><select id="bk-days" className="field" value={days} onChange={(e) => setDays(Number(e.target.value))}><option value={1}>1 day</option><option value={7}>7 days</option><option value={14}>14 days</option><option value={31}>31 days</option></select></div>
        <div><label htmlFor="bk-status" className="mb-1 block text-sm">Status</label><select id="bk-status" className="field" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All</option><option value="requested">Requested</option><option value="confirmed">Confirmed</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option><option value="no_show">No show</option></select></div>
      </div>
      <div className="mt-3 flex gap-3 text-sm"><button type="button" className="link-line" onClick={() => setFrom(addDays(from, -days))}>← Earlier</button><button type="button" className="link-line" onClick={() => setFrom(addDays(from, days))}>Later →</button></div>
      {error && <p role="alert" className="mt-4 text-[#9b2c2c]">{error}</p>}
      {!rows && !error && <p className="mt-6" role="status">Loading…</p>}
      {rows && rows.length === 0 && <p className="mt-6">No bookings in this period.</p>}
      <div className="mt-6 space-y-6">
        {grouped.map(([d, list]) => (
          <section key={d} aria-label={d}>
            <h2 className="!text-xl">{fmtDay(list[0].startsAt, tz)}</h2>
            <ul className="mt-2 divide-y divide-dashed divide-gold/60 border-y border-dashed border-gold/60">
              {list.map((b) => (
                <li key={b.id}><Link to={`/admin/bookings/${b.id}`} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <span><span className="font-medium">{fmtTime(b.startsAt, tz)}–{fmtTime(b.endsAt, tz)}</span> · {b.type}<span className="block text-xs text-royal/70">{b.name}{b.phone ? ` · ${b.phone}` : ""}</span></span>
                  <Badge tone={b.status === "confirmed" ? "good" : b.status === "requested" ? "warn" : "plain"}>{b.status}</Badge>
                </Link></li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
