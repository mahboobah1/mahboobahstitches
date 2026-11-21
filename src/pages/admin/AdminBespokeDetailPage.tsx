import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckField, Notice, errText, type Msg } from "../../components/admin/kit";
import { FormField } from "../../components/FormField";
import { api } from "../../lib/api";
import { FINAL_STATUSES, MEASURE_LABELS, staffStatus } from "../../lib/bespokeStatus";
import { formatMoney, fromMinor, toMinor } from "../../lib/format";
import { fmtDate } from "../../lib/orderStatus";
import { usePageMeta } from "../../lib/usePageMeta";

interface D {
  id: string; allowedNext: string[]; photos: string[];
  request: { reference: string; status: string; category: string; description: string; fabric: string | null; colour: string | null; unit: string; measurements: Record<string, number>; deadline: number | null; notes: string | null; createdAt: number; approvedAt: number | null; customer: { name: string; email: string; phone: string | null }; quote: { amountMinor: number; currency: string; note: string | null; sentAt: number | null } | null };
  messages: { author: string; body: string; at: number }[]; timeline: { status: string; note: string | null; at: number; actorEmail?: string | null }[];
  order: { id: string; number: string; status: string; totalMinor: number; currency: string } | null;
}
const label: Record<string, string> = { under_review: "Start review", awaiting_information: "Mark: waiting for customer", quotation_prepared: "Back to quotation", awaiting_approval: "Send quotation to customer", approved: "Record customer approval", in_production: "Start production", completed: "Mark completed", rejected: "Reject", cancelled: "Cancel" };

