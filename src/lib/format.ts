import { site } from "../config/site";
import type { FulfilmentType } from "../data/types";

/** Money is stored as integer minor units (kobo, cents). Never floats. */
export function formatMoney(minor: number | null, currency: string = site.defaultCurrency): string {
  if (minor === null) return "Price on request";
  const major = minor / 100;
  try {
    return new Intl.NumberFormat("en-NG", { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(major);
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

/** Naira text from a form field ("25,000" or "25000.50") to kobo. Returns null if it is not a valid amount. */
export function toMinor(input: string): number | null {
  const clean = input.replace(/[,\s₦]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null;
  return Math.round(parseFloat(clean) * 100);
}

export const fromMinor = (minor: number): string => (minor / 100).toString();
