import { HttpError } from "./http";

const fail = (msg: string): never => {
  throw new HttpError(422, msg);
};

export function text(v: unknown, label: string, min = 1, max = 120): string {
  if (typeof v !== "string") return fail(`${label} is required.`);
  const s = v.trim().replace(/\s+/g, " ");
  if (s.length < min) return fail(`${label} is required.`);
  if (s.length > max) return fail(`${label} is too long.`);
  return s;
}

export function email(v: unknown): string {
  if (typeof v !== "string") return fail("Enter a valid email address.");
  const s = v.trim().toLowerCase();
  if (s.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)) return fail("Enter a valid email address.");
  return s;
}

/** Passwords are never trimmed or altered. */
export function password(v: unknown): string {
  if (typeof v !== "string") return fail("Enter a password.");
  if (v.length < 10) return fail("Use a password of at least 10 characters.");
  if (v.length > 128) return fail("That password is too long.");
  return v;
}

export function optionalPhone(v: unknown): string | null {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v !== "string") return fail("Enter a valid phone number.");
  const s = v.trim();
  if (!/^\+?[0-9 ()-]{7,20}$/.test(s)) return fail("Enter a valid phone number.");
  return s;
}

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80);
}

export function slug(v: unknown, fallbackFrom: string): string {
  const raw = typeof v === "string" && v.trim() ? v.trim().toLowerCase() : slugify(fallbackFrom);
  if (!raw || raw.length > 80 || !SLUG_RE.test(raw)) return fail("Use letters, numbers and hyphens for the web address.");
  return raw;
}

export function optText(v: unknown, label: string, max: number): string | null {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v !== "string") return fail(`${label} is not valid.`);
  const s = v.trim();
  if (s.length > max) return fail(`${label} is too long.`);
  return s || null;
}

export function int(v: unknown, label: string, min: number, max: number): number {
  if (typeof v !== "number" || !Number.isInteger(v) || v < min || v > max) return fail(`${label} must be a whole number from ${min} to ${max}.`);
  return v;
}

export function oneOf<T extends string>(v: unknown, label: string, allowed: readonly T[]): T {
  if (typeof v !== "string" || !allowed.includes(v as T)) return fail(`${label} is not valid.`);
  return v as T;
}

export function bool(v: unknown): boolean {
  return v === true || v === 1;
}

export function id(v: unknown, label = "Item"): string {
  if (typeof v !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(v)) return fail(`${label} is not valid.`);
  return v;
}

/** A photo from the website library (/images/...) or an upload (/api/media/<id>). Never an outside web address. */
export function imagePath(v: unknown, label = "Picture"): string | null {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v !== "string") return fail(`${label} is not valid.`);
  const s = v.trim();
  const library = /^\/images\/[A-Za-z0-9_\-/.]{1,200}\.(webp|jpe?g|png|avif)$/i.test(s) && !s.includes("..") && !s.includes("//");
  const upload = /^\/api\/media\/[0-9a-f-]{36}$/.test(s);
  if (!library && !upload) return fail(`${label} must be chosen from the photo library.`);
  return s;
}
