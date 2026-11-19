import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Notice, errText, type Msg } from "../../components/admin/kit";
import { FormField } from "../../components/FormField";
import { api } from "../../lib/api";
import { formatMoney } from "../../lib/format";
import { fmtDate, orderStatusLabel } from "../../lib/orderStatus";
import { usePageMeta } from "../../lib/usePageMeta";

interface Detail {
  order: { id: string; number: string; status: string; currency: string; subtotalMinor: number; discountMinor: number; shippingMinor: number; totalMinor: number; promotionCode: string | null; name: string | null; email: string | null; phone: string | null; giftMessage: string | null; notes: string | null; createdAt: number; paidAt: number | null; address: { recipientName: string; line1: string; line2: string; city: string; state: string; postalCode: string } | null };
  items: { name: string; sku: string; size: string; colour: string; unitMinor: number; qty: number; lineMinor: number }[];
  payments: { id: string; provider: string; reference: string; amountMinor: number; currency: string; status: string; verifiedAt: number | null; createdAt: number }[];
  events: { fromStatus: string | null; toStatus: string; note: string | null; at: number; actorEmail: string | null }[];
  allowedNext: string[];
}
const actionLabel: Record<string, string> = { fulfilling: "Start preparing", completed: "Mark completed", paid_verified: "Back to paid", refunded: "Mark refunded", cancelled: "Cancel order" };

