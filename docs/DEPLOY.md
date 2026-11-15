# Deploying on Android (no computer, no cost)

## 1. Put the code on GitHub
Repository: mahboobah1/mahboobahstitches

GitHub's website cannot unzip a zip file, so use the helper:

1. Open the repo in Chrome. Menu (three dots) > turn on "Desktop site".
2. Tap Add file > Create new file. Name it exactly: `.github/workflows/unzip.yml`
   (typing the slashes makes the folders). Paste the contents of the supplied `unzip.yml`. Commit.
3. Repo Settings > Actions > General > Workflow permissions > choose "Read and write permissions" > Save.
4. Tap Add file > Upload files. Choose `mahboobahstitches.zip` (the zip itself, still zipped). Commit.
5. Open the Actions tab. The "Unzip project" run should turn green within a minute.
   Then the repo shows all the project folders and the zip is removed.

If the Actions route fails, tell me the error text and we will use another route.

## 2. Deploy on Cloudflare Pages
1. Create a free account at dash.cloudflare.com (no card needed).
2. Workers & Pages > Create > Pages > Connect to Git. Allow access to `mahboobahstitches`.
3. Settings:
   - Framework preset: Vite (or None)
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Environment variable: `NODE_VERSION` = `20`
4. Save and Deploy. Your site appears at `https://<project-name>.pages.dev`.

## 3. Test it
- Open the pages.dev address. The homepage, logo and demo products should show.
- Open `/api/health`. It should show `{"ok":true,...}`.
- Add a product to the cart, refresh the page, and check it is still there.
- Reload `/shop` directly. It should load, not give an error.

## 4. Add your contact details
Edit `src/config/site.ts` on GitHub (pencil icon): fill in whatsappNumber (digits only, with country code),
phone, email and social links. Commit. Cloudflare redeploys automatically.
Set `demoMode: false` only after real products replace the demo ones.
