# One-time Cloudflare setup (Android, free, no card)

You do this once. After it, every change you commit to GitHub deploys by itself.

## 1. Free Cloudflare account
1. Go to dash.cloudflare.com and sign up (email and password).
2. Open Workers & Pages. If it asks you to choose a workers.dev subdomain, pick one. This becomes part of your site address.
3. Find your Account ID (Workers & Pages overview page, right side). Copy it.

## 2. Create the database
1. Storage & databases > D1 SQL database > Create.
2. Name it exactly: mahboobah-db
3. Open it and copy the Database ID.

## 3. Create an API token
1. Profile icon > My Profile > API Tokens > Create Token.
2. Use the "Edit Cloudflare Workers" template.
3. Add one more permission: Account > D1 > Edit.
4. Account Resources: include your account. Create the token and copy it now (it is shown once).

## 4. Add four secrets in GitHub
Repo > Settings > Secrets and variables > Actions > New repository secret. Add each name exactly:

| Name | Value |
|---|---|
| CLOUDFLARE_API_TOKEN | the token from step 3 |
| CLOUDFLARE_ACCOUNT_ID | the account id from step 1 |
| D1_DATABASE_ID | the database id from step 2 |
| SETUP_TOKEN | a long random phrase you invent (24+ characters). Save it somewhere safe |

Secrets are write-only. Nobody, including you, can read them back from GitHub.

## 5. Replace the old deploy workflow
Delete `.github/workflows/deploy.yml` (the GitHub Pages one). Open it in the repo, tap the three dots, Delete file, commit.
Upload the new zip. The "Deploy to Cloudflare" workflow runs after the unzip finishes.
You can also run it by hand: Actions > Deploy to Cloudflare > Run workflow.

## 6. Test
Your address: https://mahboobahstitches.YOUR-SUBDOMAIN.workers.dev
1. /api/health shows {"ok":true,...,"phase":2}.
2. /admin/setup: enter your SETUP_TOKEN, your name, email and password. You become the OWNER.
3. You land on /admin showing live counts (all zero is correct).
4. Open /admin/audit: you should see setup.owner_created.
5. In a private tab, create a customer account at /account/register. Visiting /admin there must say "No access".
6. Revisit /admin/setup. It must say the page is closed.

## If something fails
- Workflow red: open the failed step and send me the text. Most likely causes are a missing secret, token permissions, or the D1 name.
- Sign-in returns a server error (Cloudflare error 1102): password hashing used too much CPU for the free plan. Add `[vars]` with `PBKDF2_ITERATIONS = "50000"` to wrangler.toml. This is weaker, so tell me first and we will look at alternatives.
