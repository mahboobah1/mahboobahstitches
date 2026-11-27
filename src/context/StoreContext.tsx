import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useCatalogue } from "./CatalogueContext";
import type { Product, Variant } from "../data/types";
import { loadJSON, saveJSON } from "../lib/storage";

interface CartItem {
  variantId: string;
  qty: number;
}

export interface CartLine {
  product: Product;
  variant: Variant;
  qty: number;
}

export interface GiftCartItem {
  id: string; bundleId: string; bundleName: string; kind: string; selections: Record<string, string>;
  packagingId: string | null; packagingName: string | null; message: string; recipientName: string;
  /** What is inside, for display only. The server decides the real price at checkout. */
  contents: string[]; estimateMinor: number;
}

interface StoreValue {
  gifts: GiftCartItem[];
  addGift: (g: Omit<GiftCartItem, "id">) => void;
  removeGift: (id: string) => void;
  lines: CartLine[];
  count: number;
  addToCart: (variantId: string, qty?: number) => { ok: boolean; message: string };
  setQty: (variantId: string, qty: number) => void;
  removeFromCart: (variantId: string) => void;
  clearCart: () => void;
  wishlist: string[];
  toggleWishlist: (productSlug: string) => void;
  inWishlist: (productSlug: string) => boolean;
}

const MAX_QTY = 10; // Real per-variant stock limits arrive with the database (Phase 3).
const CART_KEY = "ms_cart_v1";
const WISH_KEY = "ms_wishlist_v1";
const GIFT_KEY = "ms_gifts_v1";

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const { getVariant, status } = useCatalogue();
  const [items, setItems] = useState<CartItem[]>(() => loadJSON<CartItem[]>(CART_KEY, []));
  const [wishlist, setWishlist] = useState<string[]>(() => loadJSON<string[]>(WISH_KEY, []));
  const [gifts, setGifts] = useState<GiftCartItem[]>(() => loadJSON<GiftCartItem[]>(GIFT_KEY, []));
  useEffect(() => saveJSON(GIFT_KEY, gifts), [gifts]);
  const addGift = useCallback((g: Omit<GiftCartItem, "id">) => setGifts((p) => (p.length >= 10 ? p : [...p, { ...g, id: Math.random().toString(36).slice(2, 10) }])), []);
  const removeGift = useCallback((id: string) => setGifts((p) => p.filter((x) => x.id !== id)), []);

  useEffect(() => saveJSON(CART_KEY, items), [items]);
  useEffect(() => saveJSON(WISH_KEY, wishlist), [wishlist]);

  const lines = useMemo<CartLine[]>(() => {
    const out: CartLine[] = [];
    for (const it of items) {
      const found = getVariant(it.variantId);
      // Lines whose variant was removed or sold out are hidden. Prices always come from the live catalogue.
      if (found && found.variant.available) out.push({ ...found, qty: it.qty });
    }
    return out;
  }, [items, getVariant]);

  const addToCart = useCallback((variantId: string, qty = 1) => {
    if (status !== "ready") return { ok: false, message: "The shop is still loading. Try again in a moment." };
    const found = getVariant(variantId);
    if (!found) return { ok: false, message: "That item could not be found." };
    if (!found.variant.available) return { ok: false, message: "That size and colour is unavailable." };
    if (found.variant.priceMinor === 0) return { ok: false, message: "Please ask for the price on WhatsApp." };
    setItems((prev) => {
      const existing = prev.find((p) => p.variantId === variantId);
      if (existing) {
        return prev.map((p) =>
          p.variantId === variantId ? { ...p, qty: Math.min(MAX_QTY, p.qty + qty) } : p,
        );
      }
      return [...prev, { variantId, qty: Math.min(MAX_QTY, qty) }];
    });
    return { ok: true, message: "Added to your cart." };
  }, [getVariant, status]);

  const setQty = useCallback((variantId: string, qty: number) => {
    const safe = Math.max(1, Math.min(MAX_QTY, Math.floor(qty) || 1));
    setItems((prev) => prev.map((p) => (p.variantId === variantId ? { ...p, qty: safe } : p)));
  }, []);

  const removeFromCart = useCallback(
    (variantId: string) => setItems((prev) => prev.filter((p) => p.variantId !== variantId)),
    [],
  );
  const clearCart = useCallback(() => { setItems([]); setGifts([]); }, []);

  const toggleWishlist = useCallback(
    (slug: string) =>
      setWishlist((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug])),
    [],
  );
  const inWishlist = useCallback((slug: string) => wishlist.includes(slug), [wishlist]);

  const count = useMemo(() => lines.reduce((n, l) => n + l.qty, 0) + gifts.length, [lines, gifts]);

  const value: StoreValue = {
    gifts,
    addGift,
    removeGift,
    lines,
    count,
    addToCart,
    setQty,
    removeFromCart,
    clearCart,
    wishlist,
    toggleWishlist,
    inWishlist,
  };
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}

export const MAX_CART_QTY = MAX_QTY;
