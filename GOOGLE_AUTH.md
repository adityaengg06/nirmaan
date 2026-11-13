# Google sign-in on the standalone NIRMAAN Worker

NIRMAAN keeps Vinext, the existing D1 `DB` database and private R2 `BUCKET`. Sign-in uses Google Identity Services (GIS) and Worker-verified sessions. Mock identities and legacy identity headers are not authentication. No deployment, remote migration or automatic legacy-account linking is performed by this change.

## Google Web client and origins

Create a Google OAuth client of type **Web application**, configure the consent screen, and add these **Authorized JavaScript origins**:

- `http://localhost` and `http://localhost:5173` for local development.
- The actual production HTTPS Worker/custom-domain origin, without a path.

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
| `APP_ORIGIN` | Exact HTTPS origin serving the application |
| `AUTH_ENV` | `production` |
| `ADMIN_EMAIL` | Optional; defaults to `buisness.aditya2006@gmail.com` |
| `DB` | Existing D1 database ID `d132f38e-c9f9-4951-8fdf-109b89165d9d` |
| `BUCKET` | Existing private R2 bucket binding |

Serve mode explicitly defaults to local development; builds force production auth and reject HTTP application origins. Non-secret Google client/origin values may come from the build process environment or Worker runtime variables. `keep_vars=true` retains dashboard variables omitted from a build. Configure production values on the intended Worker, not in `.dev.vars`.

Real `.dev.vars*` and `.env*` files stay ignored. Cloudflare Vite may copy `.dev.vars` into build output for **local preview**; it is not deployed as runtime configuration. Do not commit ID tokens, cookies or Google client secrets. [Cloudflare local variables](https://developers.cloudflare.com/workers/local-development/environment-variables/), [Vite local secrets](https://developers.cloudflare.com/workers/vite-plugin/reference/secrets/), [Wrangler dashboard-variable retention](https://developers.cloudflare.com/workers/wrangler/configuration/#top-level-only-keys).

## Sessions and routes

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
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js deploy --config dist/server/wrangler.json
```

Legacy-account SQL is a separate approval, not part of deployment. Verify real Google sign-in, account creation, logout, private uploads and renewals on the configured origin after an approved release.

## Verification

Use `npx tsc --noEmit`, `npm run build`, `node scripts/check-google-auth.mjs`, and `node --experimental-strip-types scripts/check-account-validation.mjs`. Google auth tests use ephemeral SQLite and cryptographic fixtures; a real Google Web client and browser are still needed for live provider verification. Old test scripts that inject Sites/mock headers do not authenticate this Worker.
