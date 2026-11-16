# Mahboobah Stitches

Modest fashion e-commerce: React + Vite + TypeScript + Tailwind on Cloudflare Pages,
with a Cloudflare Workers / D1 backend arriving in later phases.

## Status: Phase 2 (backend foundation)
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
