export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });
}

/** Reads a small JSON object body. Rejects anything else. */
export async function readJson(req: Request): Promise<Record<string, unknown>> {
  const type = req.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) throw new HttpError(415, "Send JSON.");
  const text = await req.text();
  if (text.length > 20_000) throw new HttpError(413, "Request too large.");
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new HttpError(400, "Invalid JSON.");
  }
  if (typeof data !== "object" || data === null || Array.isArray(data)) throw new HttpError(400, "Invalid request.");
  return data as Record<string, unknown>;
}

/**
 * CSRF defence for state-changing requests: browsers always send an Origin header
 * on cross-site POSTs, and it must match this site. Combined with SameSite=Lax cookies.
 */
export function assertSameOrigin(req: Request): void {
  if (req.method === "GET" || req.method === "HEAD") return;
  const origin = req.headers.get("origin");
  if (!origin || origin !== new URL(req.url).origin) throw new HttpError(403, "Request blocked.");
}

export const clientIp = (req: Request): string => req.headers.get("cf-connecting-ip") ?? "unknown";
