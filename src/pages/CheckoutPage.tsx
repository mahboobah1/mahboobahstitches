import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { FormError, FormField } from "../components/FormField";
import { useAuth } from "../context/AuthContext";
import { useStore } from "../context/StoreContext";
import { api, ApiError } from "../lib/api";
import { formatMoney } from "../lib/format";
import { usePageMeta } from "../lib/usePageMeta";
import { cartSummaryLink } from "../lib/whatsapp";

interface Config { paymentsEnabled: boolean; mode: "test" | "live" | null; deliveryFeeMinor: number; deliveryNote: string }
interface QuoteLine { variantId: string | null; name: string; size: string; colour: string; unitMinor: number; qty: number; giftIndex: number | null }
interface RateOpt { id: string; name: string; priceMinor: number; baseMinor: number; minDays: number | null; maxDays: number | null }
interface Quote { currency: string; subtotalMinor: number; discountMinor: number; bundleDiscountMinor: number; deliveryMinor: number; totalMinor: number; promoCode: string | null; lines: QuoteLine[]; gifts: { index: number; bundleName: string; packagingName: string | null; message: string | null }[]; issues: { variantId: string | null; message: string }[]; shipping: { configured: boolean; selectedId: string | null; options: RateOpt[] } }
interface SavedAddress { recipientName: string; phone: string | null; line1: string; line2: string | null; city: string; state: string; postalCode: string | null; countryCode?: string }

const STATES = ["Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno","Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT Abuja","Gombe","Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto","Taraba","Yobe","Zamfara"];

