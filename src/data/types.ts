export type FulfilmentType = "ready_to_wear" | "made_to_order" | "pre_order" | "custom";

export interface Variant {
  id: string;
  sku: string;
  size: string;
  colour: string;
  /** Minor units (kobo). */
  priceMinor: number;
  currency: string;
  /** Computed by the server from stock. false = cannot be bought. */
  available: boolean;
}

export interface ProductImage {
  url: string;
  alt: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  collectionSlug: string;
  collectionName: string;
  subcategory: string;
  type: FulfilmentType;
  isNew: boolean;
  isBestseller: boolean;
  fulfilmentInfo: string;
  shippingInfo: string;
  images: ProductImage[];
  variants: Variant[];
}

export interface Collection {
  slug: string;
  name: string;
  blurb: string;
  imageUrl: string;
  /** Live products in this collection. Collections with 0 are hidden from the website lists. */
  productCount: number;
  subcategories: string[];
}

export interface Review {
  id: string;
  author: string;
  text: string;
}
