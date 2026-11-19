# Owner's guide to the admin area

Open `/admin` on your site and sign in. Everything below is done from your phone.

## Add your first product (about 5 minutes)
1. Admin > **Products** > **Add a product**.
2. Fill in the name, choose the collection and category, and write a short true description. Leave Status as **Draft**. Tap **Create product**.
3. On the next screen, under **Sizes, colours, prices and stock**, tap **Add an option** for each size and colour. Give each its own SKU (your code, e.g. JIL-1-M-NAVY), price in naira, and opening stock. Untick "Count stock" for made-to-order pieces.
4. Under **Photos**, type a short description, then **Choose a photo**. The phone shrinks it first. The first photo is the main one. Use the arrows to reorder.
5. Set Status to **Live on the shop** and tap **Save changes**. It appears on the website within about 30 seconds.

A live product only shows on the shop if it has at least one option.

## Photos: the library
- Photos you upload to `public/images/` on GitHub form your **website library**. After each deploy, every photo in that folder
  appears in the admin photo picker (the list is rebuilt automatically). Photos you upload from your phone through a product page
  appear under **Phone uploads**.
- **On a product:** Products > the product > Photos > **Choose from library** (or **Upload from phone**).
- **Collection cover:** Collections > the collection > **Cover picture** > Choose a photo > Save collection.
- **Homepage pictures:** Settings > Homepage pictures (the main picture at the top, and the one beside the custom-orders section).
- A collection with no live products is hidden from customers until it has some, so the website only shows what you have.

## Products that show "Price on request"
The photos were set up as live products with a price of 0. The website shows "Price on request" and a WhatsApp button
instead of Add to cart. To start selling one: Admin > Products > open it > set the option's real price (and size, colour, stock).
Products still at 0 show a "Needs a price" tag in the product list. To hide a product, set its Status to Draft.

## Orders and payments
- **Orders:** every website order with its stage: Awaiting payment, Paid, Being prepared, Completed (or Cancelled / Refunded).
  Open one to see the customer, items, address, payments and history. Use the buttons to move it along. Orders only become Paid by a verified Paystack payment, or by you using
  **Mark as paid** after you have seen a bank transfer yourself (it is recorded with your name).
- **Payments:** every payment attempt and whether it succeeded.
- **Discounts:** make codes such as EID10 (percent or naira off, minimum order, maximum uses, end date) and switch them on or off.
- **Delivery fee:** Settings > Delivery at checkout. One flat fee for now; delivery zones come later.
- A WhatsApp enquiry is not an order. It only becomes one after it is paid (or you mark it paid) through the website.

## Stock
- Admin > **Inventory**: tap any row to add stock, remove stock, or enter a counted total. Every change is recorded with your name and the reason.
- An option with zero stock shows as unavailable on the shop automatically.

## Your words on the website
- Admin > **Pages**: write About, FAQ and Policies (use the web addresses `about`, `faq`, `policies`) and Journal posts.
- Formatting: blank line = new paragraph. `## Heading`. `- bullet`.
- Tick **Published** to show it. Until then the website shows a "coming soon" message.

## Your details
- Admin > **Settings**: WhatsApp number, phone, email, social links, opening hours and the blue announcement strip. Every WhatsApp button uses the number you save here.

## Collections
- Admin > **Collections**: rename, reorder, hide, or add collections and categories.

## Staff
- Admin > **People**: a team member first creates a normal account at `/account/register`. You then give them a role.
  - Content manager: pages only. Inventory manager: products and stock. Manager: products, stock and (later) orders. Owner: everything.

## Not built yet
Orders, online payment (Paystack), bookings, bespoke requests, gift bundles, promotions, reviews, shipping rates and analytics come in the next phases. Until then customers order through the WhatsApp buttons.