export default function AdminOrderPage() {
  const { id = "" } = useParams();
  usePageMeta("Order");
  const [d, setD] = useState<Detail | null>(null);
  const [msg, setMsg] = useState<Msg | null>(null);
  const [note, setNote] = useState("");
  const [paidNote, setPaidNote] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => { api<Detail>(`/api/admin/orders/${id}`).then(setD).catch((e) => setMsg({ ok: false, text: errText(e) })); }, [id]);
  useEffect(load, [load]);

  const run = async (fn: () => Promise<unknown>, okText: string) => {
    setBusy(true);
    setMsg(null);
    try { await fn(); setMsg({ ok: true, text: okText }); setNote(""); setPaidNote(""); load(); } catch (e) { setMsg({ ok: false, text: errText(e) }); } finally { setBusy(false); }
  };

  if (!d) return msg ? <Notice msg={msg} /> : <p role="status">Loading…</p>;
  const o = d.order;
  const money = (n: number) => formatMoney(n, o.currency);
  const waPhone = (o.phone ?? "").replace(/\D/g, "");
  return (
    <>
      <Link to="/admin/orders" className="link-line text-sm">← All orders</Link>
      <h1 className="mt-2 text-4xl">{o.number}</h1>
      <p className="mt-1 text-royal/75">{orderStatusLabel[o.status] ?? o.status} · placed {fmtDate(o.createdAt)}{o.paidAt ? ` · paid ${fmtDate(o.paidAt)}` : ""}</p>
      {o.notes && <p role="alert" className="mt-3 whitespace-pre-line border border-gold bg-gold/10 p-3 text-sm">{o.notes}</p>}

      <section className="mt-8 grid gap-8 md:grid-cols-2">
        <div>
          <h2 className="!text-2xl">Customer</h2>
          <p className="mt-2 text-sm">{o.name}<br />{o.email && <a className="link-line" href={`mailto:${o.email}`}>{o.email}</a>}<br />{o.phone && <><a className="link-line" href={`tel:${o.phone}`}>{o.phone}</a>{waPhone && <> · <a className="link-line" href={`https://wa.me/${waPhone}`} target="_blank" rel="noopener noreferrer">WhatsApp</a></>}</>}</p>
          {o.address && <p className="mt-3 text-sm"><strong>Deliver to</strong><br />{o.address.recipientName}<br />{o.address.line1}{o.address.line2 ? `, ${o.address.line2}` : ""}<br />{o.address.city}, {o.address.state} {o.address.postalCode}</p>}
          {o.giftMessage && <p className="mt-3 text-sm"><strong>Gift message:</strong> {o.giftMessage}</p>}
        </div>
        <div>
          <h2 className="!text-2xl">Items</h2>
          <ul className="mt-2 divide-y divide-dashed divide-gold/60 text-sm">
            {d.items.map((i, n) => <li key={n} className="flex justify-between gap-3 py-2"><span>{i.qty} × {i.name}{[i.size, i.colour].filter(Boolean).length > 0 && ` (${[i.size, i.colour].filter(Boolean).join(", ")})`}<span className="block text-xs text-royal/60">{i.sku}</span></span><span>{money(i.lineMinor)}</span></li>)}
          </ul>
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{money(o.subtotalMinor)}</dd></div>
            {o.discountMinor > 0 && <div className="flex justify-between"><dt>Discount {o.promotionCode}</dt><dd>−{money(o.discountMinor)}</dd></div>}
            <div className="flex justify-between"><dt>Delivery</dt><dd>{money(o.shippingMinor)}</dd></div>
            <div className="flex justify-between border-t border-dashed border-gold pt-2 font-medium"><dt>Total</dt><dd>{money(o.totalMinor)}</dd></div>
          </dl>
        </div>
      </section>

      <section className="mt-10 max-w-xl space-y-4" aria-labelledby="act">
        <h2 id="act" className="!text-2xl">Actions</h2>
        <FormField label="Note for the history (optional)" value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} />
        <div className="flex flex-wrap gap-3">
          {d.allowedNext.map((s) => (
            <button key={s} type="button" className={s === "cancelled" || s === "refunded" ? "btn-ghost" : "btn-primary"} disabled={busy}
              onClick={() => { if ((s === "cancelled" || s === "refunded") && !window.confirm(`${actionLabel[s]}?`)) return; void run(() => api(`/api/admin/orders/${id}/status`, { method: "PUT", body: { status: s, note: note || undefined } }), "Updated."); }}>
              {actionLabel[s] ?? s}
            </button>
          ))}
          <button type="button" className="btn-ghost" disabled={busy || note.trim().length < 2} onClick={() => void run(() => api(`/api/admin/orders/${id}/note`, { method: "POST", body: { note } }), "Note added.")}>Add note only</button>
        </div>
        {d.allowedNext.includes("refunded") && <p className="text-xs text-royal/70">Refunds are paid back from your Paystack dashboard. “Mark refunded” only records it here.</p>}
        {o.status === "unpaid" && (
          <div className="border border-dashed border-gold p-4">
            <h3 className="!text-xl">Paid another way?</h3>
            <p className="mt-1 text-sm text-royal/75">Only use this after you have seen the money yourself (bank transfer, cash). It is recorded with your name.</p>
            <div className="mt-3"><FormField label="How was it paid?" value={paidNote} maxLength={200} onChange={(e) => setPaidNote(e.target.value)} hint="For example: Bank transfer, seen on statement 12 Nov." /></div>
            <button type="button" className="btn-primary mt-3" disabled={busy || paidNote.trim().length < 3}
              onClick={() => { if (window.confirm("Confirm that you have received this payment?")) void run(() => api(`/api/admin/orders/${id}/mark-paid`, { method: "POST", body: { note: paidNote } }), "Marked as paid."); }}>Mark as paid</button>
          </div>
        )}
        <Notice msg={msg} />
      </section>

      <section className="mt-10 grid gap-8 md:grid-cols-2">
        <div>
          <h2 className="!text-2xl">Payments</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {d.payments.map((p) => <li key={p.id} className="border border-dashed border-gold/70 p-3">{p.provider} · <strong>{p.status}</strong> · {formatMoney(p.amountMinor, p.currency)}<span className="block break-all text-xs text-royal/60">{p.reference}</span></li>)}
          </ul>
        </div>
        <div>
          <h2 className="!text-2xl">History</h2>
          <ol className="mt-2 space-y-2 border-l border-dashed border-gold pl-4 text-sm">
            {d.events.map((e, n) => <li key={n}>{orderStatusLabel[e.toStatus] ?? e.toStatus} <span className="text-royal/60">· {fmtDate(e.at)}{e.actorEmail ? ` · ${e.actorEmail}` : ""}</span>{e.note && <span className="block text-royal/80">{e.note}</span>}</li>)}
          </ol>
        </div>
      </section>
    </>
  );
}
