# StaffRail Admin

Web admin panel for **StaffRail** — employee onboarding, clearance and
training management. Built with Next.js (App Router, TypeScript, Tailwind
CSS, shadcn/ui). It shares the **same Firebase project** as the Flutter
employee app (`bhmh-fd67c`): same Auth, same Firestore, same Cloud
Functions. The Flutter app in the repo root is untouched by this
sub-project.

## Repository layout (monorepo)

```
staffrail/
├── lib/ android/ ios/ ...   ← Flutter employee app (unchanged)
├── functions/               ← Cloud Functions (unchanged, shared)
└── admin/                   ← this Next.js admin panel
```

## Requirements

- Node.js ≥ 20 (tested with 22)
- npm
- A Firebase admin account in the `bhmh-fd67c` project (for service-account setup only)

## Installation

```bash
cd admin
npm install
```

## Configuration

Copy the example and fill it in:

```bash
cp .env.example .env.local
```

Every required variable is documented inside `.env.example`. Two groups:

1. **`NEXT_PUBLIC_FIREBASE_*`** — the *public* Firebase web identifiers.
   They are not secrets (they ship in the Flutter app too). Copy them from
   `lib/core/config/firebase_options.dart` (the `web` entry) or Firebase
   Console → Project settings → Your apps.

2. **Server-only credentials** — `FIREBASE_ADMIN_*` and
   `STAFFRAIL_CSRF_SECRET`. See **Authentication setup** below.

### Firebase Admin SDK (required for login)

The admin panel verifies Firebase ID tokens **on the server** before
issuing a secure HttpOnly session cookie. This requires a service account:

1. Firebase Console → Project settings → **Service accounts**.
2. Click **Generate new private key** → download the JSON (keep it safe,
 never commit it).
3. Either set `FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON` to the entire JSON
 blob, or set the individual `FIREBASE_ADMIN_PROJECT_ID`,
 `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY` variables.

Generate a CSRF secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# → paste as STAFFRAIL_CSRF_SECRET
```

Without the Admin credentials the login/session endpoints return a
configuration error (HTTP 503) — the app cannot mint sessions, by design.

## Development

```bash
npm run dev      # http://localhost:3000
```

## Production build

```bash
npm run build    # type-checks + builds
npm start        # run the production build
```

## Tests

```bash
npm test         # vitest unit tests
```

## Lint & type check

```bash
npm run lint
npx tsc --noEmit
```

## Authentication setup

How the auth flow works (all login logic lives in `src/`):

```
Browser                       Next.js server                     Firebase
────────                      ──────────────                     ────────
1. GET  /api/auth/csrf     → sets double-submit CSRF cookie
2. /login → signInWithEmailAndPassword (client SDK only)
3. POST /api/auth/session  →  validates origin + CSRF
                              verifies ID token            → Auth SDK
                              checks users/{uid} profile   → Firestore
                              mints session cookie         → Auth SDK
   ← HttpOnly Secure SameSite=Strict cookie
4. app pages / Route Handlers / Server Actions
   → requireAdmin() verifies the session on EVERY request:
       emailVerified ✓ (Auth) · users/{uid} exists ✓ · role === "admin" ✓
       isActive === true ✓   (revocation-safe, falls back to Auth state)
5. DELETE /api/auth/session → clears the server cookie (logout also
                              signOut()s the browser Firebase instance
                              and clears client caches)
```

- `src/proxy.ts` performs **only** a lightweight optimistic check: protected
  pages without a session cookie are redirected to `/login?redirect=…`
  (targets validated against open redirects). It performs **no** Firestore
  work; every protected operation re-checks authorization server-side.
- Sessions: 14-day Auth session cookies, verified with revocation checks.
  Role changes / deactivations are picked up on the next request because
  `users/{uid}` is re-read each time (and revocation is checked against
  live Auth state).
- Employees, unverified emails, deactivated or missing profiles get
  explicit denial states; nothing about "hard" failures is leaked.

### Firestore permissions required by the admin panel

The panel talks to Firestore **via the server (Admin SDK)** for auth
checks, so browser access needs are limited to feature screens. Do **not**
broaden the console security rules just to make the UI work — if a query
fails with `permission-denied`, the correct fix is to allow the *admin
role* in the existing rules (pattern used by the Flutter app), not to open
the collection.

## Deploy

`next build` is Vercel-ready. Set the production env vars from
`.env.example` in the hosting provider's dashboard. `STAFFRAIL_REQUIRE_HTTPS_ORIGIN=true`
is implied in production.
