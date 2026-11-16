import type { Env } from "../types";
import { assertSameOrigin, clientIp } from "./http";
import { requirePermission, type Permission, type SessionUser } from "./permissions";
import { getSessionUser } from "./session";

/** Every admin route starts here: same-origin check for writes, then a server-side permission check. */
export async function guard(env: Env, req: Request, ...anyOf: Permission[]): Promise<SessionUser> {
  assertSameOrigin(req);
  const user = await getSessionUser(env, req);
  let last: unknown;
  for (const p of anyOf) {
    try {
      return requirePermission(user, p);
    } catch (e) {
      last = e;
    }
  }
  throw last;
}

export const ip = clientIp;
