import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { HeartIcon, WhatsAppIcon } from "../components/Icons";
import { PlaceholderImage } from "../components/PlaceholderImage";
import { ProductGrid } from "../components/ProductGrid";
import { useCatalogue } from "../context/CatalogueContext";
import { useStore } from "../context/StoreContext";
import { fulfilmentLabel, isOnRequest, priceLabel } from "../lib/format";
import { usePageMeta } from "../lib/usePageMeta";
import { productEnquiryLink } from "../lib/whatsapp";
import NotFoundPage from "./NotFoundPage";

export default function ProductPage() {
  const { slug = "" } = useParams();
  const { getProduct, getCollection, products, status } = useCatalogue();
  const product = getProduct(slug);
  const { addToCart, toggleWishlist, inWishlist } = useStore();
  const [size, setSize] = useState("");
  const [colour, setColour] = useState("");
  const [shot, setShot] = useState(0);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  usePageMeta(product?.name, product?.description);

  const sizes = useMemo(() => [...new Set((product?.variants ?? []).map((v) => v.size).filter(Boolean))], [product]);
  const colours = useMemo(() => [...new Set((product?.variants ?? []).map((v) => v.colour).filter(Boolean))], [product]);

  if (status === "loading") return <div className="wrap py-20 text-center" role="status">Loading…</div>;
  if (!product) return <NotFoundPage />;

  // A product may have no sizes or no colours at all; those choices are then not required.
  const needSize = sizes.length > 0;
  const needColour = colours.length > 0;
  const variant = product.variants.find((v) => (!needSize || v.size === size) && (!needColour || v.colour === colour));
  const ready = (!needSize || size !== "") && (!needColour || colour !== "");
  const chosen = ready ? variant : undefined;
  const collection = getCollection(product.collectionSlug);
  const related = products.filter((p) => p.collectionSlug === product.collectionSlug && p.id !== product.id).slice(0, 4);
  const prices = product.variants.map((v) => v.priceMinor);
  const currency = product.variants[0].currency;
  const image = product.images[Math.min(shot, product.images.length - 1)];
  const onRequest = isOnRequest((chosen ?? product.variants[0]).priceMinor);

  const optionAvailable = (s: string, c: string) =>
    product.variants.some((v) => v.available && (!s || v.size === s) && (!c || v.colour === c));

  const handleAdd = () => {
    if (!ready) {
      setNotice({ ok: false, text: `Choose ${[needSize && !size ? "a size" : "", needColour && !colour ? "a colour" : ""].filter(Boolean).join(" and ")} first.` });
      return;
    }
    if (!chosen || !chosen.available) {
      setNotice({ ok: false, text: "That choice is unavailable. Please pick another." });
      return;
    }
    const res = addToCart(chosen.id, 1);
    setNotice({ ok: res.ok, text: res.message });
  };

  const chip = (active: boolean, disabled: boolean) =>
    `btn border ${active ? "border-royal bg-royal text-cream" : "border-royal/30"} ${disabled ? "opacity-50 line-through" : ""}`;

  return (
    <div className="wrap py-8 sm:py-12">
      <nav aria-label="Breadcrumb" className="text-sm text-royal/70">
        <Link to="/shop" className="link-line">Shop</Link>
        {collection && (<>{" / "}<Link to={`/collections/${collection.slug}`} className="link-line">{collection.name}</Link></>)}
      </nav>

      <div className="mt-6 grid gap-8 md:grid-cols-2 md:gap-14">
        <div className="grid gap-3">
          {image ? (
            <img src={image.url} alt={image.alt} className="aspect-[4/5] w-full bg-powder object-cover" />
          ) : (
            <PlaceholderImage label={product.name} className="aspect-[4/5] w-full" />
          )}
          {product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-3">
              {product.images.map((im, i) => (
                <button key={im.url} type="button" onClick={() => setShot(i)} aria-label={`Show photo ${i + 1}`} aria-pressed={i === shot}
                  className={`block border ${i === shot ? "border-royal" : "border-transparent"}`}>
                  <img src={im.url} alt="" loading="lazy" className="aspect-square w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <h1 className="text-4xl sm:text-5xl">{product.name}</h1>
          <p className="mt-3 text-lg font-medium">
            {chosen
              ? priceLabel(chosen.priceMinor, chosen.currency)
              : Math.min(...prices) === Math.max(...prices)
                ? priceLabel(prices[0], currency)
                : `From ${priceLabel(Math.min(...prices), currency)}`}
          </p>
          <p className="mt-1 text-sm text-royal/75">
            {fulfilmentLabel[product.type]}{product.subcategory && ` · ${product.subcategory}`}{chosen && ` · Ref ${chosen.sku}`}
          </p>
          {product.description && <p className="mt-5 max-w-prose whitespace-pre-line text-royal/85">{product.description}</p>}

          {needSize && (
            <fieldset className="mt-7">
              <legend className="mb-2 text-sm">Size</legend>
              <div className="flex flex-wrap gap-2">
                {sizes.map((s) => (
                  <button key={s} type="button" aria-pressed={size === s} disabled={!optionAvailable(s, colour)}
                    onClick={() => { setSize(s); setNotice(null); }} className={chip(size === s, !optionAvailable(s, colour))}>{s}</button>
                ))}
              </div>
            </fieldset>
          )}
          {needColour && (
            <fieldset className="mt-5">
              <legend className="mb-2 text-sm">Colour</legend>
              <div className="flex flex-wrap gap-2">
                {colours.map((c) => (
                  <button key={c} type="button" aria-pressed={colour === c} disabled={!optionAvailable(size, c)}
                    onClick={() => { setColour(c); setNotice(null); }} className={chip(colour === c, !optionAvailable(size, c))}>{c}</button>
                ))}
              </div>
            </fieldset>
          )}

          <div className="mt-7 flex flex-wrap gap-3">
            {onRequest ? (
              <a href={productEnquiryLink(product, chosen, true)} target="_blank" rel="noopener noreferrer" className="btn-primary flex-1 gap-2 sm:flex-none">
                <WhatsAppIcon className="h-5 w-5" /> Ask for the price on WhatsApp
              </a>
            ) : (
              <button type="button" onClick={handleAdd} className="btn-primary flex-1 sm:flex-none">Add to cart</button>
            )}
            <button type="button" onClick={() => toggleWishlist(product.slug)} aria-pressed={inWishlist(product.slug)} className="btn-ghost gap-2">
              <HeartIcon filled={inWishlist(product.slug)} className="h-5 w-5" />
              {inWishlist(product.slug) ? "Saved" : "Save"}
            </button>
          </div>
          {!onRequest && (
            <a href={productEnquiryLink(product, chosen)} target="_blank" rel="noopener noreferrer" className="btn-ghost mt-3 w-full gap-2 sm:w-auto">
              <WhatsAppIcon className="h-5 w-5" /> Ask about this on WhatsApp
            </a>
          )}

          <p role="status" aria-live="polite" className={`mt-4 min-h-[1.5rem] text-sm ${notice && !notice.ok ? "text-[#9b2c2c]" : ""}`}>
            {notice?.text}
            {notice?.ok && (<> <Link to="/cart" className="link-line">View cart</Link></>)}
          </p>

          {(product.fulfilmentInfo || product.shippingInfo) && (
            <dl className="mt-6 space-y-4 border-t border-dashed border-gold pt-6 text-sm">
              {product.fulfilmentInfo && <div><dt className="font-medium">Production</dt><dd className="mt-1 whitespace-pre-line text-royal/80">{product.fulfilmentInfo}</dd></div>}
              {product.shippingInfo && <div><dt className="font-medium">Shipping</dt><dd className="mt-1 whitespace-pre-line text-royal/80">{product.shippingInfo}</dd></div>}
            </dl>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16" aria-labelledby="related-title">
          <h2 id="related-title">You may also like</h2>
          <div className="mt-6"><ProductGrid products={related} /></div>
        </section>
      )}
    </div>
  );
}
