import { Link } from "react-router-dom";
import type { Product } from "../data/types";
import { fulfilmentLabel, priceLabel } from "../lib/format";
import { useStore } from "../context/StoreContext";
import { HeartIcon } from "./Icons";
import { ProductImage } from "./ProductImage";

export function ProductCard({ product }: { product: Product }) {
  const { toggleWishlist, inWishlist } = useStore();
  const saved = inWishlist(product.slug);
  const from = Math.min(...product.variants.map((v) => v.priceMinor));
  const anyAvailable = product.variants.some((v) => v.available);

  return (
    <article className="group relative">
      <Link to={`/product/${product.slug}`} className="block">
        <ProductImage product={product} className="aspect-[4/5] w-full" />
        <h3 className="mt-3 text-lg leading-snug sm:text-xl">{product.name}</h3>
      </Link>
      <p className="mt-1 text-sm text-royal/75">
        {fulfilmentLabel[product.type]}
        {!anyAvailable && " · Currently unavailable"}
      </p>
      <p className="mt-0.5 text-sm font-medium">{product.variants.length > 1 && from > 0 ? `From ${priceLabel(from, product.variants[0].currency)}` : priceLabel(from, product.variants[0].currency)}</p>
      <button
        type="button"
        onClick={() => toggleWishlist(product.slug)}
        aria-pressed={saved}
        aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
        className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full bg-cream/90 text-royal hover:bg-white"
      >
        <HeartIcon filled={saved} className="h-5 w-5" />
      </button>
    </article>
  );
}
