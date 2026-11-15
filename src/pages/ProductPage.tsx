import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { HeartIcon, WhatsAppIcon } from "../components/Icons";
import { PlaceholderImage } from "../components/PlaceholderImage";
import { ProductGrid } from "../components/ProductGrid";
import { getCollection } from "../data/collections";
import { demoProducts, getProduct } from "../data/demo-products";
import { useStore } from "../context/StoreContext";
import { formatMoney, fulfilmentLabel } from "../lib/format";
import { usePageMeta } from "../lib/usePageMeta";
import { productEnquiryLink } from "../lib/whatsapp";
import NotFoundPage from "./NotFoundPage";

export default function ProductPage() {
  const { slug = "" } = useParams();
  const product = getProduct(slug);
  const { addToCart, toggleWishlist, inWishlist } = useStore();
  const [size, setSize] = useState("");
  const [colour, setColour] = useState("");
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  usePageMeta(product?.name, product?.description);

  const sizes = useMemo(() => [...new Set((product?.variants ?? []).map((v) => v.size))], [product]);
  const colours = useMemo(() => [...new Set((product?.variants ?? []).map((v) => v.colour))], [product]);

  if (!product) return <NotFoundPage />;

  const variant = product.variants.find((v) => v.size === size && v.colour === colour);
  const collection = getCollection(product.collectionSlug);
  const related = demoProducts.filter((p) => p.collectionSlug === product.collectionSlug && p.id !== product.id).slice(0, 4);

  const optionAvailable = (s: string, c: string) =>
    product.variants.some((v) => v.available && (!s || v.size === s) && (!c || v.colour === c));

  const handleAdd = () => {
    if (!size || !colour) {
      setNotice({ ok: false, text: "Choose a size and a colour first." });
      return;
    }
    if (!variant || !variant.available) {
      setNotice({ ok: false, text: "That size and colour is unavailable. Please choose another." });
      return;
    }
    const res = addToCart(variant.id, 1);
    setNotice({ ok: res.ok, text: res.message });
  };

  const chip = (active: boolean, disabled: boolean) =>
    `btn border ${active ? "border-royal bg-royal text-cream" : "border-royal/30"} ${disabled ? "opacity-50 line-through" : ""}`;

  return (
    <div className="wrap py-8 sm:py-12">
      <nav aria-label="Breadcrumb" className="text-sm text-royal/70">
        <Link to="/shop" className="link-line">Shop</Link>
        {collection && (
          <>
            {" / "}
            <Link to={`/collections/${collection.slug}`} className="link-line">{collection.name}</Link>
          </>
        )}
      </nav>

      <div className="mt-6 grid gap-8 md:grid-cols-2 md:gap-14">
        <div className="grid gap-3">
          <PlaceholderImage label={product.name} className="aspect-[4/5] w-full" />
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <PlaceholderImage key={i} label={`${product.name} view ${i + 2}`} tone="cream" className="aspect-square w-full" showLabel={false} />
            ))}
          </div>
        </div>

        <div>
          {product.isDemo && (
            <p className="mb-3 inline-block border border-dashed border-gold px-2 py-1 text-xs">
              Demo product: sample content, not real stock
            </p>
          )}
          <h1 className="text-4xl sm:text-5xl">{product.name}</h1>
          <p className="mt-3 text-lg font-medium">
            {variant ? formatMoney(variant.priceMinor) : "Price on request"}
          </p>
          <p className="mt-1 text-sm text-royal/75">
            {fulfilmentLabel[product.type]} · {product.subcategory}
            {variant && ` · Ref ${variant.sku}`}
          </p>
          <p className="mt-5 max-w-prose text-royal/85">{product.description}</p>

          <fieldset className="mt-7">
            <legend className="mb-2 text-sm">Size</legend>
            <div className="flex flex-wrap gap-2">
              {sizes.map((s) => (
                <button key={s} type="button" aria-pressed={size === s} disabled={!optionAvailable(s, colour)}
                  onClick={() => { setSize(s); setNotice(null); }} className={chip(size === s, !optionAvailable(s, colour))}>
                  {s}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-5">
            <legend className="mb-2 text-sm">Colour</legend>
            <div className="flex flex-wrap gap-2">
              {colours.map((c) => (
                <button key={c} type="button" aria-pressed={colour === c} disabled={!optionAvailable(size, c)}
                  onClick={() => { setColour(c); setNotice(null); }} className={chip(colour === c, !optionAvailable(size, c))}>
                  {c}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="mt-7 flex flex-wrap gap-3">
            <button type="button" onClick={handleAdd} className="btn-primary flex-1 sm:flex-none">Add to cart</button>
            <button type="button" onClick={() => toggleWishlist(product.slug)} aria-pressed={inWishlist(product.slug)}
              className="btn-ghost gap-2">
              <HeartIcon filled={inWishlist(product.slug)} className="h-5 w-5" />
              {inWishlist(product.slug) ? "Saved" : "Save"}
            </button>
          </div>
          <a href={productEnquiryLink(product, variant)} target="_blank" rel="noopener noreferrer"
            className="btn-ghost mt-3 w-full gap-2 sm:w-auto">
            <WhatsAppIcon className="h-5 w-5" /> Ask about this on WhatsApp
          </a>

          <p role="status" aria-live="polite" className={`mt-4 min-h-[1.5rem] text-sm ${notice && !notice.ok ? "text-[#9b2c2c]" : ""}`}>
            {notice?.text}
            {notice?.ok && (<> <Link to="/cart" className="link-line">View cart</Link></>)}
          </p>

          <dl className="mt-6 space-y-4 border-t border-dashed border-gold pt-6 text-sm">
            <div><dt className="font-medium">Production</dt><dd className="mt-1 text-royal/80">{product.fulfilmentInfo}</dd></div>
            <div><dt className="font-medium">Shipping</dt><dd className="mt-1 text-royal/80">{product.shippingInfo}</dd></div>
          </dl>
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
