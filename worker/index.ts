import type { Env } from "./types";
import { HttpError, json } from "./lib/http";
import { auditLog, overview } from "./routes/admin";
import { login, logout, me, register } from "./routes/auth";
import { createOwner, setupStatus } from "./routes/setup";

async function route(req: Request, env: Env, path: string): Promise<Response> {
  switch (`${req.method} ${path}`) {
    case "GET /api/health":
      return json({ ok: true, service: "mahboobah-stitches", phase: 2 });
    case "GET /api/auth/me":
      return me(env, req);
    case "POST /api/auth/register":
      return register(env, req);
    case "POST /api/auth/login":
      return login(env, req);
    case "POST /api/auth/logout":
      return logout(env, req);
    case "GET /api/setup/status":
      return setupStatus(env);
    case "POST /api/setup/owner":
      return createOwner(env, req);
    case "GET /api/admin/overview":
      return overview(env, req);
    case "GET /api/admin/audit":
      return auditLog(env, req);
    default:
      throw new HttpError(404, "Not found.");
  }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(req);
    try {
      return await route(req, env, url.pathname);
    } catch (err) {
      if (err instanceof HttpError) return json({ error: err.message }, err.status);
      console.error("unhandled error", err);
      return json({ error: "Something went wrong. Please try again." }, 500);
    }
  },
};
