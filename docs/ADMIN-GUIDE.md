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

## Bookings (set this up before customers can book)
1. Admin > **Availability** > **Opening hours**: add the days and hours you take appointments, e.g. Monday 10:00 to 17:00. Until you add hours, the website offers no booking times (nothing is assumed).
2. Add **Days closed** for holidays. Check the **Appointment types** (Consultation, Measurements, Fitting, Custom design discussion). The lengths are starting suggestions, so change them to suit you.
3. **Booking rules**: minimum notice, how far ahead customers can book, free-cancellation window, and whether bookings are confirmed automatically or you approve each one. Time zone is 60 for Nigeria.
4. **Bookings** shows your calendar by day. Open a booking to confirm it, mark it completed or no-show, cancel it, or move it to another free time. Two bookings can never overlap.
5. Customers get a private link to their booking (they can add it to their phone calendar, change the time or cancel up to your notice window). If a customer loses their link, open the booking and tap **Create a new private link**, then send it by WhatsApp.

## Bespoke (custom-made outfits)
1. Customers send the form at **/bespoke**: outfit type, design description, photos, fabric, colour, measurements, deadline and notes.
2. **Bespoke** in the admin lists requests. Open one and:
   - **Start review**, then **write to the customer** (tick "This is a question" to mark it as waiting for their answer).
   - Enter a **price** and **Save quotation**. The customer cannot see it yet. Tap **Send quotation to customer** when ready.
   - The customer approves from their request page, or you tap **Record customer approval** if they agreed on WhatsApp.
   - Tap **Convert to order**. The customer then pays online from the same page (or you can **Mark as paid** in Orders for a bank transfer).
   - Move it to **In production** and **Completed**.
3. Customers' reference photos are kept private to the request; unattached uploads are deleted after a day.

## Shipping and delivery
- **Shipping** (admin): add a **zone** (a country, or only some states, e.g. Lagos), then its **delivery options** with a price, delivery days and an optional "free over ₦X" amount. A zone that lists states beats a whole-country zone. Use a ₦0 option named "Pickup" for collection.
- Customers pick a country, state and one of your options at checkout. A country with no zone cannot order online and is pointed to WhatsApp.
- Until you add any zone, checkout keeps the single flat fee in Settings (Nigeria only).
- Orders are paid in naira for every country. Charging in other currencies needs that currency switched on in your Paystack account first.
- **Shipping an order:** open a paid order > Delivery > add the carrier and tracking number > **Add as shipped**. The customer sees the tracking on their order page. Then **Mark delivered**, and **Mark completed** on the order.

## Gift Studio
- **Gifts** (admin): a **fixed set** is a list of products; a **build-your-own** gift has steps (for example Dress, Mat) and the products customers can pick for each. A gift has no stock of its own. Buying one uses its products' stock, and a gift disappears when a product sells out.
- Set an optional **gift saving** (% off the products) and add **packaging** options with prices. Customers add a personal message and recipient.
- Gifts needing packing show on the order page with the card message.

## Reviews, newsletter and customers
- **Reviews:** only customers who bought a product can review it. Approve or reject them in Reviews. Approved reviews show stars on the product and the best ones appear on the homepage.
- **Subscribers:** people who joined the newsletter. Download the CSV for a free email tool; this website does not send emails.
- **Customers:** everyone with an account, their paid orders and what they spent, with their bookings and custom requests.
- **Analytics:** paid revenue by day, top products, sales by collection, low stock, orders by stage, discount codes used. All of it comes from real orders. Website visits are not tracked.
- Downloads (orders, customers, subscribers) open in Excel or Google Sheets.

## Search and sharing (SEO)
- Product, collection, journal and info pages carry their own title, description, share picture and product details for Google and for WhatsApp link previews. A sitemap is at `/sitemap.xml`.
- For best results: write real product descriptions, add a clear photo description to every photo, and (when you get a custom domain) submit the sitemap in Google Search Console.

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
