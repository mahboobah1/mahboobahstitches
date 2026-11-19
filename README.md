# Mahboobah Stitches

Modest fashion e-commerce: React + Vite + TypeScript + Tailwind on Cloudflare Pages,
with a Cloudflare Workers / D1 backend arriving in later phases.

## Status: Phase 4 (checkout, payments, orders)
Added: guest and signed-in checkout, server-side pricing, 30-minute stock holds, Paystack payments with server verification
and signed webhooks, order pages and emails-by-Paystack receipts, My orders / My addresses, admin Orders, Payments and Discount
codes, real paid-revenue on the dashboard. Setup: `docs/PAYSTACK-SETUP.md`.

## Phase 3b (photos, collections, photo library)
Added: 19 products and a new Two-Piece Sets collection created from your photos; collection covers and homepage
pictures; an admin photo picker that lists everything in `public/images/` (rebuilt on every deploy by
`scripts/make-image-manifest.mjs`); "Price on request" products that send customers to WhatsApp.

## Phase 3 (catalogue and content management)
Added in Phase 3: product, variant, stock and photo management; collections and categories; a content editor
for About, FAQ, Policies and Journal; business settings; staff roles. The storefront now shows only real data from
the database. See `docs/ADMIN-GUIDE.md`.

## Phase 2 (backend foundation)
Added in Phase 2: D1 database schema (migrations/), secure sign-in, customer accounts, one-time owner setup,
role-based permissions, audit log, rate limiting, and a protected /admin overview with live counts.
Backend code: `worker/`. Setup: `docs/SETUP-CLOUDFLARE.md`.

## Phase 1 (storefront)
Working now: homepage, shop with search, filter and sort, collections, product pages with variant
selection, cart (saved on the device), wishlist, WhatsApp click-to-chat ordering, contact page, brand logo.

Not built yet (these pages say so honestly): checkout and payments, accounts, bespoke form, bookings,
gift studio, admin, database. See docs/ for limits and deployment.

## Where to edit
- Business details and WhatsApp number: `src/config/site.ts`
- Collections: `src/data/collections.ts`
- Demo products (temporary): `src/data/demo-products.ts`
- Brand colours and fonts: `tailwind.config.js`, `src/styles/index.css`
- Logo files: `public/brand/`

## Commands (only if you have a computer or Codespaces)
npm install, npm run dev, npm run build, npm run typecheck

## Rules
No secrets in the repository. See `.env.example`.
