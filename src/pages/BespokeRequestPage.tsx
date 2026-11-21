import { useCallback, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Badge } from "../components/admin/kit";
import { FormError, FormField } from "../components/FormField";
import { api } from "../lib/api";
import { customerStatus, FINAL_STATUSES, MEASURE_LABELS } from "../lib/bespokeStatus";
import { formatMoney } from "../lib/format";
import { fmtDate, isPaidStatus } from "../lib/orderStatus";
import { usePageMeta } from "../lib/usePageMeta";
import { generalEnquiryLink } from "../lib/whatsapp";

interface View {
  request: { reference: string; status: string; category: string; description: string; fabric: string | null; colour: string | null; unit: string; measurements: Record<string, number>; deadline: number | null; notes: string | null; createdAt: number; quote: { amountMinor: number; currency: string; note: string | null } | null; canApprove: boolean; canCancel: boolean };
  photos: string[]; messages: { author: string; body: string; at: number }[]; timeline: { status: string; note: string | null; at: number }[];
  order: { number: string; status: string; totalMinor: number; currency: string } | null;
}

export default function BespokeRequestPage() {
  const { ref = "" } = useParams();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const isNew = params.get("new") === "1";
  usePageMeta(`Request ${ref}`);
  const [v, setV] = useState<View | null>(null);
  const [error, setError] = useState("");
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const q = token ? `?token=${encodeURIComponent(token)}` : "";
  const load = useCallback(() => { api<View>(`/api/bespoke/${ref}${q}`).then(setV).catch((e) => setError(e instanceof Error ? e.message : "Could not load this request.")); }, [ref, q]);
  useEffect(load, [load]);
  const act = async (fn: () => Promise<unknown>, after?: () => void) => { setBusy(true); setError(""); try { await fn(); after?.(); load(); } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong."); } finally { setBusy(false); } };

  if (!v) return <div className="wrap max-w-xl py-20 text-center">{error ? <><FormError message={error} /><Link to="/bespoke" className="btn-ghost mt-6">Start a request</Link></> : <p role="status">Loading…</p>}</div>;
  const r = v.request;
  const closed = FINAL_STATUSES.includes(r.status);
  const money = (n: number, c: string) => formatMoney(n, c);
  return (
    <div className="wrap max-w-2xl py-10 sm:py-14">
      {isNew && <p role="status" className="mb-5 border border-dashed border-gold bg-gold/10 p-3 text-sm">Thank you, we have your request. <strong>Save this page's link</strong> (or screenshot the reference): it is how you follow progress, answer questions and approve your quotation.</p>}
      <p className="text-sm text-royal/70">Request {r.reference} · sent {fmtDate(r.createdAt)}</p>
      <h1 className="mt-1 text-4xl">Bespoke {r.category.toLowerCase()}</h1>
      <p className="mt-3"><Badge tone={r.status === "awaiting_approval" || r.status === "awaiting_information" ? "warn" : r.status === "completed" || r.status === "approved" ? "good" : "plain"}>{customerStatus[r.status] ?? r.status}</Badge></p>
      <FormError message={error} />

      {r.quote && (
        <section className="mt-8 border border-gold p-5" aria-labelledby="quote">
          <h2 id="quote" className="!text-2xl">Your quotation</h2>
          <p className="mt-2 font-display text-4xl">{money(r.quote.amountMinor, r.quote.currency)}</p>
          {r.quote.note && <p className="mt-2 text-sm text-royal/80">{r.quote.note}</p>}
          {r.canApprove && (
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" className="btn-primary" disabled={busy} onClick={() => { if (window.confirm(`Approve this quotation of ${money(r.quote!.amountMinor, r.quote!.currency)}?`)) void act(() => api(`/api/bespoke/${ref}/respond${q}`, { method: "POST", body: { action: "approve" } })); }}>Approve quotation</button>
              <button type="button" className="btn-ghost" disabled={busy} onClick={() => { if (window.confirm("Decline this quotation? The request will be closed.")) void act(() => api(`/api/bespoke/${ref}/respond${q}`, { method: "POST", body: { action: "decline" } })); }}>Decline</button>
            </div>
          )}
        </section>
      )}

      {v.order && (
        <section className="mt-6 border border-dashed border-gold p-5" aria-labelledby="pay">
          <h2 id="pay" className="!text-2xl">Payment</h2>
          {isPaidStatus(v.order.status) ? <p className="mt-2">Paid, thank you. Order {v.order.number}.</p> : v.order.status === "unpaid" ? (
            <>
              <p className="mt-2 text-sm">Your quotation is approved. Pay {money(v.order.totalMinor, v.order.currency)} online to start production.</p>
              <Link to={`/order/${v.order.number}${q}`} className="btn-primary mt-3">Pay now</Link>
            </>
          ) : <p className="mt-2 text-sm">Order {v.order.number}: {v.order.status}.</p>}
        </section>
      )}

      <section className="mt-8" aria-labelledby="det">
        <h2 id="det" className="!text-2xl">Your request</h2>
        <p className="mt-2 whitespace-pre-line text-royal/90">{r.description}</p>
        <dl className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
          {r.fabric && <div><dt className="inline font-medium">Fabric: </dt><dd className="inline">{r.fabric}</dd></div>}
          {r.colour && <div><dt className="inline font-medium">Colour: </dt><dd className="inline">{r.colour}</dd></div>}
          {r.deadline && <div><dt className="inline font-medium">Needed by: </dt><dd className="inline">{new Date(r.deadline * 1000).toLocaleDateString()}</dd></div>}
          {Object.entries(r.measurements).map(([k, n]) => <div key={k}><dt className="inline font-medium">{MEASURE_LABELS[k] ?? k}: </dt><dd className="inline">{n} {r.unit}</dd></div>)}
        </dl>
        {r.notes && <p className="mt-2 text-sm">Note: {r.notes}</p>}
        {v.photos.length > 0 && <ul className="mt-4 flex flex-wrap gap-3">{v.photos.map((u) => <li key={u}><img src={u} alt="Your reference" className="h-28 w-24 bg-powder object-cover" /></li>)}</ul>}
      </section>

      <section className="mt-8" aria-labelledby="msgs">
        <h2 id="msgs" className="!text-2xl">Messages</h2>
        {v.messages.length === 0 && <p className="mt-2 text-sm text-royal/70">No messages yet. We will write here if we need to ask you anything.</p>}
        <ul className="mt-3 space-y-3">
          {v.messages.map((m, i) => <li key={i} className={`max-w-[85%] p-3 text-sm ${m.author === "staff" ? "bg-powder" : "ml-auto border border-gold"}`}><span className="block text-xs text-royal/60">{m.author === "staff" ? "Mahboobah Stitches" : "You"} · {fmtDate(m.at)}</span>{m.body}</li>)}
        </ul>
        {!closed && (
          <form className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={(e) => { e.preventDefault(); void act(() => api(`/api/bespoke/${ref}/message${q}`, { method: "POST", body: { body: reply } }), () => setReply("")); }}>
            <div className="flex-1"><FormField label="Write to us" value={reply} maxLength={1000} onChange={(e) => setReply(e.target.value)} /></div>
            <button type="submit" className="btn-primary" disabled={busy || reply.trim().length < 2}>Send</button>
          </form>
        )}
      </section>

      <section className="mt-8" aria-labelledby="hist">
        <h2 id="hist" className="!text-2xl">Progress</h2>
        <ol className="mt-3 space-y-2 border-l border-dashed border-gold pl-4 text-sm">
          {v.timeline.map((t, i) => <li key={i}>{customerStatus[t.status] ?? t.status} <span className="text-royal/60">· {fmtDate(t.at)}</span>{t.note && <span className="block text-royal/80">{t.note}</span>}</li>)}
        </ol>
      </section>

      <div className="mt-10 flex flex-wrap gap-3">
        <a href={generalEnquiryLink(`I have a question about my bespoke request ${r.reference}.`)} target="_blank" rel="noopener noreferrer" className="btn-ghost">Ask on WhatsApp</a>
        {r.canCancel && <button type="button" className="link-line text-sm" disabled={busy} onClick={() => { if (window.confirm("Cancel this request?")) void act(() => api(`/api/bespoke/${ref}/respond${q}`, { method: "POST", body: { action: "cancel" } })); }}>Cancel this request</button>}
      </div>
    </div>
  );
}