export default function AdminBespokeDetailPage() {
  const { id = "" } = useParams();
  usePageMeta("Bespoke request");
  const [d, setD] = useState<D | null>(null);
  const [msg, setMsg] = useState<Msg | null>(null);
  const [note, setNote] = useState("");
  const [say, setSay] = useState("");
  const [ask, setAsk] = useState(false);
  const [amount, setAmount] = useState("");
  const [qnote, setQnote] = useState("");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => { api<D>(`/api/admin/bespoke/${id}`).then((x) => { setD(x); if (x.request.quote) { setAmount(fromMinor(x.request.quote.amountMinor)); setQnote(x.request.quote.note ?? ""); } }).catch((e) => setMsg({ ok: false, text: errText(e) })); }, [id]);
  useEffect(load, [load]);
  const run = async (fn: () => Promise<unknown>, ok: string, after?: () => void) => { setBusy(true); setMsg(null); try { await fn(); setMsg({ ok: true, text: ok }); after?.(); load(); } catch (e) { setMsg({ ok: false, text: errText(e) }); } finally { setBusy(false); } };

  if (!d) return msg ? <Notice msg={msg} /> : <p role="status">Loading…</p>;
  const r = d.request;
  const closed = FINAL_STATUSES.includes(r.status);
  const wa = (r.customer.phone ?? "").replace(/\D/g, "");
  return (
    <>
      <Link to="/admin/bespoke" className="link-line text-sm">← All requests</Link>
      <h1 className="mt-2 text-4xl">{r.category} <span className="text-2xl text-royal/60">{r.reference}</span></h1>
      <p className="mt-1 text-royal/75">{staffStatus[r.status]} · received {fmtDate(r.createdAt)}{r.approvedAt ? ` · approved ${fmtDate(r.approvedAt)}` : ""}</p>

      <section className="mt-8 grid gap-8 md:grid-cols-2">
        <div>
          <h2 className="!text-2xl">Customer</h2>
          <p className="mt-2 text-sm">{r.customer.name}<br /><a className="link-line" href={`mailto:${r.customer.email}`}>{r.customer.email}</a><br />{r.customer.phone && <><a className="link-line" href={`tel:${r.customer.phone}`}>{r.customer.phone}</a>{wa && <> · <a className="link-line" href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer">WhatsApp</a></>}</>}</p>
          <h2 className="mt-6 !text-2xl">The request</h2>
          <p className="mt-2 whitespace-pre-line text-sm">{r.description}</p>
          <dl className="mt-3 space-y-1 text-sm">
            {r.fabric && <div><dt className="inline font-medium">Fabric: </dt><dd className="inline">{r.fabric}</dd></div>}
            {r.colour && <div><dt className="inline font-medium">Colour: </dt><dd className="inline">{r.colour}</dd></div>}
            {r.deadline && <div><dt className="inline font-medium">Needed by: </dt><dd className="inline">{new Date(r.deadline * 1000).toLocaleDateString()}</dd></div>}
            {Object.entries(r.measurements).map(([k, n]) => <div key={k}><dt className="inline font-medium">{MEASURE_LABELS[k] ?? k}: </dt><dd className="inline">{n} {r.unit}</dd></div>)}
            {r.notes && <div><dt className="inline font-medium">Note: </dt><dd className="inline">{r.notes}</dd></div>}
          </dl>
        </div>
        <div>
          <h2 className="!text-2xl">Reference photos</h2>
          {d.photos.length === 0 && <p className="mt-2 text-sm text-royal/70">None attached.</p>}
          <ul className="mt-2 grid grid-cols-2 gap-3">{d.photos.map((u) => <li key={u}><a href={u} target="_blank" rel="noopener noreferrer"><img src={u} alt="Customer reference" className="aspect-[4/5] w-full bg-powder object-cover" /></a></li>)}</ul>
        </div>
      </section>

      <section className="mt-10 max-w-xl space-y-4" aria-labelledby="act">
        <h2 id="act" className="!text-2xl">Actions</h2>
        {!closed && ["submitted", "under_review", "awaiting_information", "quotation_prepared", "awaiting_approval"].includes(r.status) && (
          <div className="border border-dashed border-gold p-4">
            <h3 className="!text-xl">Quotation</h3>
            <p className="mt-1 text-xs text-royal/70">The customer cannot see it until you send it for approval.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2"><FormField label="Price (₦)" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} /><FormField label="Note to customer (optional)" value={qnote} maxLength={600} onChange={(e) => setQnote(e.target.value)} /></div>
            <button type="button" className="btn-ghost mt-3" disabled={busy} onClick={() => { const m = toMinor(amount); if (m === null || m < 100) { setMsg({ ok: false, text: "Enter the price as a number, e.g. 65000." }); return; } void run(() => api(`/api/admin/bespoke/${id}/quote`, { method: "PUT", body: { amountMinor: m, note: qnote || undefined } }), "Quotation saved."); }}>Save quotation</button>
            {r.quote && <p className="mt-2 text-sm">Saved: {formatMoney(r.quote.amountMinor)}{r.quote.sentAt ? ` (sent ${fmtDate(r.quote.sentAt)})` : " (not sent yet)"}</p>}
          </div>
        )}
        <FormField label="Note for the history (optional)" value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} />
        <div className="flex flex-wrap gap-3">
          {d.allowedNext.map((s) => (
            <button key={s} type="button" disabled={busy} className={["rejected", "cancelled"].includes(s) ? "btn-ghost" : "btn-primary"}
              onClick={() => { if (["rejected", "cancelled"].includes(s) && !window.confirm(`${label[s]}?`)) return; void run(() => api(`/api/admin/bespoke/${id}/status`, { method: "PUT", body: { status: s, note: note || undefined } }), "Updated.", () => setNote("")); }}>{label[s] ?? s}</button>
          ))}
          {r.status === "approved" && !d.order && <button type="button" className="btn-primary" disabled={busy} onClick={() => void run(() => api(`/api/admin/bespoke/${id}/convert`, { method: "POST", body: {} }), "Order created. The customer can now pay from their request page.")}>Convert to order</button>}
        </div>
        {d.order && <p className="text-sm">Order <Link className="link-line" to={`/admin/orders/${d.order.id}`}>{d.order.number}</Link>: {d.order.status} · {formatMoney(d.order.totalMinor, d.order.currency)}</p>}
        <Notice msg={msg} />
        <div className="border-t border-dashed border-gold pt-4">
          <button type="button" className="link-line text-sm" disabled={busy} onClick={() => void run(async () => { const x = await api<{ path: string }>(`/api/admin/bespoke/${id}/new-link`, { method: "POST", body: {} }); setLink(window.location.origin + x.path); }, "New link created. The old link no longer works.")}>Create a new private link for the customer</button>
          {link && <p className="mt-2 break-all rounded-sm bg-powder p-2 text-xs">{link}</p>}
          {link && wa && <a className="link-line mt-2 inline-block text-sm" target="_blank" rel="noopener noreferrer" href={`https://wa.me/${wa}?text=${encodeURIComponent(`Hello ${r.customer.name}, here is your bespoke request page: ${link}`)}`}>Send it on WhatsApp</a>}
        </div>
      </section>

      <section className="mt-10 grid gap-8 md:grid-cols-2">
        <div>
          <h2 className="!text-2xl">Messages</h2>
          <ul className="mt-3 space-y-2">{d.messages.map((m, i) => <li key={i} className={`p-3 text-sm ${m.author === "staff" ? "bg-powder" : "border border-gold"}`}><span className="block text-xs text-royal/60">{m.author === "staff" ? "You" : r.customer.name} · {fmtDate(m.at)}</span>{m.body}</li>)}{d.messages.length === 0 && <li className="text-sm text-royal/70">No messages yet.</li>}</ul>
          {!closed && (
            <div className="mt-3 space-y-2">
              <FormField label="Message to the customer" value={say} maxLength={1000} onChange={(e) => setSay(e.target.value)} />
              {["submitted", "under_review"].includes(r.status) && <CheckField label="This is a question: wait for their reply" checked={ask} onChange={(e) => setAsk(e.target.checked)} />}
              <button type="button" className="btn-primary" disabled={busy || say.trim().length < 2} onClick={() => void run(() => api(`/api/admin/bespoke/${id}/message`, { method: "POST", body: { body: say, askForInformation: ask } }), "Message sent.", () => { setSay(""); setAsk(false); })}>Send message</button>
            </div>
          )}
        </div>
        <div>
          <h2 className="!text-2xl">History</h2>
          <ol className="mt-3 space-y-2 border-l border-dashed border-gold pl-4 text-sm">{d.timeline.map((t, i) => <li key={i}>{staffStatus[t.status] ?? t.status} <span className="text-royal/60">· {fmtDate(t.at)}{t.actorEmail ? ` · ${t.actorEmail}` : ""}</span>{t.note && <span className="block text-royal/80">{t.note}</span>}</li>)}</ol>
        </div>
      </section>
    </>
  );
}
