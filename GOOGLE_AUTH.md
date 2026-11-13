# Google sign-in on the standalone NIRMAAN Worker

NIRMAAN keeps Vinext, the existing D1 `DB` database and private R2 `BUCKET`. Sign-in uses Google Identity Services (GIS) and Worker-verified sessions. Mock identities and legacy identity headers are not authentication. No deployment, remote migration or automatic legacy-account linking is performed by this change.

## Google Web client and origins

Create a Google OAuth client of type **Web application**, configure the consent screen, and add these **Authorized JavaScript origins**:

- `http://localhost` and `http://localhost:5173` for local development.
- `https://nirmaan.proaura.site` for the production custom domain, without a path.

Use `localhost:5173` consistently: a different host or port is a different origin. If the Google project is in testing mode, add the intended test accounts. This implementation receives an ID credential through a JavaScript callback; it does not use an authorization-code redirect flow, a client secret or an OAuth redirect URI. The supported GIS script is loaded from Google, and the backend verifies the credential. [Google setup](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid).

## Local configuration

Copy `.dev.vars.example` to ignored `.dev.vars` and supply the Web client ID:

```dotenv
GOOGLE_CLIENT_ID="YOUR_WEB_CLIENT_ID.apps.googleusercontent.com"
APP_ORIGIN="http://localhost:5173"
AUTH_ENV="development"
```

Run `npm run dev`, then open `http://localhost:5173/create-account`. Without a real client ID the UI reports missing setup; there is no fake-user fallback. Local D1/R2 state is separate from remote storage.

| Variable/binding | Production configuration |
| --- | --- |
| `GOOGLE_CLIENT_ID` | Intended Google Web OAuth client ID; this ID is public |
| `APP_ORIGIN` | `https://nirmaan.proaura.site` (the tracked production canonical origin) |
| `AUTH_ENV` | `production` |
| `ADMIN_EMAIL` | Optional; defaults to `buisness.aditya2006@gmail.com` |
| `DB` | Existing D1 database ID `d132f38e-c9f9-4951-8fdf-109b89165d9d` |
| `BUCKET` | Existing private R2 bucket binding |

Serve mode explicitly defaults to local development and reads local configuration. Production builds declare `AUTH_ENV=production` and the user-confirmed public canonical `APP_ORIGIN=https://nirmaan.proaura.site` from source. They never copy the Google client ID or a stale origin from the build process environment. Set `GOOGLE_CLIENT_ID` as a **runtime variable on the exact deployed Worker/environment**, not merely as a Cloudflare build variable. `keep_vars=true` preserves this dashboard value because the generated config omits it; retention does not create missing values, transfer settings between Workers, or turn `.dev.vars` into production configuration. The tracked production origin deliberately replaces an incorrect runtime origin during a later approved deployment.