export default function CheckoutPage() {
  usePageMeta("Checkout");
  const { lines, gifts, clearCart } = useStore();
  const { user } = useAuth();
  const [cfg, setCfg] = useState<Config | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState("");
  const [promoError, setPromoError] = useState("");
  const [f, setF] = useState({ name: "", email: "", phone: "", line1: "", line2: "", city: "", state: "", postalCode: "", giftMessage: "", notes: "" });
  const [country, setCountry] = useState("NG");
  const [countries, setCountries] = useState<string[]>(["NG"]);
  const [rateId, setRateId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const prefilled = useRef(false);
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => { api<{ countries: string[] }>("/api/shipping/countries").then((c) => { setCountries(c.countries); if (!c.countries.includes("NG") && c.countries[0]) setCountry(c.countries[0]); }).catch(() => undefined); }, []);
  useEffect(() => { api<Config>("/api/checkout/config").then(setCfg).catch(() => setCfg({ paymentsEnabled: false, mode: null, deliveryFeeMinor: 0, deliveryNote: "" })); }, []);

  // Fill in what we already know for a signed-in customer.
  useEffect(() => {
    if (!user || prefilled.current) return;
    prefilled.current = true;
    setF((p) => ({ ...p, name: p.name || user.fullName, email: p.email || user.email }));
    api<{ addresses: SavedAddress[] }>("/api/account/addresses").then((d) => {
      const a = d.addresses[0];
      if (a) setF((p) => ({ ...p, name: a.recipientName, phone: p.phone || a.phone || "", line1: a.line1, line2: a.line2 ?? "", city: a.city, state: a.state, postalCode: a.postalCode ?? "" }));
    }).catch(() => undefined);
  }, [user]);

  // The server prices the cart. The browser only shows what the server says.
  const items = lines.map((l) => ({ variantId: l.variant.id, qty: l.qty }));
  const giftsPayload = gifts.map((g) => ({ bundleId: g.bundleId, selections: g.selections, packagingId: g.packagingId, message: g.message || undefined, recipientName: g.recipientName || undefined }));
  const itemsKey = JSON.stringify([items, giftsPayload, country, f.state, rateId]);
  useEffect(() => {
    if (items.length === 0 && giftsPayload.length === 0) return;
    let alive = true;
    api<Quote>("/api/checkout/quote", { method: "POST", body: { items, gifts: giftsPayload, promoCode: promo || undefined, shipping: { country, state: f.state, rateId: rateId || undefined } } })
      .then((q) => { if (alive && q.shipping.configured) { const only = q.shipping.options; if (rateId && !only.some((o) => o.id === rateId)) setRateId(""); else if (!rateId && only.length === 1) setRateId(only[0].id); } return q; })
      .then((q) => { if (alive) { setQuote(q); setPromoError(""); } })
      .catch((e) => {
        if (!alive) return;
        if (promo) { setPromoError(e instanceof Error ? e.message : "That code could not be used."); setPromo(""); }
        else setError(e instanceof Error ? e.message : "Could not price your cart.");
      });
    return () => { alive = false; };
  }, [itemsKey, promo]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const r = await api<{ authorizationUrl: string; orderNumber: string }>("/api/checkout", {
        method: "POST",
        body: {
          items, gifts: giftsPayload, shippingRateId: rateId || undefined, promoCode: promo || undefined, name: f.name, email: f.email, phone: f.phone, giftMessage: f.giftMessage || undefined, notes: f.notes || undefined,
          address: { line1: f.line1, line2: f.line2 || undefined, city: f.city, state: f.state, postalCode: f.postalCode || undefined, countryCode: country },
        },
      });
      // Go to Paystack's own page. Card details never touch this website.
      window.location.href = r.authorizationUrl;
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : "Could not start the payment.");
      setBusy(false);
    }
  };

  if (lines.length === 0 && gifts.length === 0) {
    return (
      <div className="wrap py-20 text-center">
        <h1 className="text-4xl">Your cart is empty.</h1>
        <Link to="/shop" className="btn-primary mt-7">Browse the shop</Link>
      </div>
    );
  }
  if (cfg && !cfg.paymentsEnabled) {
    return (
      <div className="wrap max-w-xl py-16 text-center">
        <h1 className="text-4xl">Order through WhatsApp</h1>
        <p className="mt-4 text-royal/85">Online payment is not switched on yet. Send your cart to us on WhatsApp and we will confirm the total and how to pay.</p>
        <a href={cartSummaryLink(lines, gifts)} target="_blank" rel="noopener noreferrer" className="btn-primary mt-7">Send order summary on WhatsApp</a>
        <p className="mt-3 text-xs text-royal/60">This is an enquiry, not a paid order.</p>
      </div>
    );
  }

  const money = (n: number) => formatMoney(n, quote?.currency);
  return (
    <div className="wrap py-10 sm:py-14">
      <h1 className="text-4xl sm:text-5xl">Checkout</h1>
      {cfg?.mode === "test" && (
        <p role="status" className="mt-4 border border-dashed border-gold bg-gold/10 p-3 text-sm">Test mode: payments here are practice only and no real money is taken.</p>
      )}
      <div className="mt-8 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <form onSubmit={submit} className="space-y-5" noValidate>
          <h2 className="!text-2xl">Your details</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="Full name" autoComplete="name" value={f.name} onChange={(e) => set("name", e.target.value)} required />
            <FormField label="Phone" type="tel" autoComplete="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} hint="So the delivery rider can reach you." required />
          </div>
          <FormField label="Email" type="email" autoComplete="email" value={f.email} onChange={(e) => set("email", e.target.value)} hint="Your payment receipt and order link are sent here by Paystack." required />
          <h2 className="!text-2xl pt-2">Delivery address</h2>
          {countries.length > 1 && (
            <div><label htmlFor="co" className="mb-1 block text-sm">Country</label>
              <select id="co" className="field" value={country} onChange={(e) => { setCountry(e.target.value); setRateId(""); }}>
                {countries.map((c) => <option key={c} value={c}>{(() => { try { return new Intl.DisplayNames(["en"], { type: "region" }).of(c) ?? c; } catch { return c; } })()}</option>)}
              </select></div>
          )}
          <FormField label="Street address" autoComplete="address-line1" value={f.line1} onChange={(e) => set("line1", e.target.value)} required />
          <FormField label="Apartment, landmark (optional)" autoComplete="address-line2" value={f.line2} onChange={(e) => set("line2", e.target.value)} />
          <div className="grid gap-5 sm:grid-cols-3">
            <FormField label="City or town" autoComplete="address-level2" value={f.city} onChange={(e) => set("city", e.target.value)} required />
            <FormField label={country === "NG" ? "State" : "State or region (optional)"} list={country === "NG" ? "ng-states" : undefined} autoComplete="address-level1" value={f.state} onChange={(e) => set("state", e.target.value)} required={country === "NG"} />
            <FormField label="Postal code (optional)" autoComplete="postal-code" value={f.postalCode} onChange={(e) => set("postalCode", e.target.value)} />
          </div>
          <datalist id="ng-states">{STATES.map((s) => <option key={s} value={s} />)}</datalist>
          {quote?.shipping.configured && (
            <fieldset><legend className="mb-1 text-sm font-medium">Delivery option</legend>
              {quote.shipping.options.length === 0 && <p className="text-sm text-royal/75">Enter your address to see delivery options. If none appear, we do not deliver there online yet: <a className="link-line" href={cartSummaryLink(lines, gifts)} target="_blank" rel="noopener noreferrer">order on WhatsApp</a>.</p>}
              {quote.shipping.options.map((o) => (
                <label key={o.id} className="flex min-h-[44px] items-center gap-3 text-sm"><input type="radio" name="rate" checked={rateId === o.id} onChange={() => setRateId(o.id)} />
                  <span>{o.name} · {o.priceMinor === 0 ? "Free" : formatMoney(o.priceMinor, quote.currency)}{o.minDays !== null && o.maxDays !== null ? ` · ${o.minDays === o.maxDays ? o.minDays : `${o.minDays} to ${o.maxDays}`} days` : ""}</span></label>
              ))}
            </fieldset>
          )}
          <FormField label="Gift message (optional)" value={f.giftMessage} maxLength={300} onChange={(e) => set("giftMessage", e.target.value)} />
          <FormField label="Note to us (optional)" value={f.notes} maxLength={500} onChange={(e) => set("notes", e.target.value)} />
          <FormError message={error} />
          <button type="submit" className="btn-primary w-full sm:w-auto" disabled={busy || !cfg || !quote || quote.issues.length > 0 || (quote.shipping.configured && !rateId)}>
            {busy ? "Taking you to the payment page…" : `Pay ${quote ? money(quote.totalMinor) : ""} securely`}
          </button>
          <p className="text-xs text-royal/70">You will pay on Paystack's secure page. We never see or store your card details.</p>
        </form>

        <aside className="h-fit bg-powder p-6" aria-label="Order summary">
          <h2 className="!text-2xl">Summary</h2>
          {!quote && <p className="mt-4" role="status">Checking prices…</p>}
          {quote && (
            <>
              <ul className="mt-4 divide-y divide-dashed divide-gold/60 text-sm">
                {quote.lines.map((l, idx) => (
                  <li key={`${l.variantId}-${idx}`} className="flex justify-between gap-3 py-2">
                    <span>{l.qty} × {l.name}{[l.size, l.colour].filter(Boolean).length > 0 && ` (${[l.size, l.colour].filter(Boolean).join(", ")})`}</span>
                    <span>{money(l.unitMinor * l.qty)}</span>
                  </li>
                ))}
              </ul>
              {quote.issues.map((i, n) => <p key={n} role="alert" className="mt-3 text-sm text-[#9b2c2c]">{i.message}</p>)}
              {quote.issues.length > 0 && <Link to="/cart" className="link-line mt-2 inline-block text-sm">Go back to the cart</Link>}
              <div className="mt-4">
                <label htmlFor="promo" className="mb-1 block text-sm">Discount code</label>
                <div className="flex gap-2">
                  <input id="promo" className="field" value={promoInput} onChange={(e) => setPromoInput(e.target.value)} maxLength={30} />
                  <button type="button" className="btn-ghost" onClick={() => { setPromoError(""); setPromo(promoInput.trim()); }} disabled={!promoInput.trim()}>Apply</button>
                </div>
                {promoError && <p role="alert" className="mt-1 text-sm text-[#9b2c2c]">{promoError}</p>}
                {quote.promoCode && <p role="status" className="mt-1 text-sm">Code {quote.promoCode} applied.</p>}
              </div>
              <dl className="mt-4 space-y-1 text-sm">
                <div className="flex justify-between"><dt>Subtotal</dt><dd>{money(quote.subtotalMinor)}</dd></div>
                {quote.bundleDiscountMinor > 0 && <div className="flex justify-between"><dt>Gift saving</dt><dd>−{money(quote.bundleDiscountMinor)}</dd></div>}
                {quote.discountMinor - quote.bundleDiscountMinor > 0 && <div className="flex justify-between"><dt>Discount</dt><dd>−{money(quote.discountMinor - quote.bundleDiscountMinor)}</dd></div>}
                <div className="flex justify-between"><dt>Delivery</dt><dd>{quote.shipping.configured ? (quote.shipping.selectedId ? (quote.deliveryMinor > 0 ? money(quote.deliveryMinor) : "Free") : "Choose an option") : quote.deliveryMinor > 0 ? money(quote.deliveryMinor) : "Confirmed by us"}</dd></div>
                <div className="flex justify-between border-t border-dashed border-gold pt-2 text-base font-medium"><dt>Total</dt><dd>{money(quote.totalMinor)}</dd></div>
              </dl>
              {cfg?.deliveryNote && <p className="mt-3 text-xs text-royal/75">{cfg.deliveryNote}</p>}
            </>
          )}
          <button type="button" className="link-line mt-5 text-xs" onClick={clearCart}>Empty cart</button>
        </aside>
      </div>
    </div>
  );
}
