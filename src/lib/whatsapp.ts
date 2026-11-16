import { hasWhatsapp, site } from "../config/site";
import type { Product, Variant } from "../data/types";
import { formatMoney } from "./format";

const digits = () => site.whatsappNumber.replace(/\D/g, "");

/**
 * Builds a click-to-chat link (no WhatsApp Business API needed).
 * If no number is configured yet, falls back to the contact page so the
 * button is never dead.
 */
export function whatsappLink(message: string): string {
  if (!hasWhatsapp()) return "/contact";
  return `https://wa.me/${digits()}?text=${encodeURIComponent(message)}`;
}

const origin = () => (typeof window !== "undefined" ? window.location.origin : "");

export function productEnquiryLink(product: Product, variant?: Variant): string {
  const lines = [
    `Hello ${site.name}, I would like to ask about this item:`,
    `Product: ${product.name}`,
    `Reference: ${variant ? variant.sku : product.id}`,
  ];
  if (variant?.size) lines.push(`Size: ${variant.size}`);
  if (variant?.colour) lines.push(`Colour: ${variant.colour}`);
  lines.push(`Link: ${origin()}${import.meta.env.BASE_URL.replace(/\/$/, "")}/product/${product.slug}`);
  return whatsappLink(lines.join("\n"));
}

export interface SummaryLine {
  product: Product;
  variant: Variant;
  qty: number;
}

export function cartSummaryLink(lines: SummaryLine[]): string {
  const body = lines.map(
    (l, i) =>
      `${i + 1}. ${l.product.name} | ${[l.variant.size, l.variant.colour].filter(Boolean).join(" ") || "Standard"} | Ref ${l.variant.sku} | Qty ${l.qty} | ${formatMoney(l.variant.priceMinor, l.variant.currency)}`,
  );
  const msg = [
    `Hello ${site.name}, I would like to place an order:`,
    ...body,
    "",
    "Please confirm availability, total and delivery. (This message is an enquiry, not a paid order.)",
  ].join("\n");
  return whatsappLink(msg);
}

export const generalEnquiryLink = (topic: string) =>
  whatsappLink(`Hello ${site.name}, ${topic}`);