Real `.dev.vars*` and `.env*` files stay ignored. Cloudflare Vite may copy `.dev.vars` into build output for **local preview**; it is not deployed as runtime configuration. Do not commit ID tokens, cookies or Google client secrets. [Cloudflare local variables](https://developers.cloudflare.com/workers/local-development/environment-variables/), [Vite local secrets](https://developers.cloudflare.com/workers/vite-plugin/reference/secrets/), [Wrangler dashboard-variable retention](https://developers.cloudflare.com/workers/wrangler/configuration/#top-level-only-keys).

## Production setup and readiness checks

A Cloudflare deployment marked **Ready** confirms deployment status, not that Google sign-in or D1 is configured. Having `GOOGLE_CLIENT_ID` alone is insufficient: the challenge/session backend also requires `APP_ORIGIN` and a D1 binding named exactly `DB`.

On the Worker/environment serving `https://nirmaan.proaura.site`, configure runtime `GOOGLE_CLIENT_ID=<your Google Web client ID>`. For the currently deployed older version, a missing-origin configuration can be corrected by saving runtime `APP_ORIGIN=https://nirmaan.proaura.site` and `AUTH_ENV=production` on that Worker; this guide does not change settings automatically. The next approved source deployment declares the canonical origin itself. The origin has no path, query or fragment. Add `https://nirmaan.proaura.site` to the Google Web client's authorized JavaScript origins. Retain `DB` bound to `d132f38e-c9f9-4951-8fdf-109b89165d9d` and the existing private `BUCKET` binding. No Google client secret is required.

This checkout has no root `wrangler.jsonc`. Worker bindings and production defaults are authored in `vite.config.ts`; the Cloudflare Vite plugin emits `dist/server/wrangler.json` and a `.wrangler/deploy/config.json` redirect. Keep this single configuration source.

Rebuild before any approved publication so the generated `dist/server/wrangler.json` reflects current source. Its production `vars` should contain `AUTH_ENV=production` and the trusted canonical `APP_ORIGIN`, but no `GOOGLE_CLIENT_ID`. Older generated client/origin values can override dashboard settings during deployment even with retention enabled. Rebuild from current source; do not edit generated files or add a second Wrangler configuration source.

Inspect these read-only URLs on the production origin: `https://nirmaan.proaura.site/api/auth/config` and `https://nirmaan.proaura.site/api/auth/session`. The current older deployment may return `404` for the new config diagnostic until the updated source is published; that does not mean a client secret is needed. The challenge check below creates a short-lived sign-in challenge and should be used when testing a sign-in attempt, not as a production readiness probe on every page.

| Check | Meaning |
| --- | --- |
| `GET /api/auth/config` returns `200` with public `clientId` | The Worker has a validated runtime Google client ID. This endpoint does not depend on D1 or `APP_ORIGIN`. |
| `/api/auth/config` returns `404` | The deployed Worker predates the new public configuration diagnostic; check the deployed version before interpreting configuration errors. |
| `/api/auth/config` reports missing/invalid `GOOGLE_CLIENT_ID` | Configure the Web client ID as a runtime variable on this Worker/environment. |
| `GET /api/auth/challenge` returns `200` | Origin and D1 challenge creation succeeded; the response includes the public client ID, nonce and CSRF token, with a challenge cookie. |
| Challenge reports missing `APP_ORIGIN` | Set the exact production HTTPS origin; changing the client ID will not supply it. |
| Challenge reports missing `DB` | Restore the D1 binding named `DB`; an OAuth setting cannot supply a database binding. |
| Challenge returns an origin error | Check the URL's scheme/host/port against the configured canonical origin. |
| Challenge fails after configuration checks pass | Inspect Worker logs and the existing auth schema/database availability; do not disable verification or create a fake user. |

Configuration diagnostics identify missing setting names without returning secrets. Do not paste credentials, ID tokens or cookie values into issues. A successful config/challenge response is not a completed Google login; finish real Google account selection and session/logout checks separately. This runtime-configuration fix adds **no new migration**; `0003_sharp_whistler.sql` remains the existing prerequisite if it has not already been applied. Do not replay it on an initialized database.

## Sessions and routes

- `GET /api/auth/config`: returns only the validated public runtime client ID, independently of D1/origin readiness.
- `GET /api/auth/challenge`: returns client ID, nonce and CSRF token bound to a short-lived challenge cookie.
- `POST /api/auth/google`: receives `credential` and `csrfToken` from that challenge.
- `GET /api/auth/session`: returns the verified user and session CSRF token.
- `POST /api/auth/logout`: requires matching origin and `X-CSRF-Token`, then revokes the session.

Production uses the Secure, HTTPOnly, SameSite=Lax `__Host-nirmaan_session` cookie. Only explicit development plus an HTTP loopback origin enables `nirmaan_dev_session`. Sessions last seven days and are checked against D1. No session token is stored in browser local storage.

The backend checks Google's signature and claims and maps the stable Google subject to the NIRMAAN ownership ID. A client-supplied email is not identity proof, and matching an old email does not transfer its account. [Google token verification](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token).

## Additive migration

`drizzle/0003_sharp_whistler.sql` adds Google identities, sessions, one-use challenges and pending account-link requests. It preserves commerce tables and ownership IDs. Build first. For a fresh **local** database, apply migrations in order:

```sh
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_short_joseph.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_fat_george_stacy.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0002_condemned_nitro.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0003_sharp_whistler.sql
```

Do not replay migrations already applied. The existing local database already has the first three migrations. A standalone Worker deployment does not replace the separately approved remote migration step.

## Returning legacy accounts

An email collision creates a pending request instead of automatically merging accounts. An operator must independently verify ownership, inspect the verified pending Google subject/email, and identify the exact old `user_id`.

The offline helper prints a SQL proposal and never opens a database or network:

```sh
node scripts/prepare-google-account-link.mjs --google-sub VERIFIED_PENDING_SUBJECT --legacy-user-id CONFIRMED_OLD_USER_ID --expected-email owner@example.com --approved-by APPROVING_OPERATOR > outputs/google-account-link.sql
```

Inspect and approve the exact proposal before execution. The guarded insert requires pending status, the selected matching legacy record, and no existing subject/user/email mapping. It never modifies profiles, orders, artwork or students. Guard failures create no mapping. The status annotation can be completed by repeating the same proposal after an interruption. For programmatic execution submit all statements together with native `DB.batch`; explicit SQL `BEGIN` is not generated. Different-email recovery and conflicting mappings need separate operator review. Do not infer ownership from email or overwrite an existing map.

## Proposed release steps: approval first

These are prepared commands only, not actions performed by this task. After approving the configuration, Google origins, existing Cloudflare account/bindings and required pending migration, an operator would apply only the missing migration and publish the generated Worker:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --remote --config dist/server/wrangler.json --file drizzle/0003_sharp_whistler.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js deploy --config dist/server/wrangler.json --name YOUR_SEPARATE_WORKER_NAME
```

Choose the intended separate Worker name and verify the existing R2 bucket name (`site-creator-r2` in this checkout) before release. Configure its production variables first; keep the existing D1 ID and private R2 objects. Legacy-account SQL is a separate approval, not part of deployment. Verify real Google sign-in, account creation, logout, private uploads and renewals on the configured origin after an approved release.

## Verification

Use `npx tsc --noEmit`, `npm run build`, `npm run test:auth:config`, `node scripts/check-google-auth.mjs`, and `node --experimental-strip-types scripts/check-account-validation.mjs`. Google auth tests use ephemeral SQLite and cryptographic fixtures; a real Google Web client and browser are still needed for live provider verification. Old test scripts that inject Sites/mock headers do not authenticate this Worker.

## Repeatable local integration and browser checks

The Google security suite uses real generated RSA signatures and ephemeral SQLite. The native integration suite uses synthetic sessions seeded only into this checkout's `.wrangler/state`; application token verification remains enabled. Never import `scripts/helpers/auth-fixtures.mjs` from application code.

Start a separate local built Worker for integration tests:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js dev --config dist/server/wrangler.json --local --persist-to .wrangler/state --ip 127.0.0.1 --port 8787 --inspector-port 0 --var AUTH_ENV:development --var APP_ORIGIN:http://127.0.0.1:8787
```

Then run `npm run test:auth:integration`. It covers account creation, private artwork/receipt access, quotes, payment verification, renewals, student access, forged-header rejection and session revocation. This local command overrides HTTP cookie transport explicitly and does not change production configuration.

With the dev server on localhost:5173 and an existing local Chrome DevTools endpoint on port 9223, run `npm run test:auth:browser` and `node scripts/check-mobile-browser.mjs`. The Google browser test labels its SDK/failure-response stubs; the mobile test uses actual D1 sessions and API requests. A separate browser check confirmed the real Google-rendered iframe loads with the configured local Client ID. A human must still complete Google account selection to verify a live provider login. No credentials are requested by these tests.

The supplied public Google Client ID was configured in ignored `.dev.vars` for local preview only. Production requires its own approved runtime configuration and authorized Google origins. The local auth migration was applied; no remote database was altered.

## Changed files

`GOOGLE_AUTH.md` and the following tracked/new source files comprise this change. Removed files are listed as well. The ignored local `.dev.vars` file is excluded from Git.

- `package.json`
