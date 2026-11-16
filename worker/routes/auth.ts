import type { Env } from "../types";
import { audit } from "../lib/audit";
import { DUMMY_HASH, hashPassword, iterationsFrom, verifyPassword } from "../lib/crypto";
import { HttpError, assertSameOrigin, clientIp, json, readJson } from "../lib/http";
import { permissionsFor, type Role, type SessionUser } from "../lib/permissions";
import { rateLimit } from "../lib/ratelimit";
import { createSession, destroySession, getSessionUser } from "../lib/session";
import * as v from "../lib/validate";

export const publicUser = (u: SessionUser) => ({
  id: u.id,
  email: u.email,
  fullName: u.full_name,
  role: u.role,
  permissions: permissionsFor(u.role),
});

export async function me(env: Env, req: Request): Promise<Response> {
  const user = await getSessionUser(env, req);
  return json({ user: user ? publicUser(user) : null });
}

export async function register(env: Env, req: Request): Promise<Response> {
  assertSameOrigin(req);
  const ip = clientIp(req);
  await rateLimit(env, `register:ip:${ip}`, 10, 3600);
  const body = await readJson(req);
  const fullName = v.text(body.fullName, "Your name", 2, 80);
  const emailAddr = v.email(body.email);
  const pw = v.password(body.password);
  const phone = v.optionalPhone(body.phone);

  const id = crypto.randomUUID();
  const hash = await hashPassword(pw, iterationsFrom(env.PBKDF2_ITERATIONS));
  try {
    await env.DB.batch([
      env.DB.prepare("INSERT INTO users (id, email, password_hash, full_name, phone, role) VALUES (?1, ?2, ?3, ?4, ?5, 'CUSTOMER')").bind(id, emailAddr, hash, fullName, phone),
      env.DB.prepare("INSERT INTO customer_profiles (user_id) VALUES (?1)").bind(id),
    ]);
  } catch (err) {
    if (String(err).includes("UNIQUE")) throw new HttpError(409, "That email may already have an account. Try signing in.");
    throw err;
  }
  const setCookie = await createSession(env, id, req);
  await audit(env, { actor: id, action: "auth.register", entity: "user", entityId: id, ip });
  const user: SessionUser = { id, email: emailAddr, full_name: fullName, phone, role: "CUSTOMER" as Role };
  return json({ user: publicUser(user) }, 201, { "set-cookie": setCookie });
}

export async function login(env: Env, req: Request): Promise<Response> {
  assertSameOrigin(req);
  const ip = clientIp(req);
  await rateLimit(env, `login:ip:${ip}`, 20, 900);
  const body = await readJson(req);
  const emailAddr = v.email(body.email);
  const pw = typeof body.password === "string" ? body.password.slice(0, 128) : "";
  await rateLimit(env, `login:email:${emailAddr}`, 8, 900);

  const row = await env.DB.prepare(
    "SELECT id, email, password_hash, full_name, phone, role, is_active FROM users WHERE email = ?1",
  )
    .bind(emailAddr)
    .first<SessionUser & { password_hash: string; is_active: number }>();

  // Always do one hash comparison so timing does not reveal whether the email exists.
  const valid = await verifyPassword(pw, row ? row.password_hash : DUMMY_HASH);
  if (!row || !valid || row.is_active !== 1) {
    await audit(env, { actor: row?.id ?? null, action: "auth.login_failed", ip, meta: { email: emailAddr } });
    throw new HttpError(401, "Incorrect email or password.");
  }
  const setCookie = await createSession(env, row.id, req);
  await audit(env, { actor: row.id, action: "auth.login", entity: "user", entityId: row.id, ip });
  const user: SessionUser = { id: row.id, email: row.email, full_name: row.full_name, phone: row.phone, role: row.role };
  return json({ user: publicUser(user) }, 200, { "set-cookie": setCookie });
}

export async function logout(env: Env, req: Request): Promise<Response> {
  assertSameOrigin(req);
  const user = await getSessionUser(env, req);
  const clear = await destroySession(env, req);
  if (user) await audit(env, { actor: user.id, action: "auth.logout", ip: clientIp(req) });
  return json({ ok: true }, 200, { "set-cookie": clear });
}
