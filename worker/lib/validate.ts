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
