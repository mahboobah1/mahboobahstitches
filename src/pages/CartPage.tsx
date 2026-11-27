import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ProductImage } from "../components/ProductImage";
import { MAX_CART_QTY, useStore } from "../context/StoreContext";
import { api } from "../lib/api";
import { formatMoney } from "../lib/format";
import { usePageMeta } from "../lib/usePageMeta";
import { cartSummaryLink } from "../lib/whatsapp";

export default function CartPage() {
  usePageMeta("Your cart");
  const { lines, gifts, removeGift, setQty, removeFromCart, clearCart } = useStore();
  const [payOnline, setPayOnline] = useState(false);
  useEffect(() => { api<{ paymentsEnabled: boolean }>("/api/checkout/config").then((c) => setPayOnline(c.paymentsEnabled)).catch(() => setPayOnline(false)); }, []);

  if (lines.length === 0 && gifts.length === 0) {
    return (
      <div className="wrap py-20 text-center">
        <h1 className="text-4xl">Your cart is empty.</h1>
        <p className="mt-3 text-royal/80">Choose a size and colour on any product, or build a gift in the Gift Studio.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3"><Link to="/shop" className="btn-primary">Browse the shop</Link><Link to="/gift-studio" className="btn-ghost">Gift Studio</Link></div>
      </div>
    );
  }
  const itemsTotal = lines.reduce((sum, l) => sum + l.variant.priceMinor * l.qty, 0);
  const giftsTotal = gifts.reduce((s, g) => s + g.estimateMinor, 0);
  const onRequest = lines.some((l) => l.variant.priceMinor === 0);

  return (
    <div className="wrap py-10 sm:py-14">
      <h1 className="text-4xl sm:text-5xl">Your cart</h1>
      <div className="mt-8 grid gap-10 lg:grid-cols-[1.6fr_1fr]">
        <ul className="divide-y divide-dashed divide-gold border-y border-dashed border-gold">
          {lines.map((l) => (
            <li key={l.variant.id} className="grid grid-cols-[88px_1fr] gap-4 py-5">
              <ProductImage product={l.product} className="aspect-[4/5] w-full" />
              <div>
                <Link to={`/product/${l.product.slug}`} className="font-display text-xl">{l.product.name}</Link>
                <p className="text-sm text-royal/75">{[l.variant.size, l.variant.colour].filter(Boolean).join(" · ")} {l.variant.size || l.variant.colour ? "· " : ""}Ref {l.variant.sku}</p>
                <p className="mt-1 text-sm">{formatMoney(l.variant.priceMinor, l.variant.currency)}</p>
                <div className="mt-3 flex flex-wrap items-center gap-4">
                  <div className="flex items-center">
                    <button type="button" className="btn h-11 w-11 border border-royal/30 !px-0" aria-label={`Decrease quantity of ${l.product.name}`} onClick={() => setQty(l.variant.id, l.qty - 1)} disabled={l.qty <= 1}>−</button>
                    <span className="w-10 text-center" aria-live="polite">{l.qty}</span>
                    <button type="button" className="btn h-11 w-11 border border-royal/30 !px-0" aria-label={`Increase quantity of ${l.product.name}`} onClick={() => setQty(l.variant.id, l.qty + 1)} disabled={l.qty >= MAX_CART_QTY}>+</button>
                  </div>
                  <button type="button" className="link-line text-sm" onClick={() => removeFromCart(l.variant.id)}>Remove</button>
                </div>
              </div>
            </li>
          ))}
          {gifts.map((g) => (
            <li key={g.id} className="py-5">
              <p className="font-display text-xl">{g.bundleName} <span className="text-sm text-royal/70">(gift)</span></p>
              <ul className="mt-1 list-disc pl-5 text-sm text-royal/80">{g.contents.map((c, i) => <li key={i}>{c}</li>)}</ul>
              {g.packagingName && <p className="mt-1 text-sm">Packaging: {g.packagingName}</p>}
              {g.recipientName && <p className="text-sm">For: {g.recipientName}</p>}
              {g.message && <p className="text-sm">Message: “{g.message}”</p>}
              <p className="mt-1 text-sm">About {formatMoney(g.estimateMinor)}</p>
              <button type="button" className="link-line mt-2 text-sm" onClick={() => removeGift(g.id)}>Remove gift</button>
            </li>
          ))}
        </ul>

        <aside className="h-fit bg-powder p-6" aria-label="Order summary">
          <h2 className="text-2xl">Summary</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><dt>Items</dt><dd>{lines.reduce((n, l) => n + l.qty, 0) + gifts.length}</dd></div>
            <div className="flex justify-between"><dt>{gifts.length ? "Estimated subtotal" : "Subtotal"}</dt><dd>{onRequest ? "Price on request" : formatMoney(itemsTotal + giftsTotal, lines[0]?.variant.currency)}</dd></div>
            <div className="flex justify-between"><dt>Delivery</dt><dd>Chosen at checkout</dd></div>
          </dl>
          {gifts.length > 0 && <p className="mt-2 text-xs text-royal/70">Gift prices and savings are confirmed at checkout.</p>}
          <a href={cartSummaryLink(lines, gifts)} target="_blank" rel="noopener noreferrer" className={`${payOnline && !onRequest ? "btn-ghost" : "btn-primary"} mt-6 w-full`}>Send order summary on WhatsApp</a>
          <p className="mt-2 text-xs text-royal/70">This sends an enquiry. It is not a paid order until payment is confirmed.</p>
          {payOnline && !onRequest ? <Link to="/checkout" className="btn-primary mt-3 w-full">Checkout and pay online</Link>
            : <p className="mt-3 text-xs text-royal/70">{onRequest ? "Remove items marked “Price on request” to pay online, or order through WhatsApp." : "Online payment is not switched on yet. Please order through WhatsApp."}</p>}
          <button type="button" className="link-line mt-4 text-sm" onClick={clearCart}>Empty cart</button>
        </aside>
      </div>
    </div>
  );
}
