import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { FormError } from "../components/FormField";
import { useStore } from "../context/StoreContext";
import { api } from "../lib/api";
import { formatMoney } from "../lib/format";
import { fmtDate, isPaidStatus, orderStatusLabel } from "../lib/orderStatus";
import { usePageMeta } from "../lib/usePageMeta";
import { generalEnquiryLink } from "../lib/whatsapp";

interface View {
  order: { number: string; status: string; currency: string; subtotalMinor: number; discountMinor: number; shippingMinor: number; totalMinor: number; promotionCode: string | null; createdAt: number; paidAt: number | null; giftMessage: string | null; customer: { name: string | null; email: string | null }; address: { recipientName: string; line1: string; line2: string; city: string; state: string; postalCode: string } | null };
  items: { name: string; sku: string; size: string; colour: string; unitMinor: number; qty: number; lineMinor: number }[];
  payment: { status: string; provider: string } | null;
  timeline: { status: string; at: number }[];
}

export default function OrderPage() {
  const { number = "" } = useParams();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const returned = params.has("reference") || params.has("trxref");
  usePageMeta(`Order ${number}`);
  const { clearCart } = useStore();
  const [view, setView] = useState<View | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const tries = useRef(0);
  const q = token ? `?token=${encodeURIComponent(token)}` : "";

  // Asks our server, which asks the payment provider. The redirect alone proves nothing.
  const check = useCallback(async () => {
    try {
      const v = await api<View>(`/api/orders/${encodeURIComponent(number)}/verify${q}`, { method: "POST", body: {} });
      setView(v);
      setError("");
      return v;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load this order.");
      return null;
    }
  }, [number, q]);

  useEffect(() => {
    let alive = true;
    let timer = 0;
    const run = async () => {
      const v = await check();
      if (!alive || !v) return;
      if (isPaidStatus(v.order.status)) { clearCart(); return; }
      // Just back from the payment page and not confirmed yet: look again a few times.
      if (returned && v.order.status === "unpaid" && tries.current < 4) { tries.current++; timer = window.setTimeout(run, 3000); }
    };
    void run();
    return () => { alive = false; window.clearTimeout(timer); };
  }, [check, returned, clearCart]);

  const payAgain = async () => {
    setBusy(true);
    setError("");
    try {
      const r = await api<{ authorizationUrl: string }>(`/api/orders/${encodeURIComponent(number)}/pay${q}`, { method: "POST", body: {} });
      window.location.href = r.authorizationUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start the payment.");
      setBusy(false);
    }
  };

  if (!view) {
    return (
      <div className="wrap max-w-xl py-20 text-center">
        {error ? <FormError message={error} /> : <p role="status">Loading your order…</p>}
        {error && <Link to="/shop" className="btn-ghost mt-6">Back to the shop</Link>}
      </div>
    );
  }
  const o = view.order;
  const paid = isPaidStatus(o.status);
  const money = (n: number) => formatMoney(n, o.currency);
  const heading = paid ? "Thank you. Your payment is confirmed." : o.status === "unpaid" ? "We have not received your payment yet." : o.status === "cancelled" ? "This order has expired." : `Order ${orderStatusLabel[o.status] ?? o.status}`;

  return (
    <div className="wrap max-w-3xl py-10 sm:py-14">
      <p className="text-sm text-royal/70">Order {o.number} · placed {fmtDate(o.createdAt)}</p>
      <h1 className="mt-1 text-4xl sm:text-5xl">{heading}</h1>
      <p className="mt-3 inline-block border border-dashed border-gold px-2 py-1 text-sm" role="status">Status: {orderStatusLabel[o.status] ?? o.status}</p>

      {o.status === "unpaid" && (
        <div className="mt-6 space-y-3">
          <p className="text-royal/85">{view.payment?.status === "failed" ? "The payment did not go through." : "If you have just paid, it can take a moment to confirm."} Your items are held for a short time.</p>
          <div className="flex flex-wrap gap-3">
            <button type="button" className="btn-primary" onClick={payAgain} disabled={busy}>{busy ? "Please wait…" : "Pay now"}</button>
            <button type="button" className="btn-ghost" onClick={() => void check()}>I have paid, check again</button>
          </div>
        </div>
      )}
      {o.status === "cancelled" && <p className="mt-6">The hold on your items ran out before payment. <Link to="/cart" className="link-line">Go back to your cart</Link> to order again.</p>}
      {paid && <p className="mt-6 text-royal/85">We will contact you about delivery. Keep this page or the link in your email to follow your order.</p>}
      <FormError message={error} />

      <h2 className="mt-10 !text-2xl">Items</h2>
      <ul className="mt-3 divide-y divide-dashed divide-gold border-y border-dashed border-gold text-sm">
        {view.items.map((i, n) => (
          <li key={n} className="flex justify-between gap-3 py-3">
            <span>{i.qty} × {i.name}{[i.size, i.colour].filter(Boolean).length > 0 && ` (${[i.size, i.colour].filter(Boolean).join(", ")})`}<span className="block text-xs text-royal/60">Ref {i.sku}</span></span>
            <span>{money(i.lineMinor)}</span>
          </li>
        ))}
      </ul>
      <dl className="mt-4 ml-auto max-w-xs space-y-1 text-sm">
        <div className="flex justify-between"><dt>Subtotal</dt><dd>{money(o.subtotalMinor)}</dd></div>
        {o.discountMinor > 0 && <div className="flex justify-between"><dt>Discount {o.promotionCode ? `(${o.promotionCode})` : ""}</dt><dd>−{money(o.discountMinor)}</dd></div>}
        <div className="flex justify-between"><dt>Delivery</dt><dd>{o.shippingMinor > 0 ? money(o.shippingMinor) : "Confirmed by us"}</dd></div>
        <div className="flex justify-between border-t border-dashed border-gold pt-2 text-base font-medium"><dt>Total</dt><dd>{money(o.totalMinor)}</dd></div>
      </dl>

      {o.address && (
        <>
          <h2 className="mt-10 !text-2xl">Delivery to</h2>
          <p className="mt-2 text-sm">{o.address.recipientName}<br />{o.address.line1}{o.address.line2 ? `, ${o.address.line2}` : ""}<br />{o.address.city}, {o.address.state} {o.address.postalCode}</p>
        </>
      )}
      {o.giftMessage && <p className="mt-4 text-sm"><strong>Gift message:</strong> {o.giftMessage}</p>}

      <a href={generalEnquiryLink(`I have a question about my order ${o.number}.`)} target="_blank" rel="noopener noreferrer" className="btn-ghost mt-10">Ask about this order on WhatsApp</a>
    </div>
  );
}
