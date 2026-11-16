import type { Product } from "../data/types";
import { PlaceholderImage } from "./PlaceholderImage";

/** First product photo, or a labelled placeholder until the owner uploads one. */
export function ProductImage({ product, className = "" }: { product: Product; className?: string }) {
  const first = product.images[0];
  if (!first) return <PlaceholderImage label={product.name} className={className} />;
  return (
    <img
      src={first.url}
      alt={first.alt}
      loading="lazy"
      decoding="async"
      className={`bg-powder object-cover ${className}`}
    />
  );
}
