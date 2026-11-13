# NIRMAAN

NFC + QR displays, custom PVC cards, negotiated product quotes and manually verified UPI payments. Managed by **Infotech Business Solutions**.

## Local development

Use Node.js 22.13 or later.

```sh
npm install
npm run dev
```

Open `http://localhost:5173`. Authentication uses Google Identity Services and Worker-verified sessions, without a fake preview identity. Copy `.dev.vars.example` to ignored `.dev.vars`, set the Google Web client ID and apply missing local migrations. See [GOOGLE_AUTH.md](GOOGLE_AUTH.md) for origins, variables, legacy-account approvals and proposed release commands.

## Production Google sign-in configuration

Configure `GOOGLE_CLIENT_ID` as a runtime variable on the deployed Cloudflare Worker, plus the existing D1 binding named `DB`. The client ID alone cannot configure the origin or database. Production builds declare `AUTH_ENV=production` and the user-confirmed canonical origin `APP_ORIGIN=https://nirmaan.proaura.site`; they never bake the client ID or a process-environment origin into production. For the current older deployment, a missing runtime `APP_ORIGIN` can be corrected to that same HTTPS origin before a later approved code deployment. Local `.dev.vars` and Cloudflare build variables are not a substitute for production runtime settings, and a deployment marked Ready does not validate them.

