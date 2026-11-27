import type { Env } from "../types";
import { readSnapshot } from "./snapshot";

/**
 * Search and social-sharing support. The website is a single-page app, so link previews (WhatsApp, Facebook) and search
 * crawlers need the page details in the HTML itself. For product, collection, journal and info pages the Worker fills in
 * the title, description, share picture, canonical address and product structured data (JSON-LD) before sending the page.
 */
export interface Seo { title: string; description: string; image: string | null; type: "website" | "product" | "article"; canonical: string; jsonLd: unknown | null }

const SITE = "Mahboobah Stitches";
const clip = (s: string, n = 155) => { const t = s.replace(/[#*_`>\-]+/g, " ").replace(/\s+/g, " ").trim(); return t.length <= n ? t : t.slice(0, n - 1).trimEnd() + "…"; };
const abs = (origin: string, p: string | null | undefined) => (p ? (p.startsWith("http") ? p : origin + p) : null);
export const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/** JSON for a <script> tag: "<" is escaped so text can never close the tag early. */
export const jsonLdText = (o: unknown) => JSON.stringify(o).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");

interface SnapProduct { slug: string; name: string; description: string; collectionName: string; images: { url: string; alt: string }[]; variants: { sku: string; priceMinor: number; currency: string; available: boolean }[]; rating: { count: number; average: number } | null }
interface Snap { generatedAt: number; collections: { slug: string; name: string; blurb: string; imageUrl: string; productCount: number }[]; products: SnapProduct[] }

export async function seoFor(env: Env, url: URL): Promise<Seo | null> {
  const origin = url.origin;
  const path = url.pathname.replace(/\/+$/, "");
  const canonical = origin + path;
  let m = path.match(/^\/product\/([a-z0-9-]+)$/);
  if (m) {
    const snap = JSON.parse(await readSnapshot(env)) as Snap;
    const p = snap.products.find((x) => x.slug === m![1]);
    if (!p) return null;
    const priced = p.variants.filter((v) => v.priceMinor > 0);
    const prices = priced.map((v) => v.priceMinor);
    const cur = p.variants[0]?.currency ?? "NGN";
    const inStock = p.variants.some((v) => v.available);
    const offers = priced.length === 0 ? undefined : Math.min(...prices) === Math.max(...prices)
      ? { "@type": "Offer", price: (prices[0] / 100).toFixed(2), priceCurrency: cur, availability: `https://schema.org/${inStock ? "InStock" : "OutOfStock"}`, url: canonical }
      : { "@type": "AggregateOffer", lowPrice: (Math.min(...prices) / 100).toFixed(2), highPrice: (Math.max(...prices) / 100).toFixed(2), priceCurrency: cur, offerCount: priced.length, availability: `https://schema.org/${inStock ? "InStock" : "OutOfStock"}`, url: canonical };
    const image = abs(origin, p.images[0]?.url);
    return {
      title: `${p.name} | ${SITE}`, description: clip(p.description || `${p.name} from ${SITE}. Modest fashion, custom styles and thoughtful gifts.`), image, type: "product", canonical,
      jsonLd: { "@context": "https://schema.org", "@type": "Product", name: p.name, description: clip(p.description || p.name, 500), sku: p.variants[0]?.sku, image: p.images.map((i) => abs(origin, i.url)), brand: { "@type": "Brand", name: SITE }, category: p.collectionName, url: canonical, ...(offers ? { offers } : {}), ...(p.rating && p.rating.count > 0 ? { aggregateRating: { "@type": "AggregateRating", ratingValue: p.rating.average, reviewCount: p.rating.count } } : {}) },
    };
  }
  m = path.match(/^\/collections\/([a-z0-9-]+)$/);
  if (m) {
    const snap = JSON.parse(await readSnapshot(env)) as Snap;
    const c = snap.collections.find((x) => x.slug === m![1]);
    if (!c) return null;
    return { title: `${c.name} | ${SITE}`, description: clip(c.blurb || `Shop the ${c.name} at ${SITE}.`), image: abs(origin, c.imageUrl), type: "website", canonical, jsonLd: null };
  }
  m = path.match(/^\/(?:journal\/)?([a-z0-9-]+)$/);
  if (m && (path.startsWith("/journal/") || ["about", "faq", "policies"].includes(m[1]))) {
    const row = await env.DB.prepare("SELECT kind, title, body, published_at FROM content_pages WHERE slug=?1 AND is_published=1").bind(m[1]).first<{ kind: string; title: string; body: string; published_at: number | null }>();
    if (!row) return null;
    const article = row.kind === "journal";
    return {
      title: `${row.title} | ${SITE}`, description: clip(row.body), image: null, type: article ? "article" : "website", canonical,
      jsonLd: article ? { "@context": "https://schema.org", "@type": "BlogPosting", headline: row.title, description: clip(row.body), datePublished: row.published_at ? new Date(row.published_at * 1000).toISOString() : undefined, author: { "@type": "Organization", name: SITE }, mainEntityOfPage: canonical } : null,
    };
  }
  return null;
}

export async function sitemapXml(env: Env, origin: string): Promise<string> {
  const snap = JSON.parse(await readSnapshot(env)) as Snap;
  const pages = await env.DB.prepare("SELECT slug, kind, updated_at FROM content_pages WHERE is_published=1 ORDER BY updated_at DESC LIMIT 500").all<{ slug: string; kind: string; updated_at: number }>();
  const urls: { loc: string; lastmod?: string }[] = ["/", "/shop", "/collections", "/gift-studio", "/bespoke", "/bookings", "/journal", "/contact"].map((p) => ({ loc: origin + p }));
  for (const c of snap.collections.filter((x) => x.productCount > 0)) urls.push({ loc: `${origin}/collections/${c.slug}` });
  for (const p of snap.products) urls.push({ loc: `${origin}/product/${p.slug}` });
  for (const pg of pages.results) urls.push({ loc: pg.kind === "journal" ? `${origin}/journal/${pg.slug}` : `${origin}/${pg.slug}`, lastmod: new Date(pg.updated_at * 1000).toISOString().slice(0, 10) });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${escapeHtml(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}</url>`).join("\n")}\n</urlset>\n`;
}

export const robotsTxt = (origin: string) =>
  `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /account\nDisallow: /checkout\nDisallow: /order/\nDisallow: /bespoke/request/\nDisallow: /bookings/\nDisallow: /api/\n\nSitemap: ${origin}/sitemap.xml\n`;

/** Rewrites the page head (title, description, share tags, canonical, structured data) as the HTML streams through. */
export function applySeo(res: Response, seo: Seo): Response {
  const setContent = (v: string) => ({ element(e: { setAttribute(n: string, v: string): void }) { e.setAttribute("content", v); } });
  let rw = new HTMLRewriter()
    .on("title", { element(e) { e.setInnerContent(seo.title); } })
    .on('meta[name="description"]', setContent(seo.description))
    .on('meta[property="og:title"]', setContent(seo.title))
    .on('meta[property="og:description"]', setContent(seo.description))
    .on('meta[property="og:type"]', setContent(seo.type === "product" ? "product" : seo.type));
  if (seo.image) rw = rw.on('meta[property="og:image"]', setContent(seo.image));
  rw = rw.on("head", {
    element(e) {
      e.append(
        `<link rel="canonical" href="${escapeHtml(seo.canonical)}" />\n<meta property="og:url" content="${escapeHtml(seo.canonical)}" />\n<meta name="twitter:card" content="summary_large_image" />\n<meta name="twitter:title" content="${escapeHtml(seo.title)}" />\n<meta name="twitter:description" content="${escapeHtml(seo.description)}" />` +
          (seo.jsonLd ? `\n<script type="application/ld+json">${jsonLdText(seo.jsonLd)}</script>` : ""),
        { html: true },
      );
    },
  });
  return rw.transform(res);
}
