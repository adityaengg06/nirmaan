# NIRMAAN

Managed by Infotech Business Solutions. NFC + QR ecommerce storefront, customization, subscription management and manual UPI payment review.

## Run locally

Use Node 22.13 or newer. Run `npm install`, then `npm run dev`. The project uses Vinext, React, Cloudflare D1 and R2. Hosted sign-in is provided by Sites; local authorization tests use mock identity headers only in the local test harness.

## Business workflow

- Setup + first month: ₹99 including GST.
- Renewals: 1 month ₹60; 3 months ₹150; 6 months ₹250; 12 months ₹450.
- Café/menu projects are scoped by demo; no unconfirmed package pricing is charged.
- Orders start pending. Customers upload a JPG/PNG/WebP UPI receipt, up to 5 MB, from My account.
- Administrator reviews proof and confirms the expiry date when activating a plan. Renewal approval extends the customer's activated subscription.
- Activated orders expose `/tap/<order-id>` for programming NFC tags and generating production QR artwork. The storefront QR illustrations are decorative, not production QR codes.
- Managed tap links stop redirecting when a plan expires. Do not print a direct destination URL if subscription controls are required.
- Physical printing and shipping charges are quoted separately pending business confirmation.

## Administrator

Open `/?page=admin` and sign in with `buisness.aditya2006@gmail.com`. Authorization is enforced on the server. The optional `ADMIN_EMAIL` runtime variable overrides this email.

Use **UPI payment settings** to add the UPI ID and payee name later. Never enter a UPI PIN. No payment gateway or automatic payment verification is configured.

WhatsApp contact: +91 80529 67633. Demo requests store the preferred date/time (IST) and remain subject to business confirmation. WhatsApp opens a prefilled chat; sending is performed by the visitor.

New Sites deploy privately by default. Review audience settings before opening the storefront to customers. The admin route continues to enforce its own email restriction.

## Storage and security

D1 stores orders, demo requests, subscription expiry and payment settings. R2 stores receipts. Customer APIs restrict records and receipts to the signed-in owner; admins can review all records. Mutating APIs reject cross-origin requests. No credentials or payment proofs are stored in source control.

## Checks

`npx tsc --noEmit` checks types. `npm run build` produces the Cloudflare Worker bundle. Schema migrations are in `drizzle/` and are applied by Sites at deployment. Local D1 state is separate from production.
