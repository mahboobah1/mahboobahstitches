import type { Env } from "../types";
import { HttpError } from "./http";

export interface RateOption {
  id: string; name: string; priceMinor: number; baseMinor: number; minDays: number | null; maxDays: number | null; freeOverMinor: number | null; zoneId: string; zoneName: string;
}
interface Zone { id: string; name: string; countries_json: string; states_json: string | null }

/** True once the owner has created at least one active delivery zone. Until then the old flat delivery fee (Nigeria only) applies. */
export async function zonesConfigured(env: Env): Promise<boolean> {
  return ((await env.DB.prepare("SELECT COUNT(*) AS n FROM shipping_zones WHERE is_active=1").first<{ n: number }>())?.n ?? 0) > 0;
}

export async function activeCountries(env: Env): Promise<string[]> {
  const zs = await env.DB.prepare("SELECT countries_json FROM shipping_zones WHERE is_active=1").all<{ countries_json: string }>();
  const set = new Set<string>();
  for (const z of zs.results) for (const c of JSON.parse(z.countries_json) as string[]) set.add(c.toUpperCase());
  return [...set].sort();
}

const norm = (s: string) => s.trim().toLowerCase();

/** The most specific zone for a destination: a zone that lists the state beats a whole-country zone. */
async function matchZone(env: Env, country: string, state: string): Promise<Zone | null> {
  const zs = await env.DB.prepare("SELECT id, name, countries_json, states_json FROM shipping_zones WHERE is_active=1 ORDER BY sort_order, rowid").all<Zone>();
  const inCountry = zs.results.filter((z) => (JSON.parse(z.countries_json) as string[]).map((c) => c.toUpperCase()).includes(country));
  const byState = inCountry.find((z) => z.states_json && (JSON.parse(z.states_json) as string[]).some((s) => norm(s) === norm(state)));
  return byState ?? inCountry.find((z) => !z.states_json) ?? null;
}

export async function ratesFor(env: Env, country: string, state: string, subtotalMinor: number): Promise<RateOption[]> {
  const zone = await matchZone(env, country.toUpperCase(), state);
  if (!zone) return [];
  const rows = await env.DB.prepare(
    "SELECT id, name, price_minor, min_days, max_days, free_over_minor FROM shipping_rates WHERE zone_id=?1 AND is_active=1 ORDER BY sort_order, rowid",
  ).bind(zone.id).all<{ id: string; name: string; price_minor: number; min_days: number | null; max_days: number | null; free_over_minor: number | null }>();
  return rows.results.map((r) => ({
    id: r.id, name: r.name, baseMinor: r.price_minor, minDays: r.min_days, maxDays: r.max_days, freeOverMinor: r.free_over_minor,
    priceMinor: r.free_over_minor !== null && subtotalMinor >= r.free_over_minor ? 0 : r.price_minor, zoneId: zone.id, zoneName: zone.name,
  }));
}

export async function chooseRate(env: Env, country: string, state: string, subtotalMinor: number, rateId: unknown): Promise<RateOption> {
  if (typeof rateId !== "string") throw new HttpError(422, "Choose a delivery option.");
  const options = await ratesFor(env, country, state, subtotalMinor);
  if (options.length === 0) throw new HttpError(422, "We do not deliver to that address online yet. Please contact us on WhatsApp and we will arrange it.");
  const rate = options.find((o) => o.id === rateId);
  if (!rate) throw new HttpError(422, "That delivery option is not available for this address.");
  return rate;
}
