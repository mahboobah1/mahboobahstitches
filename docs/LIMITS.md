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