The new `/api/auth/config` returns the validated public client ID independently of database/origin readiness; an older deployment returns `404` until that diagnostic is published. `/api/auth/session` is read-only, while `/api/auth/challenge` creates a short-lived challenge when testing sign-in. See [the production troubleshooting steps](GOOGLE_AUTH.md#production-setup-and-readiness-checks) for field-specific configuration errors. This configuration fix adds no migration and does not require a Google client secret.

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

Administrator email: `buisness.aditya2006@gmail.com`. `ADMIN_EMAIL` can override it in server runtime configuration. For local administrative testing, set this variable in `.dev.vars` to a Google account you control. Keep the intended business administrator in production.

WhatsApp: **+91 80529 67633**. WhatsApp links open a prefilled chat; visitors send messages themselves. Demo dates/times are IST and require business confirmation.

Admin can add the UPI ID and payee name through **UPI payment details**. These values are stored in D1; no payment gateway or automatic verification is enabled. Never store UPI PINs or banking passwords.

## Database & files

The app uses Vinext/React on Cloudflare Workers, D1 for profiles/orders/settings and R2 for uploads. Customer files and records are authorized server-side. Designs accept JPG, PNG, WebP or PDF up to 10 MB; logos/photos accept image formats. Payment proof accepts JPG, PNG or WebP up to 5 MB. Upload file signatures are checked.

Migrations are generated using `npm run db:generate`. Standalone Worker releases require an approved application of pending remote migrations; see [GOOGLE_AUTH.md](GOOGLE_AUTH.md). Local migrations must be applied once to your separate local D1 state after building:

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
node scripts/check-google-auth.mjs
node --experimental-strip-types scripts/check-account-validation.mjs
```

Google auth tests use ephemeral SQLite and cryptographic fixtures, never production users or a remote database. Old checks that inject Sites/mock identity headers no longer authenticate this Worker. Current authentication setup and verification are in [GOOGLE_AUTH.md](GOOGLE_AUTH.md). Screenshots go to ignored `outputs/`; restart built previews after rebuilding to match the asset manifest.

The development server can remain running while you edit. Keep real `.env*`/`.dev.vars*`, receipts, local database state and build output out of Git; `.dev.vars.example` is a blank setup template. Standalone Worker migration/deployment commands in [GOOGLE_AUTH.md](GOOGLE_AUTH.md) require a separate release approval. Existing hosted Site access is unchanged.

## Design collections and product previews

Each of seven product categories has 25 layouts with monochrome and category-specific colour styles. Separate product pages feature one monochrome and one colour design. The homepage presents only ten featured cards in two rows of five, including review, menu, business, ID, social and event cards. Review and social media cards are explicitly included in Explore, product navigation and the homepage display. Custom artwork has its own upload link. The full `/designs/<product>` collection contains 25 layouts, displayed in pages of ten to keep the gallery compact. Detailed previews include front/reverse views and an interactive example of the tap destination.

`/upload-design` opens the browser-local upload-and-WhatsApp path without an account. Online checkout and private server artwork storage require account creation; the selected product and template are preserved through account setup. Server-stored artwork, logo and photo files remain private to the customer and authorized administrator.

Product-specific illustrations under `public/samples/` explain review, menu and ID-card journeys. Example menu prices, student records and review interactions are clearly labelled as illustrative. The review sample does not submit anything to Google.

## Student ID portal

At checkout, an ID-card buyer can select the secure student portal rather than an external destination link. After payment verification and activation:

1. The institution opens `/institution` from its account and selects its active student-portal ID order.
2. It creates one record per purchased ID, assigns the student’s sign-in email and enters profile details, marks, fee totals/paid amounts and attendance counts.
3. Each card is programmed with `/tap/<order-id>?student=<record-id>`. The link opens `/student/<record-id>` and checks the parent order’s active subscription.
4. Student records are accessible only to the assigned email, the issuing institution and authorized administrator. The student does not need a purchasing profile to view their assigned record.
5. Results, fees and attendance are maintained manually by the institution. The card does not mark attendance, collect tuition payments or synchronize external school software automatically.

The local schema adds `drizzle/0002_condemned_nitro.sql`; apply it once using the same local migration command shown above. Apply pending production migrations during an approved release. No sample student data is seeded into production.

Historical catalog/browser scripts are retained for reference. They use the retired mock-auth fixtures; injected identity headers are rejected by Google auth. Current authentication verification is documented in [GOOGLE_AUTH.md](GOOGLE_AUTH.md). Public design/animation checks use a local Chrome DevTools endpoint on port 9223.

## Business/event previews and printing rules

The homepage includes one interactive review, business-profile and digital-menu sample each. Detailed business and event pages remain at `/business-card` and `/event-card`, with benefits, sample illustrations and working preview tabs. The business sample can download an illustrative vCard. Event preview content is demonstrative, not an entry ticket; registration, admission and check-in are handled by the configured event platform.

Print specifications are fixed server-side and saved with each order:

- Review, social, ID, event and custom cards: single-sided.
- Menu cards: both sides printed with identical artwork. The reverse preview renders exactly the same artwork as the front.
- Business cards: both sides printed, with separate front/reverse artwork supported. A private reverse design upload is available only for this product.

The customer sees these rules at customization and checkout; the administrator sees the saved print specification and reverse artwork in the order record.

## Opening and product animations

The homepage opens with a quick, approximately five-second video-style animation: a phone taps an NFC card, a notification appears, a visible pointer clicks it, and a Google review page opens. It plays once per site visit/tab and does not restart when returning to Home. Click anywhere, use **Skip intro**, or press Escape to reveal the site immediately. **Watch tap & scan** and the footer replay link start it again. Reduced-motion visitors see a shorter static sequence.

Category pages have their own ten-second autoplay demonstrations in the hero. Each starts whenever that page opens and has an unobtrusive pause/play control and a progress bar, without a written replay control or timer:

- Reviews: tap → notification → Google review page → stars → typed feedback → sample confirmation.
- ID cards: tap → notification → profile → results → fees paid → attendance.
- Business cards: tap → notification → profile/portfolio → services → contact details → contact saving demonstration.
- Menus: tap → notification → menu → coffee → bites → desserts.
- Events: tap → notification → event details → agenda → venue.
- Social and custom cards: tap → notification → configured business destination.

These are simulated product demonstrations. No Google review is submitted, no contact is automatically downloaded, no tuition is collected and no attendance is marked by the animation. Visitors can use the separate interactive sample farther down the product page. Every product page includes its own benefits and illustrated workflow.

The first-page intro does not interrupt category pages; their own demo is visible immediately. Timers pause in background tabs and while an intro is visible.

## Design Studio, template selection and gallery upload

`/design-studio` lets a customer select the card type and one of 25 category-themed templates; edit the business name, logo, tagline, wishes, colours, font and alignment; and drag or reposition text, logo and QR-placeholder layers. Business cards have separate front/reverse editing. Menu cards reuse the same artwork on both sides. A draft can be downloaded as PNG or saved privately to checkout. The working QR is added during final setup; exported drafts explicitly reserve a QR area.

`/upload-design` is a minimal upload-and-chat page: select an image from the gallery (or a PDF), see it in the side preview, then open WhatsApp. It asks for no account, card selection or personal details. The file remains a browser-local preview; the visitor attaches the same design in WhatsApp because a wa.me link cannot attach a browser file automatically. Business-card reverse artwork remains available in Design Studio and online checkout.

Guest artwork drafts are kept in IndexedDB on the visitor’s device. Account creation is still required before submitting an online order; Studio drafts return after account setup. The upload-and-chat page does not require an account. Saved artwork is uploaded to private R2 storage and passed into checkout by a scoped draft token. Choosing a new template clears the prior main/reverse artwork selection while retaining the logo and other details.

Customization always displays 25 category-themed template choices. **Design Studio** and **Upload design** are available in navigation. A direct WhatsApp banner and floating chat link open +91 80529 67633 immediately without a form or sign-in; the visitor sends the message themselves.

The animation cursor guards against removed/unmounted phone elements. `scripts/check-customization-local.mjs` regression-checks repeated navigation from animated product pages into customization on localhost:5173.

## Category theme collections

Each category now has 25 choices: 10 familiar layouts plus 15 category-specific compositions with their own palettes, typography and decorative motifs. Menus use café/bistro/restaurant styles; IDs use academy/team/badge styles; business cards use professional/studio/consultant styles; review cards use trust/feedback/counter styles; social cards use creator/community styles; events use conference/festival/guest styles. The editor and checkout selectors load the chosen category’s full collection. Server validation rejects a theme from the wrong category.

Full galleries paginate 10 + 10 + 5 designs. The homepage remains a compact two-row, five-column display with review and social cards explicitly included. The opening intro plays once per site visit/tab; category demos still autoplay on every category-page entry.

## Release checks and launch setup

Existing commerce regressions cover quotation, upload ownership, printing rules, student records, themes and renewals. Their old header-auth fixtures are historical; current Google-session tests and manual provider verification are described in [GOOGLE_AUTH.md](GOOGLE_AUTH.md). Test fixtures stay local or in ephemeral SQLite, never the production database.

Standalone Worker sign-in requires the Google Web client, exact app origin, production auth mode and additive auth migration described in [GOOGLE_AUTH.md](GOOGLE_AUTH.md). Existing hosted Site access is unchanged. Add the actual UPI ID/payee name in `/admin` before requesting payments. No payment gateway, bank secrets, sample receipts or test customer records are seeded by this change.
