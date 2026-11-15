# Free-tier limits (checked 15 Nov 2026 against Cloudflare's documentation)

Limits can change. Re-check https://developers.cloudflare.com/workers/platform/pricing/ before launch.

| Service | Free allowance | What happens at the limit |
|---|---|---|
| Pages static files (the storefront pages and images) | Unlimited requests | Nothing |
| Workers / Pages Functions (the API) | 100,000 requests per day, 10 ms CPU per request | Requests fail until 00:00 UTC |
| D1 database | 5 million rows read/day, 100,000 rows written/day, 5 GB total | Queries fail until the daily reset |

## Design rules that keep us inside the free tier
- Phase 1 makes no API calls at all. Browsing is served as static files.
- Every database filter and sort column gets an index (D1 counts rows scanned, not rows returned).
- Product listings will be cached so browsing does not use the API on every view.
- Upgrading to Workers Paid is $5 per month. We never do this without your approval.

## Not free or not yet verified
- Outbound email: no free sender on Cloudflare. To be chosen in Phase 7 after checking limits.
- Cloudflare R2 (image uploads): has a free allowance but may need a payment method on file. Optional, later.
- Paystack: no monthly fee is assumed, but transaction fees apply and business eligibility must be confirmed with Paystack.
