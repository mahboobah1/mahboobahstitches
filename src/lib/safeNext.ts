/** Only allow redirects to paths inside this site (blocks open-redirect tricks like //evil.com). */
export function safeNext(value: string | null, fallback = "/account"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  return value;
}
