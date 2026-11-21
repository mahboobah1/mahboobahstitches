import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { SlotPicker } from "../../components/booking/SlotPicker";
import { Notice, errText, type Msg } from "../../components/admin/kit";
import { FormField } from "../../components/FormField";
import { api } from "../../lib/api";
import { fmtWhen } from "../../lib/bookingTime";
import { fmtDate } from "../../lib/orderStatus";
import { usePageMeta } from "../../lib/usePageMeta";

interface D { booking: { id: string; reference: string; status: string; type: string; typeId: string; durationMinutes: number; startsAt: number; notes: string | null; cancelReason: string | null; customer: { name: string; email: string; phone: string | null }; tzOffsetMinutes: number }; events: { status: string; note: string | null; at: number; actorEmail: string | null }[]; allowedNext: string[] }
const label: Record<string, string> = { confirmed: "Confirm", cancelled: "Cancel booking", completed: "Mark completed", no_show: "Mark no-show" };

export default function AdminBookingPage() {
  const { id = "" } = useParams();
  usePageMeta("Booking");
  const [d, setD] = useState<D | null>(null);
  const [msg, setMsg] = useState<Msg | null>(null);
  const [note, setNote] = useState("");
  const [moving, setMoving] = useState(false);
  const [pick, setPick] = useState<number | null>(null);
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => { api<D>(`/api/admin/bookings/${id}`).then(setD).catch((e) => setMsg({ ok: false, text: errText(e) })); }, [id]);
  useEffect(load, [load]);
  const run = async (fn: () => Promise<unknown>, ok: string) => { setBusy(true); setMsg(null); try { await fn(); setMsg({ ok: true, text: ok }); setNote(""); setMoving(false); setPick(null); load(); } catch (e) { setMsg({ ok: false, text: errText(e) }); } finally { setBusy(false); } };
  if (!d) return msg ? <Notice msg={msg} /> : <p role="status">Loading…</p>;
  const b = d.booking;
  const wa = (b.customer.phone ?? "").replace(/\D/g, "");
  const live = b.status === "requested" || b.status === "confirmed";
  return (
    <>
      <Link to="/admin/bookings" className="link-line text-sm">← Calendar</Link>
      <h1 className="mt-2 text-4xl">{b.type}</h1>
      <p className="mt-1 text-xl">{fmtWhen(b.startsAt, b.tzOffsetMinutes)} <span className="text-base text-royal/70">({b.durationMinutes} min) · {b.status}</span></p>
      <p className="mt-3 text-sm">{b.customer.name} · <a className="link-line" href={`mailto:${b.customer.email}`}>{b.customer.email}</a>{b.customer.phone && <> · <a className="link-line" href={`tel:${b.customer.phone}`}>{b.customer.phone}</a>{wa && <> · <a className="link-line" href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer">WhatsApp</a></>}</>}</p>
      {b.notes && <p className="mt-2 text-sm">Note: {b.notes}</p>}
      {b.cancelReason && <p className="mt-2 text-sm">Cancel reason: {b.cancelReason}</p>}
      <section className="mt-8 max-w-xl space-y-4">
        <FormField label="Note for the history (optional)" value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} />
        <div className="flex flex-wrap gap-3">
          {d.allowedNext.map((s) => <button key={s} type="button" disabled={busy} className={s === "cancelled" || s === "no_show" ? "btn-ghost" : "btn-primary"} onClick={() => { if (s === "cancelled" && !window.confirm("Cancel this booking?")) return; void run(() => api(`/api/admin/bookings/${id}/status`, { method: "PUT", body: { status: s, note: note || undefined } }), "Updated."); }}>{label[s] ?? s}</button>)}
          {live && <button type="button" className="btn-ghost" onClick={() => setMoving((m) => !m)}>{moving ? "Keep this time" : "Move to another time"}</button>}
        </div>
        {moving && <div className="border border-gold p-4"><SlotPicker typeId={b.typeId} tz={b.tzOffsetMinutes} value={pick} onChange={setPick} /><button type="button" className="btn-primary mt-4" disabled={!pick || busy} onClick={() => pick && void run(() => api(`/api/admin/bookings/${id}/reschedule`, { method: "POST", body: { startsAt: pick } }), "Moved.")}>Move booking</button></div>}
        <Notice msg={msg} />
        <div className="border-t border-dashed border-gold pt-4">
          <button type="button" className="link-line text-sm" disabled={busy} onClick={() => void run(async () => { const x = await api<{ path: string }>(`/api/admin/bookings/${id}/new-link`, { method: "POST", body: {} }); setLink(window.location.origin + x.path); }, "New link created. The old link no longer works.")}>Create a new private link for the customer</button>
          {link && <p className="mt-2 break-all rounded-sm bg-powder p-2 text-xs">{link}</p>}
        </div>
      </section>
      <h2 className="mt-10 !text-2xl">History</h2>
      <ol className="mt-3 space-y-2 border-l border-dashed border-gold pl-4 text-sm">{d.events.map((e, i) => <li key={i}>{e.status} <span className="text-royal/60">· {fmtDate(e.at)}{e.actorEmail ? ` · ${e.actorEmail}` : ""}</span>{e.note && <span className="block text-royal/80">{e.note}</span>}</li>)}</ol>
    </>
  );
}
