import type { Env } from "./types";
import { HttpError, json } from "./lib/http";
import { auditLog, overview } from "./routes/admin";
import * as cat from "./routes/adminCatalogue";
import * as cms from "./routes/adminContent";
import { login, logout, me, register } from "./routes/auth";
import * as pub from "./routes/public";
import { createOwner, setupStatus } from "./routes/setup";

type Params = Record<string, string>;
type Handler = (env: Env, req: Request, params: Params) => Promise<Response> | Response;

const routes: [string, string, Handler][] = [
  ["GET", "/api/health", () => json({ ok: true, service: "mahboobah-stitches", phase: 3 })],
  ["GET", "/api/auth/me", (e, r) => me(e, r)],
  ["POST", "/api/auth/register", (e, r) => register(e, r)],
  ["POST", "/api/auth/login", (e, r) => login(e, r)],
  ["POST", "/api/auth/logout", (e, r) => logout(e, r)],
  ["GET", "/api/setup/status", (e) => setupStatus(e)],
  ["POST", "/api/setup/owner", (e, r) => createOwner(e, r)],
  // public storefront data
  ["GET", "/api/catalogue", (e) => pub.catalogue(e)],
  ["GET", "/api/site", (e) => pub.siteSettings(e)],
  ["GET", "/api/media/:id", pub.media],
  ["GET", "/api/content/journal", (e) => pub.journalList(e)],
  ["GET", "/api/content/pages/:slug", pub.publicPage],
  // admin
  ["GET", "/api/admin/overview", (e, r) => overview(e, r)],
  ["GET", "/api/admin/audit", (e, r) => auditLog(e, r)],
  ["GET", "/api/admin/collections", (e, r) => cat.listCollections(e, r)],
  ["POST", "/api/admin/collections", (e, r) => cat.createCollection(e, r)],
  ["PUT", "/api/admin/collections/:id", cat.updateCollection],
  ["POST", "/api/admin/categories", (e, r) => cat.createCategory(e, r)],
  ["PUT", "/api/admin/categories/:id", cat.updateCategory],
  ["DELETE", "/api/admin/categories/:id", cat.deleteCategory],
  ["GET", "/api/admin/products", (e, r) => cat.listProducts(e, r)],
  ["POST", "/api/admin/products", (e, r) => cat.createProduct(e, r)],
  ["GET", "/api/admin/products/:id", cat.getProduct],
  ["PUT", "/api/admin/products/:id", cat.updateProduct],
  ["POST", "/api/admin/products/:id/variants", cat.createVariant],
  ["POST", "/api/admin/products/:id/images", cat.addImage],
  ["PUT", "/api/admin/products/:id/image-order", cat.reorderImages],
  ["PUT", "/api/admin/variants/:id", cat.updateVariant],
  ["POST", "/api/admin/variants/:id/stock", cat.adjustStock],
  ["GET", "/api/admin/variants/:id/movements", cat.movements],
  ["GET", "/api/admin/inventory", (e, r) => cat.listInventory(e, r)],
  ["POST", "/api/admin/media", (e, r) => cat.uploadMedia(e, r)],
  ["PUT", "/api/admin/images/:id", cat.updateImage],
  ["DELETE", "/api/admin/images/:id", cat.deleteImage],
  ["GET", "/api/admin/pages", (e, r) => cms.listPages(e, r)],
  ["POST", "/api/admin/pages", (e, r) => cms.createPage(e, r)],
  ["GET", "/api/admin/pages/:id", cms.getPage],
  ["PUT", "/api/admin/pages/:id", cms.updatePage],
  ["DELETE", "/api/admin/pages/:id", cms.deletePage],
  ["GET", "/api/admin/settings", (e, r) => cms.getSettings(e, r)],
  ["PUT", "/api/admin/settings", (e, r) => cms.saveSettings(e, r)],
  ["GET", "/api/admin/staff", (e, r) => cms.listStaff(e, r)],
  ["PUT", "/api/admin/users/:id", cms.updateUser],
];

function match(pattern: string, path: string): Params | null {
  const a = pattern.split("/");
  const b = path.split("/");
  if (a.length !== b.length) return null;
  const params: Params = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith(":")) params[a[i].slice(1)] = decodeURIComponent(b[i]);
    else if (a[i] !== b[i]) return null;
  }
  return params;
}

async function route(req: Request, env: Env, path: string): Promise<Response> {
  let pathMatched = false;
  for (const [method, pattern, handler] of routes) {
    const params = match(pattern, path);
    if (!params) continue;
    pathMatched = true;
    if (method === req.method) return handler(env, req, params);
  }
  throw new HttpError(pathMatched ? 405 : 404, pathMatched ? "Method not allowed." : "Not found.");
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
