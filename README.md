# NIRMAAN

NFC + QR displays, custom PVC cards, negotiated product quotes and manually verified UPI payments. Managed by **Infotech Business Solutions**.

## Local development

Use Node.js 22.13 or later.

```sh
npm install
npm run dev
```

Open the local URL printed by the dev server (normally http://localhost:5173). The Sites starter provides a local-only sign-in identity, `seedy@sites.test`; use the **Continue with ChatGPT** button to sign in locally, then complete the NIRMAAN account form. Hosted sign-in uses the actual Sites identity.

## Pages

- `/create-account` — secure sign-in, required business profile and delivery address
- `/reviews`, `/menu`, `/social` — large countertop NFC + QR display products
- `/id-card`, `/business-card` — separate PVC card product pages
- `/checkout?product=menu` — customization, artwork uploads, delivery, then setup and subscription review
- `/account` — quotes, orders and private payment proof uploads
- `/renewals` — locked until the first product payment is verified and activated
- `/admin` — negotiated quotes, artwork review, UPI verification and expired plans
- `/terms` — non-refundable payments and no cancellation of confirmed orders

## Order workflow

1. The customer creates a complete NIRMAAN account before submitting an order.
2. They customize a product, upload their own design/logo/photo if needed and provide a structured Indian delivery address, including a six-digit PIN code.
3. Setup + the first month costs ₹99 including GST. This and future renewal rates appear at the final checkout step, rather than as a public pricing section.
4. Product, printing, custom menu work and delivery prices are negotiated with a person. Admin sends the agreed physical product/printing/delivery quote; the system adds ₹99 setup.
5. The customer accepts the final total and non-refundable/no-cancellation terms in their account before payment.
6. The customer pays by UPI and uploads a receipt. Admin verifies actual receipt of money before activating the product.
7. The first verified product unlocks renewals: 1 month ₹60, 3 months ₹150, 6 months ₹250, 12 months ₹450. Renewal tax details must be confirmed before payment.

Review/menu/social/custom display dimensions and materials are agreed in the quote. Display illustrations and sample QR codes are illustrative; final print artwork and working QR codes must be prepared and approved before production. `/tap/<order-id>` supplies the managed destination for NFC programming and production QR artwork. It stops redirecting when the selected product’s service expires.

## Administrator & payments

Administrator email: `buisness.aditya2006@gmail.com`. `ADMIN_EMAIL` can override it in server runtime configuration. For a local admin preview only, configure this variable with the local test identity using your local Worker environment configuration. Never change production authorization to a test identity.

WhatsApp: **+91 80529 67633**. WhatsApp links open a prefilled chat; visitors send messages themselves. Demo dates/times are IST and require business confirmation.

Admin can add the UPI ID and payee name through **UPI payment details**. These values are stored in D1; no payment gateway or automatic verification is enabled. Never store UPI PINs or banking passwords.

## Database & files

The app uses Vinext/React on Cloudflare Workers, D1 for profiles/orders/settings and R2 for uploads. Customer files and records are authorized server-side. Designs accept JPG, PNG, WebP or PDF up to 10 MB; logos/photos accept image formats. Payment proof accepts JPG, PNG or WebP up to 5 MB. Upload file signatures are checked.

Migrations are generated using `npm run db:generate`. Hosting applies them during publication. Local migrations must be applied once to your separate local D1 state after building:

```sh
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_short_joseph.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_fat_george_stacy.sql
```

Do not replay a migration already applied to your local database.

## Verification

```sh
npx tsc --noEmit
npm run build
npm start -- --port 8787
node scripts/check-local.mjs
```

Integration checks use synthetic identities against localhost only. `scripts/check-browser.mjs` additionally checks mobile checkout and product pages through a local Chrome DevTools endpoint at port 9223; screenshots go to ignored `outputs/`. Restart the production preview after rebuilding so it uses the matching asset manifest.

The development server can remain running while you edit. Use the tracked `.openai/hosting.json` Site identity for publication. Keep credentials, `.env*`, receipts, local database state and build output out of Git. New hosted Sites remain private until their audience is changed explicitly.
