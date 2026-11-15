import type { Collection } from "./types";

export const collections: Collection[] = [
  {
    slug: "jilbab",
    name: "Jilbab Collection",
    blurb: "Flowing, covered and made with care, in one, two and three pieces.",
    subcategories: ["One-piece jilbab", "Two-piece jilbab", "Three-piece jilbab"],
  },
  {
    slug: "kiddies-instant-hijab",
    name: "Kiddies Instant Hijab",
    blurb: "Easy slip-on hijabs for little ones, in mini and maxi lengths.",
    subcategories: ["Mini", "Maxi"],
  },
  {
    slug: "abaya",
    name: "Abaya Collection",
    blurb: "Abayas for everyday wear, special occasions and ready-to-wear convenience.",
    subcategories: ["Everyday abayas", "Occasion abayas", "Ready-to-wear abayas"],
  },
  {
    slug: "flower-and-pattern",
    name: "Flower and Pattern Collection",
    blurb: "Floral and patterned modest dresses with a distinct personality.",
    subcategories: ["Floral dresses", "Patterned dresses", "Distinctive modest dresses"],
  },
  {
    slug: "prayer-wear",
    name: "Prayer Wear",
    blurb: "Comfortable prayer dresses for adults and children, plus prayer essentials.",
    subcategories: ["Adult prayer dresses", "Kiddies prayer dresses", "Prayer essentials"],
  },
  {
    slug: "combo-and-gift",
    name: "Combo and Gift Collection",
    blurb: "Prayer sets and ready-to-gift combinations for the people you love.",
    subcategories: [
      "Prayer dress and mat sets",
      "Adult prayer gift sets",
      "Kiddies prayer gift sets",
      "Ready-to-wear gift combinations",
      "Custom gift bundles",
    ],
  },
];

export const getCollection = (slug: string) => collections.find((c) => c.slug === slug);
