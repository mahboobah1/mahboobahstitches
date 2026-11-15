import type { Product, Variant } from "./types";

/**
 * DEMO CATALOGUE. Sample entries so the storefront can be reviewed.
 * They are NOT real stock. No prices are set (priceMinor is null) and sizes,
 * colours and SKUs are placeholders. From Phase 3 the owner adds real products
 * in the admin area and this file is deleted.
 */
const sizes = ["Size A", "Size B", "Size C"];
const colours = ["Midnight", "Cream"];

interface Flags {
  isNew?: boolean;
  isBestseller?: boolean;
}

const make = (
  n: number,
  slug: string,
  name: string,
  collectionSlug: string,
  subcategory: string,
  type: Product["type"],
  flags: Flags = {},
  lastVariantUnavailable = false,
): Product => {
  const variants: Variant[] = [];
  sizes.forEach((size, si) =>
    colours.forEach((colour, ci) => {
      const isLast = si === sizes.length - 1 && ci === colours.length - 1;
      const id = `${n}-${si + 1}${ci + 1}`;
      variants.push({
        id,
        sku: `DEMO-${id.toUpperCase()}`,
        size,
        colour,
        priceMinor: null,
        available: !(lastVariantUnavailable && isLast),
      });
    }),
  );
  return {
    id: `demo-${n}`,
    slug,
    name,
    description:
      "Sample description. Real fabric, fit and care details will be added by the owner in the admin area.",
    collectionSlug,
    subcategory,
    type,
    variants,
    fulfilmentInfo:
      type === "ready_to_wear"
        ? "Sample text: ready-to-wear items ship from available stock."
        : "Sample text: made-to-order and pre-order items are produced after you order. Timing will be confirmed by the business.",
    shippingInfo: "Sample text: delivery zones and fees will be set by the business.",
    isNew: !!flags.isNew,
    isBestseller: !!flags.isBestseller,
    isDemo: true,
  };
};

export const demoProducts: Product[] = [
  make(1, "demo-one-piece-jilbab", "Demo one-piece jilbab", "jilbab", "One-piece jilbab", "ready_to_wear", { isNew: true, isBestseller: true }),
  make(2, "demo-two-piece-jilbab", "Demo two-piece jilbab", "jilbab", "Two-piece jilbab", "made_to_order", { isBestseller: true }, true),
  make(3, "demo-three-piece-jilbab", "Demo three-piece jilbab", "jilbab", "Three-piece jilbab", "made_to_order", { isNew: true }),
  make(4, "demo-mini-instant-hijab", "Demo mini instant hijab", "kiddies-instant-hijab", "Mini", "ready_to_wear", { isNew: true }),
  make(5, "demo-maxi-instant-hijab", "Demo maxi instant hijab", "kiddies-instant-hijab", "Maxi", "ready_to_wear", { isBestseller: true }),
  make(6, "demo-everyday-abaya", "Demo everyday abaya", "abaya", "Everyday abayas", "ready_to_wear", { isBestseller: true }),
  make(7, "demo-occasion-abaya", "Demo occasion abaya", "abaya", "Occasion abayas", "pre_order", { isNew: true }),
  make(8, "demo-floral-dress", "Demo floral dress", "flower-and-pattern", "Floral dresses", "ready_to_wear", { isNew: true }),
  make(9, "demo-patterned-dress", "Demo patterned dress", "flower-and-pattern", "Patterned dresses", "made_to_order"),
  make(10, "demo-adult-prayer-dress", "Demo adult prayer dress", "prayer-wear", "Adult prayer dresses", "ready_to_wear", { isBestseller: true }),
  make(11, "demo-kiddies-prayer-dress", "Demo kiddies prayer dress", "prayer-wear", "Kiddies prayer dresses", "ready_to_wear"),
  make(12, "demo-prayer-dress-and-mat-set", "Demo prayer dress and mat set", "combo-and-gift", "Prayer dress and mat sets", "ready_to_wear", { isNew: true, isBestseller: true }),
  make(13, "demo-kiddies-prayer-gift-set", "Demo kiddies prayer gift set", "combo-and-gift", "Kiddies prayer gift sets", "ready_to_wear"),
];

export const getProduct = (slug: string) => demoProducts.find((p) => p.slug === slug);

export const getVariant = (variantId: string) => {
  for (const product of demoProducts) {
    const variant = product.variants.find((x) => x.id === variantId);
    if (variant) return { product, variant };
  }
  return undefined;
};
