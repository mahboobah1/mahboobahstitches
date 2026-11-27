# Free-tier limits (checked 15 Nov 2026 against Cloudflare's documentation)

Limits can change. Re-check https://developers.cloudflare.com/workers/platform/pricing/ before launch.

| Service | Free allowance | At the limit |
|---|---|---|
| Static website files | Unlimited requests | Nothing |
| Worker (the API) | 100,000 requests per day, 10 ms CPU per request | Requests fail until 00:00 UTC |
| D1 database | 5 million rows read/day, 100,000 rows written/day, 5 GB | Queries fail until the daily reset |

## How we stay inside them
- Browsing pages is static and never calls the API.
- Each sign-in writes a few rows (session, audit, rate limit), which is tiny against 100,000 per day.
- Every filter column is indexed, because D1 counts rows scanned.
- Upgrading is $5 per month for Workers Paid. We never do this without your approval.

## Known risk: password hashing CPU
Passwords use PBKDF2-SHA256 at 100,000 rounds, the maximum Cloudflare allows. It took about 22 ms in a Node test
here. The free plan allows 10 ms of CPU per request, and I have not confirmed how Cloudflare counts native
cryptography. Your first owner setup is the real test. See docs/SETUP-CLOUDFLARE.md for the fallback.

## Not free or not yet verified
- Outbound email: no free sender on Cloudflare. Chosen in Phase 7.
- R2 image storage: free allowance, but may need a payment method on file. Optional.
- Paystack: transaction fees apply and business eligibility must be confirmed with Paystack.

## Phase 3 additions
- Photos are stored in the D1 database (free) and resized on the phone to about 600 KB or less. D1 has 5 GB in total,
  so roughly 5,000 photos. Moving to Cloudflare R2 later only changes where files are stored.
- Serving a photo decodes it in the Worker. Browsers cache photos for a year, so this is rare, but a very busy day
  with many uncached photos would use more of the 10 ms CPU allowance. If photos fail to load under heavy traffic,
  R2 is the fix.
- The shop's product list is pre-built into one database row after each admin change, so a shop visit costs one
  row read however many products there are.

## Phase 4 additions
- A checkout writes roughly 15 to 30 database rows (order, items, holds, events, payment) and a paid order a few more.
  Against the free 100,000 writes per day that is thousands of orders, far above a boutique's volume.
- Each purchase uses about 6 to 10 Worker requests (price check, checkout, return page, webhook). Well inside 100,000 per day.
- A scheduled job runs every 15 minutes to release expired stock holds (cron triggers are included on the free plan, but I have not confirmed this from Cloudflare's current docs). If it is unavailable, holds are still released whenever someone checks out.
- Paystack charges fees on each transaction and may apply limits to unregistered (starter) businesses. Confirm both with Paystack.

## Phase 5 additions
- Customer reference photos are stored in the database like product photos (up to 5 per request, each resized to about 560 KB or less). They are removed after a day if never attached to a request.
- Booking pages call the API to list free days and times: about 3 to 5 requests per visit, well inside the 100,000 per day.
- A booking uses a few database rows. Opening hours are checked on the server every time, so the free times can never go out of date.

## Phase 6 and 7 additions
- IMPORTANT: product, collection, journal, About, FAQ and Policies pages are now served through the Worker (to add search and sharing tags). Each view of those pages counts as one Worker request and reads one database row. The free allowance is 100,000 requests and 5 million row reads per day, so roughly 30,000 or more page views a day before you would need a paid plan. Shop, cart and other pages are still plain static files.
- The sitemap and robots.txt are built on demand (one small database read each).
- Analytics queries read order rows for the chosen period; they are only run when you open the Analytics page.
- Shipping rates are fixed prices you set. There is no live courier pricing.
- Only naira is charged. Other currencies are not offered at checkout.
