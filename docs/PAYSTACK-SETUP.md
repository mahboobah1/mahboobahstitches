# Switching on online payment (Paystack)

Online payment stays OFF until you add your Paystack secret key. Until then the cart sends customers to WhatsApp.
Start in TEST mode (practice only, no real money). Go live only after a full test works.

## A. Test mode (do this first)
1. Sign in at dashboard.paystack.com. Make sure the switch at the top says **Test mode**.
2. Go to **Settings > API Keys & Webhooks**.
3. Copy the **Test Secret Key** (starts with `sk_test_`). Never share it or paste it in a chat or into a file in the repo.
4. In GitHub: your repo > Settings > Secrets and variables > Actions > Secrets > **New repository secret**.
   Name: `PAYSTACK_SECRET_KEY`  Value: the key you copied. Save.
5. Still in Paystack, same page: set the **Test Webhook URL** to
   `https://YOUR-SITE-ADDRESS/api/webhooks/paystack`  (use your real workers.dev address) and save.
6. In GitHub: Actions > **Deploy to Cloudflare** > Run workflow. Wait for green.

## B. Try a practice purchase
1. Make sure at least one product has a real price and stock (Admin > Products). Products at 0 are "Price on request" and cannot be bought online.
2. On the website, add it to the cart, tap **Checkout and pay online**, fill in the form. A "Test mode" notice shows.
3. On Paystack's page use a Paystack TEST card (see Paystack's "Test payments" page for the current test card numbers).
4. You return to the order page: it should say **Your payment is confirmed**.
5. Check Admin: **Orders** shows it as Paid, **Payments** shows "success", Inventory dropped by what was bought, and the overview shows paid revenue.
6. Try one payment that you cancel or fail: the order stays "Awaiting payment" and offers **Pay now** again.

## C. Going live
1. In Paystack, finish business activation (ID, BVN, bank account, as asked). Paystack must approve you.
2. Switch the dashboard to **Live mode**. Copy the **Live Secret Key** (`sk_live_...`) and set the **Live Webhook URL** to the same address as above.
3. In GitHub, edit the `PAYSTACK_SECRET_KEY` secret and paste the live key. Run **Deploy to Cloudflare** again.
4. Make one small real purchase yourself and check it in Admin before telling customers.

## Safety notes
- The checkout page shows a "Test mode" banner whenever a test key is in use, so you cannot mistake it for live.
- Card details are typed on Paystack's page only. This website never sees or stores them.
- An order only becomes Paid after our server asks Paystack and the amount matches. A browser redirect is never trusted.
- Refunds are made from the Paystack dashboard. "Mark refunded" in Admin only records it.
- If a customer pays after the 30-minute stock hold ran out, the order is still honoured. If the stock is gone the order shows a "STOCK SHORTFALL" note for you to handle.
