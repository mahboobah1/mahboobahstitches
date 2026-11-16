/**
 * Business details. FILL THESE IN.
 * These are only FALLBACKS. The real values are saved in Admin > Settings and loaded from the
 * database when the site opens (see SiteContext). Anything empty is hidden or replaced safely.
 */
export const site = {
  name: "Mahboobah Stitches",
  tagline: "Elegance in Every Thread.",
  // Shows a "demo preview" notice in the top strip.
  demoMode: false,
  announcement: "Welcome to Mahboobah Stitches.",

  // ---- CONTACT DETAILS: add yours here ----
  whatsappNumber: "", // international format, digits only, e.g. 2348012345678
  phone: "", // e.g. +234 801 234 5678
  email: "", // e.g. hello@yourmail.com
  instagram: "", // full URL, e.g. https://instagram.com/yourhandle
  tiktok: "",
  facebook: "",
  address: "", // studio or pickup address, if any
  openingHours: "", // e.g. Mon to Sat, 10am to 6pm

  // ---- COMMERCE ----
  defaultCurrency: "NGN",
  onlineCheckoutEnabled: false, // switched on in Phase 4 once payments are verified
} as {
  name: string;
  tagline: string;
  demoMode: boolean;
  announcement: string;
  whatsappNumber: string;
  phone: string;
  email: string;
  instagram: string;
  tiktok: string;
  facebook: string;
  address: string;
  openingHours: string;
  defaultCurrency: string;
  onlineCheckoutEnabled: boolean;
};

export const hasWhatsapp = (): boolean => site.whatsappNumber.replace(/\D/g, "").length >= 8;
