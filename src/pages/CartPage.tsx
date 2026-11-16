import { Link } from "react-router-dom";
import { ProductImage } from "../components/ProductImage";
import { MAX_CART_QTY, useStore } from "../context/StoreContext";
import { formatMoney } from "../lib/format";
import { usePageMeta } from "../lib/usePageMeta";
import { cartSummaryLink } from "../lib/whatsapp";
import { site } from "../config/site";

export default function CartPage() {
  usePageMeta("Your cart");
  const { lines, setQty, removeFromCart, clearCart } = useStore();

  if (lines.length === 0) {
    return (
      <div className="wrap py-20 text-center">
        <h1 className="text-4xl">Your cart is empty.</h1>
        <p className="mt-3 text-royal/80">Choose a size and colour on any product to add it here.</p>
        <Link to="/shop" className="btn-primary mt-7">Browse the shop</Link>
      </div>
    );
  }

  const total = lines.reduce((sum, l) => sum + l.variant.priceMinor * l.qty, 0);

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
                <p className="text-sm text-royal/75">{l.variant.size} · {l.variant.colour} · Ref {l.variant.sku}</p>
                <p className="mt-1 text-sm">{formatMoney(l.variant.priceMinor, l.variant.currency)}</p>
                <div className="mt-3 flex flex-wrap items-center gap-4">
                  <div className="flex items-center">
                    <button type="button" className="btn h-11 w-11 border border-royal/30 !px-0"
                      aria-label={`Decrease quantity of ${l.product.name}`}
                      onClick={() => setQty(l.variant.id, l.qty - 1)} disabled={l.qty <= 1}>−</button>
                    <span className="w-10 text-center" aria-live="polite">{l.qty}</span>
                    <button type="button" className="btn h-11 w-11 border border-royal/30 !px-0"
                      aria-label={`Increase quantity of ${l.product.name}`}
                      onClick={() => setQty(l.variant.id, l.qty + 1)} disabled={l.qty >= MAX_CART_QTY}>+</button>
                  </div>
                  <button type="button" className="link-line text-sm" onClick={() => removeFromCart(l.variant.id)}>Remove</button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="h-fit bg-powder p-6" aria-label="Order summary">
          <h2 className="text-2xl">Summary</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><dt>Items</dt><dd>{lines.reduce((n, l) => n + l.qty, 0)}</dd></div>
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatMoney(total, lines[0].variant.currency)}</dd></div>
            <div className="flex justify-between"><dt>Delivery</dt><dd>Confirmed at order</dd></div>
          </dl>
          <a href={cartSummaryLink(lines)} target="_blank" rel="noopener noreferrer" className="btn-primary mt-6 w-full">
            Send order summary on WhatsApp
          </a>
          <p className="mt-2 text-xs text-royal/70">
            This sends an enquiry. It is not a paid order until payment is confirmed.
          </p>
          {site.onlineCheckoutEnabled ? (
            <Link to="/checkout" className="btn-ghost mt-3 w-full">Continue to checkout</Link>
          ) : (
            <p className="mt-3 text-xs text-royal/70">Online card payment is coming soon.</p>
          )}
          <button type="button" className="link-line mt-4 text-sm" onClick={clearCart}>Empty cart</button>
        </aside>
      </div>
    </div>
  );
}
