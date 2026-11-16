import type { Env } from "../types";
import { clientIp } from "./http";
import { randomToken, sha256Hex } from "./crypto";
import type { SessionUser } from "./permissions";

const COOKIE = "ms_session";
const TTL_SECONDS = 14 * 24 * 60 * 60;
const now = () => Math.floor(Date.now() / 1000);

function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return null;
}

const cookie = (value: string, maxAge: number) =>
  `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;

/** Creates a session row (storing only a hash of the token) and returns the Set-Cookie header value. */
export async function createSession(env: Env, userId: string, req: Request): Promise<string> {
  const token = randomToken(32);
  const id = await sha256Hex(token);
  const ua = (req.headers.get("user-agent") ?? "").slice(0, 200);
  await env.DB.batch([
    env.DB.prepare("DELETE FROM sessions WHERE user_id = ?1 AND expires_at < ?2").bind(userId, now()),
    env.DB.prepare("INSERT INTO sessions (id, user_id, expires_at, ip, user_agent) VALUES (?1, ?2, ?3, ?4, ?5)").bind(
      id, userId, now() + TTL_SECONDS, clientIp(req), ua,
    ),
  ]);
  return cookie(token, TTL_SECONDS);
}

export async function getSessionUser(env: Env, req: Request): Promise<SessionUser | null> {
  const token = readCookie(req, COOKIE);
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return null;
  const id = await sha256Hex(token);
  return env.DB.prepare(
    `SELECT u.id, u.email, u.full_name, u.phone, u.role
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.id = ?1 AND s.expires_at > ?2 AND u.is_active = 1`,
  )
    .bind(id, now())
    .first<SessionUser>();
}

/** Deletes the session and returns a Set-Cookie value that clears the cookie. */
export async function destroySession(env: Env, req: Request): Promise<string> {
  const token = readCookie(req, COOKIE);
  if (token && /^[0-9a-f]{64}$/.test(token)) {
    await env.DB.prepare("DELETE FROM sessions WHERE id = ?1").bind(await sha256Hex(token)).run();
  }
  return cookie("", 0);
}
