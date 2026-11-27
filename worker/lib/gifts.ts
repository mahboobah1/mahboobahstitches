import type { Env } from "../types";
import { HttpError } from "./http";

export interface GiftInput { bundleId: string; selections: Record<string, string>; packagingId: string | null; message: string | null; recipientName: string | null }
export interface Expanded { input: GiftInput; bundleName: string; kind: string; discountPercent: number; imageUrl: string | null; components: { variantId: string; qty: number }[]; packaging: { id: string; name: string; priceMinor: number } | null }

interface Bundle { id: string; name: string; kind: string; is_active: number; discount_percent: number; image_url: string | null }

export function parseGifts(raw: unknown): GiftInput[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw) || raw.length > 10) throw new HttpError(422, "Too many gifts in one order.");
  return raw.map((g) => {
    const o = (g ?? {}) as Record<string, unknown>;
    const id = (x: unknown) => (typeof x === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(x) ? x : null);
    const bundleId = id(o.bundleId);
    if (!bundleId) throw new HttpError(422, "A gift in your cart is not valid.");
    const sel: Record<string, string> = {};
    if (o.selections && typeof o.selections === "object") for (const [k, val] of Object.entries(o.selections as Record<string, unknown>)) { const s = id(k), v = id(val); if (!s || !v) throw new HttpError(422, "A gift choice is not valid."); sel[s] = v; }
    const text = (x: unknown, max: number, label: string) => { if (x === undefined || x === null || x === "") return null; if (typeof x !== "string" || x.trim().length > max) throw new HttpError(422, `${label} is too long.`); return x.trim() || null; };
    return { bundleId, selections: sel, packagingId: o.packagingId ? id(o.packagingId) : null, message: text(o.message, 300, "The gift message"), recipientName: text(o.recipientName, 80, "The recipient name") };
  });
}

/** Resolves a customer's gift choice into plain products (variants) plus optional packaging. Rejects anything that is not allowed. */
export async function expandGift(env: Env, g: GiftInput): Promise<Expanded> {
  const b = await env.DB.prepare("SELECT id, name, kind, is_active, discount_percent, image_url FROM gift_bundles WHERE id=?1").bind(g.bundleId).first<Bundle>();
  if (!b || b.is_active !== 1) throw new HttpError(409, "A gift in your cart is no longer available.");
  let components: { variantId: string; qty: number }[];
  if (b.kind === "fixed") {
    const items = await env.DB.prepare("SELECT variant_id, qty FROM gift_bundle_items WHERE bundle_id=?1 ORDER BY rowid").bind(b.id).all<{ variant_id: string; qty: number }>();
    if (items.results.length === 0) throw new HttpError(409, `${b.name} is not ready yet.`);
    components = items.results.map((i) => ({ variantId: i.variant_id, qty: i.qty }));
  } else {
    const slots = await env.DB.prepare("SELECT id, label FROM gift_slots WHERE bundle_id=?1 ORDER BY sort_order, rowid").bind(b.id).all<{ id: string; label: string }>();
    if (slots.results.length === 0) throw new HttpError(409, `${b.name} is not ready yet.`);
    components = [];
    for (const s of slots.results) {
      const chosen = g.selections[s.id];
      if (!chosen) throw new HttpError(422, `Choose an option for "${s.label}".`);
      const ok = await env.DB.prepare("SELECT 1 AS x FROM gift_slot_options WHERE slot_id=?1 AND variant_id=?2").bind(s.id, chosen).first();
      if (!ok) throw new HttpError(422, `That choice is not available for "${s.label}".`);
      components.push({ variantId: chosen, qty: 1 });
    }
    if (Object.keys(g.selections).some((k) => !slots.results.some((s) => s.id === k))) throw new HttpError(422, "A gift choice is not valid.");
  }
  let packaging: Expanded["packaging"] = null;
  if (g.packagingId) {
    const p = await env.DB.prepare("SELECT id, name, price_minor FROM gift_packaging WHERE id=?1 AND is_active=1").bind(g.packagingId).first<{ id: string; name: string; price_minor: number }>();
    if (!p) throw new HttpError(422, "That gift packaging is not available.");
    packaging = { id: p.id, name: p.name, priceMinor: p.price_minor };
  }
  return { input: g, bundleName: b.name, kind: b.kind, discountPercent: b.discount_percent, imageUrl: b.image_url, components, packaging };
}
