export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const UNAVAILABLE = "Account services are not available on this address yet.";

/** Calls the site's own backend (/api/...). Always returns data or throws ApiError with a readable message. */
export async function api<T>(path: string, opts: { method?: "GET" | "POST"; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: opts.method ?? "GET",
      headers: opts.body !== undefined ? { "content-type": "application/json" } : undefined,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      credentials: "same-origin",
    });
  } catch {
    throw new ApiError(0, "Could not reach the server. Check your connection and try again.");
  }
  const type = res.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) throw new ApiError(0, UNAVAILABLE);
  const data = (await res.json()) as { error?: string } & T;
  if (!res.ok) throw new ApiError(res.status, data.error ?? "Something went wrong.");
  return data;
}
