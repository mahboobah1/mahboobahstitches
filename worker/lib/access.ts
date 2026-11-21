import { randomToken, safeEqual, sha256Hex } from "./crypto";

/** Private link tokens: only the SHA-256 hash is stored, so a database leak cannot reveal anyone's link. */
export const newToken = async () => { const token = randomToken(24); return { token, hash: await sha256Hex(token) }; };
export async function tokenMatches(token: string | null, hash: string | null): Promise<boolean> {
  return !!token && !!hash && (await safeEqual(await sha256Hex(token), hash));
}
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const refCode = (prefix: string) => `${prefix}-` + [...crypto.getRandomValues(new Uint8Array(6))].map((b) => ALPHABET[b % ALPHABET.length]).join("");
