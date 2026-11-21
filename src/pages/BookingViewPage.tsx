import { useCallback, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { SlotPicker } from "../components/booking/SlotPicker";
import { Badge } from "../components/admin/kit";
import { FormError } from "../components/FormField";
import { api } from "../lib/api";
import { fmtWhen } from "../lib/bookingTime";
import { usePageMeta } from "../lib/usePageMeta";
import { generalEnquiryLink } from "../lib/whatsapp";

interface Bk { reference: string; status: string; type: string; typeId: string; durationMinutes: number; startsAt: number; notes: string | null; cancelReason: string | null; customer: { name: string; email: string; phone: string | null }; tzOffsetMinutes: number; canChange: boolean; cancelHours: number }
const label: Record<string, string> = { requested: "Waiting for our confirmation", confirmed: "Confirmed", cancelled: "Cancelled", completed: "Completed", no_show: "Missed" };

export default function BookingViewPage() {
  const { ref = "" } = useParams();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const isNew = params.get("new") === "1";
  usePageMeta(`Booking ${ref}`);
  const [b, setB] = useState<Bk | null>(null);
  const [error, setError] = useState("");
  const [changing, setChanging] = useState(false);
  const [pick, setPick] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const q = token ? `?token=${encodeURIComponent(token)}` : "";
  const load = useCallback(() => { api<{ booking: Bk }>(`/api/bookings/${ref}${q}`).then((d) => setB(d.booking)).catch((e) => setError(e instanceof Error ? e.message : "Could not load this booking.")); }, [ref, q]);
  useEffect(load, [load]);

  const act = async (fn: () => Promise<unknown>) => { setBusy(true); setError(""); try { await fn(); setChanging(false); setPick(null); load(); } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong."); } finally { setBusy(false); } };

  if (!b) return <div className="wrap max-w-xl py-20 text-center">{error ? <><FormError message={error} /><Link to="/bookings" className="btn-ghost mt-6">Book a time</Link></> : <p role="status">Loading…</p>}</div>;
  const live = b.status === "requested" || b.status === "confirmed";
  const tz = b.tzOffsetMinutes;
  return (
    <div className="wrap max-w-xl py-10 sm:py-14">
      {isNew && <p role="status" className="mb-5 border border-dashed border-gold bg-gold/10 p-3 text-sm">Thank you! {b.status === "confirmed" ? "Your booking is confirmed." : "We have your request."} <strong>Save this page's link</strong> to change or cancel it later.</p>}
      <p className="text-sm text-royal/70">Booking {b.reference}</p>
      <h1 className="mt-1 text-4xl">{b.type}</h1>
      <p className="mt-3 text-xl">{fmtWhen(b.startsAt, tz)}</p>
      <p className="mt-1 text-sm text-royal/75">{b.durationMinutes} minutes · <Badge tone={b.status === "confirmed" ? "good" : live ? "warn" : "plain"}>{label[b.status] ?? b.status}</Badge></p>
      <p className="mt-4 text-sm">{b.customer.name} · {b.customer.email}{b.customer.phone ? ` · ${b.customer.phone}` : ""}</p>
      {b.notes && <p className="mt-2 text-sm text-royal/80">Note: {b.notes}</p>}
      {b.cancelReason && <p className="mt-2 text-sm text-royal/80">Reason: {b.cancelReason}</p>}
      <FormError message={error} />

      {live && (
        <div className="mt-8 space-y-3">
          <a href={`/api/bookings/${b.reference}/ics${q}`} className="btn-ghost w-full sm:w-auto">Add to my calendar</a>
          {b.canChange ? (
            <div className="flex flex-wrap gap-3">
              <button type="button" className="btn-ghost" onClick={() => setChanging((c) => !c)}>{changing ? "Keep my time" : "Change the time"}</button>
              <button type="button" className="btn-ghost" disabled={busy} onClick={() => { if (window.confirm("Cancel this booking?")) void act(() => api(`/api/bookings/${b.reference}/cancel${q}`, { method: "POST", body: {} })); }}>Cancel booking</button>
            </div>
          ) : (
            <p className="text-sm text-royal/80">Online changes close {b.cancelHours} hours before. To change or cancel now, please message us.</p>
          )}
          {changing && b.canChange && (
            <div className="mt-4 border border-gold p-4">
              <SlotPicker typeId={b.typeId} tz={tz} value={pick} onChange={setPick} />
              <button type="button" className="btn-primary mt-4" disabled={!pick || busy} onClick={() => pick && void act(() => api(`/api/bookings/${b.reference}/reschedule${q}`, { method: "POST", body: { startsAt: pick } }))}>{busy ? "Saving…" : "Move my booking"}</button>
            </div>
          )}
        </div>
      )}
      <a href={generalEnquiryLink(`I have a question about my booking ${b.reference}.`)} target="_blank" rel="noopener noreferrer" className="btn-ghost mt-8">Ask about this on WhatsApp</a>
    </div>
  );
}
