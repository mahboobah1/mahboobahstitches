export type FulfilmentType = "ready_to_wear" | "made_to_order" | "pre_order" | "custom";

export interface Variant {
  id: string;
  sku: string;
  size: string;
  colour: string;
  /** Price in minor units (kobo). null = not set yet. */
  priceMinor: number | null;
  /** false = cannot be bought. Real stock counts arrive with the database in Phase 3. */
  available: boolean;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  collectionSlug: string;
  subcategory: string;
  type: FulfilmentType;
  variants: Variant[];
  fulfilmentInfo: string;
  shippingInfo: string;
  isNew: boolean;
  isBestseller: boolean;
  /** true = sample content only, never real merchandise. */
  isDemo: boolean;
}

export interface Collection {
  slug: string;
  name: string;
  blurb: string;
  subcategories: string[];
}

export interface Review {
  id: string;
  author: string;
  text: string;
}
