import type { Env } from "../types";
import { HttpError } from "./http";
import { safeEqual } from "./crypto";

/**
 * Payment-provider abstraction. Checkout only talks to this interface, so another provider
 * (Flutterwave, Stripe...) can be added later without touching the order logic.
 * Secrets never leave the server: the customer is redirected to the provider's own page.
 */
export interface InitInput {
  email: string;
  amountMinor: number;
  currency: string;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, string>;
}
export interface VerifyResult {
  status: "success" | "failed" | "abandoned" | "pending";
  amountMinor: number;
  currency: string;
  reference: string;
  raw: unknown;
}
export interface PaymentProvider {
  name: string;
  mode: "test" | "live";
  initialize(input: InitInput): Promise<{ authorizationUrl: string }>;
  verify(reference: string): Promise<VerifyResult>;
  verifyWebhookSignature(rawBody: string, signature: string | null): Promise<boolean>;
}

const API = "https://api.paystack.co";
const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

async function hmacSha512Hex(secret: string, body: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-512" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, enc.encode(body)));
}

async function call<T>(secret: string, path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(API + path, { ...init, headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" } });
  } catch {
    throw new HttpError(502, "We could not reach the payment provider. Please try again in a moment.");
  }
  let body: { status?: boolean; message?: string; data?: unknown };
  try {
    body = (await res.json()) as typeof body;
  } catch {
    throw new HttpError(502, "The payment provider sent an unexpected reply. Please try again.");
  }
  if (!res.ok || body.status !== true) {
    console.error("paystack error", res.status, body.message);
    throw new HttpError(502, "The payment provider could not process that request. Please try again.");
  }
  return body.data as T;
}

export function getProvider(env: Env): PaymentProvider | null {
  const secret = env.PAYSTACK_SECRET_KEY;
  if (!secret) return null;
  return {
    name: "paystack",
    mode: secret.startsWith("sk_live_") ? "live" : "test",
    async initialize(i) {
      const d = await call<{ authorization_url: string }>(secret, "/transaction/initialize", {
        method: "POST",
        body: JSON.stringify({ email: i.email, amount: i.amountMinor, currency: i.currency, reference: i.reference, callback_url: i.callbackUrl, metadata: i.metadata }),
      });
      if (typeof d?.authorization_url !== "string" || !d.authorization_url.startsWith("https://")) throw new HttpError(502, "The payment provider did not return a payment page.");
      return { authorizationUrl: d.authorization_url };
    },
    async verify(reference) {
      const d = await call<{ status: string; amount: number; currency: string; reference: string }>(secret, `/transaction/verify/${encodeURIComponent(reference)}`);
      const s = d.status === "success" ? "success" : d.status === "abandoned" ? "abandoned" : d.status === "failed" || d.status === "reversed" ? "failed" : "pending";
      return { status: s, amountMinor: Number(d.amount), currency: String(d.currency), reference: String(d.reference), raw: d };
    },
    async verifyWebhookSignature(rawBody, signature) {
      if (!signature) return false;
      return safeEqual((await hmacSha512Hex(secret, rawBody)).toLowerCase(), signature.toLowerCase());
    },
  };
}
