import type { Env } from "./types";
import { HttpError, json } from "./lib/http";
import { auditLog, overview } from "./routes/admin";
import * as ord from "./routes/adminOrders";
import * as co from "./routes/checkout";
import { releaseExpired } from "./lib/orders";
import { applySeo, robotsTxt, seoFor, sitemapXml } from "./lib/seo";
import { cleanOrphanUploads } from "./lib/media";
import * as bsp from "./routes/bespoke";
import * as bk from "./routes/bookings";
import * as gf from "./routes/gifts";
import * as ins from "./routes/insights";
import * as rv from "./routes/reviews";
import * as sh from "./routes/shipping";
import * as cat from "./routes/adminCatalogue";
import * as cms from "./routes/adminContent";
import { login, logout, me, register } from "./routes/auth";
import * as pub from "./routes/public";
import { createOwner, setupStatus } from "./routes/setup";

type Params = Record<string, string>;
type Handler = (env: Env, req: Request, params: Params) => Promise<Response> | Response;

const routes: [string, string, Handler][] = [
  ["GET", "/api/health", () => json({ ok: true, service: "mahboobah-stitches", phase: 7 })],
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
  // checkout, orders, payments
  ["GET", "/api/checkout/config", (e) => co.checkoutConfig(e)],
  ["POST", "/api/checkout/quote", (e, r) => co.quoteRoute(e, r)],
  ["POST", "/api/checkout", (e, r) => co.placeOrder(e, r)],
  ["GET", "/api/orders/:number", co.getOrder],
  ["POST", "/api/orders/:number/verify", co.verifyOrder],
  ["POST", "/api/orders/:number/pay", co.payAgain],
  ["POST", "/api/webhooks/paystack", (e, r) => co.paystackWebhook(e, r)],
  ["GET", "/api/account/orders", (e, r) => co.accountOrders(e, r)],
  ["GET", "/api/account/addresses", (e, r) => co.listAddresses(e, r)],
  ["POST", "/api/account/addresses", (e, r) => co.saveAddress(e, r)],
  ["DELETE", "/api/account/addresses/:id", co.deleteAddress],
  // bespoke tailoring
  ["GET", "/api/bespoke/config", () => bsp.bespokeConfig()],
  ["POST", "/api/bespoke/uploads", (e, r) => bsp.uploadReference(e, r)],
  ["POST", "/api/bespoke", (e, r) => bsp.submitBespoke(e, r)],
  ["GET", "/api/bespoke/:ref", bsp.viewBespoke],
  ["POST", "/api/bespoke/:ref/message", bsp.customerMessage],
  ["POST", "/api/bespoke/:ref/respond", bsp.customerRespond],
  ["GET", "/api/account/bespoke", (e, r) => bsp.accountBespoke(e, r)],
  // bookings
  ["GET", "/api/bookings/config", (e) => bk.bookingConfig(e)],
  ["GET", "/api/bookings/days", (e, r) => bk.bookingDays(e, r)],
  ["GET", "/api/bookings/slots", (e, r) => bk.bookingSlots(e, r)],
  ["POST", "/api/bookings", (e, r) => bk.createBooking(e, r)],
  ["GET", "/api/bookings/:ref", bk.getBooking],
  ["GET", "/api/bookings/:ref/ics", bk.bookingIcs],
  ["POST", "/api/bookings/:ref/cancel", bk.cancelBooking],
  ["POST", "/api/bookings/:ref/reschedule", bk.rescheduleBooking],
  ["GET", "/api/account/bookings", (e, r) => bk.accountBookings(e, r)],
  // shipping and gifts (public)
  ["GET", "/api/shipping/countries", (e) => sh.publicCountries(e)],
  ["GET", "/api/shipping/options", (e, r) => sh.publicOptions(e, r)],
  ["GET", "/api/gifts", (e) => gf.publicGifts(e)],
  // reviews, newsletter (public)
  ["GET", "/api/products/:slug/reviews", rv.productReviews],
  ["POST", "/api/reviews", (e, r) => rv.submitReview(e, r)],
  ["GET", "/api/reviews/featured", (e) => rv.featuredReviews(e)],
  ["POST", "/api/newsletter", (e, r) => ins.subscribe(e, r)],
  // admin
  ["GET", "/api/admin/analytics", (e, r) => ins.analytics(e, r)],
  ["GET", "/api/admin/customers", (e, r) => ins.listCustomers(e, r)],
  ["GET", "/api/admin/customers/:id", ins.getCustomer],
  ["GET", "/api/admin/export/orders.csv", (e, r) => ins.exportOrders(e, r)],
  ["GET", "/api/admin/export/customers.csv", (e, r) => ins.exportCustomers(e, r)],
  ["GET", "/api/admin/export/subscribers.csv", (e, r) => ins.exportSubscribers(e, r)],
  ["GET", "/api/admin/subscribers", (e, r) => ins.listSubscribers(e, r)],
  ["DELETE", "/api/admin/subscribers/:id", ins.removeSubscriber],
  ["GET", "/api/admin/reviews", (e, r) => rv.adminReviews(e, r)],
  ["PUT", "/api/admin/reviews/:id", rv.moderateReview],
  ["GET", "/api/admin/shipping", (e, r) => sh.adminShipping(e, r)],
  ["POST", "/api/admin/shipping/zones", (e, r) => sh.createZone(e, r)],
  ["PUT", "/api/admin/shipping/zones/:id", sh.updateZone],
  ["DELETE", "/api/admin/shipping/zones/:id", sh.deleteZone],
  ["POST", "/api/admin/shipping/zones/:id/rates", sh.createRate],
  ["PUT", "/api/admin/shipping/rates/:id", sh.updateRate],
  ["DELETE", "/api/admin/shipping/rates/:id", sh.deleteRate],
  ["POST", "/api/admin/orders/:id/shipments", sh.createShipment],
  ["PUT", "/api/admin/shipments/:id", sh.updateShipment],
  ["GET", "/api/admin/gifts", (e, r) => gf.adminGifts(e, r)],
  ["POST", "/api/admin/gifts", (e, r) => gf.createBundle(e, r)],
  ["PUT", "/api/admin/gifts/:id", gf.updateBundle],
  ["PUT", "/api/admin/gifts/:id/items", gf.setItems],
  ["PUT", "/api/admin/gifts/:id/slots", gf.setSlots],
  ["POST", "/api/admin/gift-packaging", (e, r) => gf.createPackaging(e, r)],
  ["PUT", "/api/admin/gift-packaging/:id", gf.updatePackaging],
  ["GET", "/api/admin/bespoke", (e, r) => bsp.adminList(e, r)],
  ["GET", "/api/admin/bespoke/:id", bsp.adminGet],
  ["PUT", "/api/admin/bespoke/:id/status", bsp.adminStatus],
  ["POST", "/api/admin/bespoke/:id/message", bsp.adminMessage],
  ["PUT", "/api/admin/bespoke/:id/quote", bsp.adminQuote],
  ["POST", "/api/admin/bespoke/:id/convert", bsp.adminConvert],
  ["POST", "/api/admin/bespoke/:id/new-link", bsp.adminNewLink],
  ["GET", "/api/admin/bookings", (e, r) => bk.adminList(e, r)],
  ["GET", "/api/admin/bookings/:id", bk.adminGet],
  ["PUT", "/api/admin/bookings/:id/status", bk.adminStatus],
  ["POST", "/api/admin/bookings/:id/reschedule", bk.adminReschedule],
  ["POST", "/api/admin/bookings/:id/new-link", bk.adminNewLink],
  ["GET", "/api/admin/booking-config", (e, r) => bk.adminConfig(e, r)],
  ["PUT", "/api/admin/booking-settings", (e, r) => bk.adminSaveSettings(e, r)],
  ["POST", "/api/admin/booking-types", (e, r) => bk.adminCreateType(e, r)],
  ["PUT", "/api/admin/booking-types/:id", bk.adminUpdateType],
  ["POST", "/api/admin/availability", (e, r) => bk.adminAddRule(e, r)],
  ["DELETE", "/api/admin/availability/:id", bk.adminDeleteRule],
  ["POST", "/api/admin/closed-dates", (e, r) => bk.adminAddClosed(e, r)],
  ["DELETE", "/api/admin/closed-dates/:date", bk.adminDeleteClosed],
  ["GET", "/api/admin/orders", (e, r) => ord.listOrders(e, r)],
  ["GET", "/api/admin/orders/:id", ord.getOrderAdmin],
  ["PUT", "/api/admin/orders/:id/status", ord.setOrderStatus],
  ["POST", "/api/admin/orders/:id/mark-paid", ord.markPaidManually],
  ["POST", "/api/admin/orders/:id/note", ord.addOrderNote],
  ["GET", "/api/admin/payments", (e, r) => ord.listPayments(e, r)],
  ["GET", "/api/admin/promotions", (e, r) => ord.listPromotions(e, r)],
  ["POST", "/api/admin/promotions", (e, r) => ord.createPromotion(e, r)],
  ["PUT", "/api/admin/promotions/:id", ord.updatePromotion],
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
  ["GET", "/api/admin/media", (e, r) => cat.listMedia(e, r)],
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
  /** Runs on the schedule in wrangler.toml: gives stock back from orders whose payment window ran out. */
  async scheduled(_c: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(Promise.all([releaseExpired(env), cleanOrphanUploads(env)]).then(() => undefined));
  },
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (!url.pathname.startsWith("/api/")) {
      if (req.method !== "GET") return env.ASSETS.fetch(req);
      if (url.pathname === "/sitemap.xml") return new Response(await sitemapXml(env, url.origin), { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=300" } });
      if (url.pathname === "/robots.txt") return new Response(robotsTxt(url.origin), { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=300" } });
      const res = await env.ASSETS.fetch(req);
      if (!(res.headers.get("content-type") ?? "").includes("text/html")) return res;
      // Fill in share/search tags for product, collection, journal and info pages. Any problem falls back to the plain page.
      try {
        const seo = await seoFor(env, url);
        return seo ? applySeo(res, seo) : res;
      } catch (e) {
        console.error("seo failed", e);
        return res;
      }
    }
    try {
      return await route(req, env, url.pathname);
    } catch (err) {
      if (err instanceof HttpError) return json({ error: err.message }, err.status);
      console.error("unhandled error", err);
      return json({ error: "Something went wrong. Please try again." }, 500);
    }
  },
};
