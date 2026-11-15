import { site } from "../config/site";
import type { FulfilmentType } from "../data/types";

/** Money is stored as integer minor units (kobo, cents). Never floats. */
export function formatMoney(minor: number | null, currency: string = site.defaultCurrency): string {
  if (minor === null) return "Price on request";
  const major = minor / 100;
  try {
    return new Intl.NumberFormat("en-NG", { style: "currency", currency }).format(major);
  } catch {
    return `${currency} ${major.toFixed(2)}`;
  }
}

export const fulfilmentLabel: Record<FulfilmentType, string> = {
  ready_to_wear: "Ready to wear",
  made_to_order: "Made to order",
  pre_order: "Pre-order",
  custom: "Custom made",
};

export const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
