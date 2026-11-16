import type { Env } from "../types";
import { audit } from "../lib/audit";
import { hashPassword, iterationsFrom, safeEqual } from "../lib/crypto";
import { HttpError, assertSameOrigin, clientIp, json, readJson } from "../lib/http";
import { rateLimit } from "../lib/ratelimit";
import { createSession } from "../lib/session";
import * as v from "../lib/validate";
import { publicUser } from "./auth";

const hasOwner = async (env: Env): Promise<boolean> =>
  (await env.DB.prepare("SELECT 1 AS x FROM users WHERE role = 'OWNER' LIMIT 1").first()) !== null;

export async function setupStatus(env: Env): Promise<Response> {
  return json({ needsOwner: !(await hasOwner(env)), tokenConfigured: Boolean(env.SETUP_TOKEN) });
}

/**
 * One-time creation of the first OWNER. Requires the SETUP_TOKEN secret, which only the
 * person who controls the GitHub/Cloudflare deployment knows. Refuses once an owner exists.
 */
export async function createOwner(env: Env, req: Request): Promise<Response> {
  assertSameOrigin(req);
  const ip = clientIp(req);
  await rateLimit(env, `setup:ip:${ip}`, 5, 3600);
  if (!env.SETUP_TOKEN) throw new HttpError(503, "Setup is not configured yet.");
  if (await hasOwner(env)) throw new HttpError(409, "An owner account already exists.");

  const body = await readJson(req);
  const provided = typeof body.setupToken === "string" ? body.setupToken : "";
  if (!(await safeEqual(provided, env.SETUP_TOKEN))) {
    await audit(env, { actor: null, action: "setup.bad_token", ip });
    throw new HttpError(403, "That setup code is not correct.");
  }
  const fullName = v.text(body.fullName, "Your name", 2, 80);
  const emailAddr = v.email(body.email);
  const pw = v.password(body.password);

  const id = crypto.randomUUID();
  const hash = await hashPassword(pw, iterationsFrom(env.PBKDF2_ITERATIONS));
  let changes = 0;
  try {
    // Atomic: inserts only if no OWNER exists at this instant, so two requests cannot both win.
    const res = await env.DB.prepare(
      `INSERT INTO users (id, email, password_hash, full_name, role)
       SELECT ?1, ?2, ?3, ?4, 'OWNER' WHERE NOT EXISTS (SELECT 1 FROM users WHERE role = 'OWNER')`,
    )
      .bind(id, emailAddr, hash, fullName)
      .run();
    changes = res.meta.changes ?? 0;
  } catch (err) {
    if (String(err).includes("UNIQUE")) throw new HttpError(409, "That email is already registered. Use a different email for the owner.");
    throw err;
  }
  if (changes !== 1) throw new HttpError(409, "An owner account already exists.");

  await env.DB.prepare("INSERT INTO customer_profiles (user_id) VALUES (?1)").bind(id).run();
  const setCookie = await createSession(env, id, req);
  await audit(env, { actor: id, action: "setup.owner_created", entity: "user", entityId: id, ip });
  return json(
    { user: publicUser({ id, email: emailAddr, full_name: fullName, phone: null, role: "OWNER" }) },
    201,
    { "set-cookie": setCookie },
  );
}
