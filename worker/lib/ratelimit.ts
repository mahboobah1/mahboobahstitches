import type { Env } from "../types";
import { HttpError } from "./http";

/** Fixed-window counter stored in D1. Throws 429 once `limit` is exceeded in the window. */
export async function rateLimit(env: Env, key: string, limit: number, windowSeconds: number): Promise<void> {
  const nowSec = Math.floor(Date.now() / 1000);
  const windowStart = nowSec - (nowSec % windowSeconds);
  const row = await env.DB.prepare(
    `INSERT INTO rate_limits (key, window_start, count) VALUES (?1, ?2, 1)
     ON CONFLICT(key) DO UPDATE SET
       count = CASE WHEN window_start = ?2 THEN count + 1 ELSE 1 END,
       window_start = ?2
     RETURNING count`,
  )
    .bind(key, windowStart)
    .first<{ count: number }>();
  if (row && row.count > limit) throw new HttpError(429, "Too many attempts. Please wait a while and try again.");
}
