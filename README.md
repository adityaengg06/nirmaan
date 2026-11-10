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

## Design collections and product previews

Each of seven product categories has ten layouts: five monochrome and five colour designs. Separate product pages feature one monochrome and one colour design. The homepage presents only twelve compact cards in two rows of six, with one monochrome and one colour design each for reviews, menus, business cards, ID cards, social cards and event cards. Custom artwork has its own upload link. The full `/designs/<product>` page shows all ten layouts. Detailed previews include front/reverse views and an interactive example of the tap destination.

`/upload-design` opens the direct-artwork path. Account creation remains mandatory; product, selected template and upload mode are preserved through account setup. Uploaded artwork, logo and photo files remain private to the customer and authorized administrator.

Product-specific illustrations under `public/samples/` explain review, menu and ID-card journeys. Example menu prices, student records and review interactions are clearly labelled as illustrative. The review sample does not submit anything to Google.

## Student ID portal

At checkout, an ID-card buyer can select the secure student portal rather than an external destination link. After payment verification and activation:

1. The institution opens `/institution` from its account and selects its active student-portal ID order.
2. It creates one record per purchased ID, assigns the student’s sign-in email and enters profile details, marks, fee totals/paid amounts and attendance counts.
3. Each card is programmed with `/tap/<order-id>?student=<record-id>`. The link opens `/student/<record-id>` and checks the parent order’s active subscription.
4. Student records are accessible only to the assigned email, the issuing institution and authorized administrator. The student does not need a purchasing profile to view their assigned record.
5. Results, fees and attendance are maintained manually by the institution. The card does not mark attendance, collect tuition payments or synchronize external school software automatically.

The local schema adds `drizzle/0002_condemned_nitro.sql`; apply it once using the same local migration command shown above. Hosting applies the pending migration on publication. No sample student data is seeded into production.

Additional local verification:

```sh
node scripts/check-catalog.mjs
node scripts/check-catalog-browser.mjs
```

The browser check uses the synthetic local fixtures generated by the catalog check and a Chrome DevTools endpoint on port 9223. It verifies two-vs-ten design counts, monochrome contrast, template propagation, direct artwork upload, mobile layouts and authorized student tabs.

## Business/event previews and printing rules

The homepage includes one interactive review, business-profile and digital-menu sample each. Detailed business and event pages remain at `/business-card` and `/event-card`, with benefits, sample illustrations and working preview tabs. The business sample can download an illustrative vCard. Event preview content is demonstrative, not an entry ticket; registration, admission and check-in are handled by the configured event platform.

Print specifications are fixed server-side and saved with each order:

- Review, social, ID, event and custom cards: single-sided.
- Menu cards: both sides printed with identical artwork. The reverse preview renders exactly the same artwork as the front.
- Business cards: both sides printed, with separate front/reverse artwork supported. A private reverse design upload is available only for this product.

The customer sees these rules at customization and checkout; the administrator sees the saved print specification and reverse artwork in the order record.

## Opening tap/scan animation

First-time visitors see an approximately ten-second SVG animation explaining NFC tap, QR scan and the destination opening. The storefront remains behind the introduction until it finishes, or the visitor selects **Skip intro** or presses Escape. The intro plays once per browser tab/session, and can be replayed through the footer. Reduced-motion visitors receive a shorter static sequence. Without JavaScript, the intro is hidden and the site remains accessible.

The intro restores page scrolling, keyboard focus and background accessibility when it closes. Storefront browser checks bypass it deliberately; `scripts/check-intro-browser.mjs` tests the full animation, skip, replay, repeat visits and reduced-motion paths. All seven product pages retain separate product-specific benefits sections.
