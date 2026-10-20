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

## Firestore composite indexes

The dashboard's "Action Required" query filters the `onboarding_tasks`
collection **group** server-side (equality on `adminId`, `status in`
actionable statuses, `updatedAt desc`) and therefore requires one composite
index. The definition ships with the repository so every environment
creates it identically — see `firestore.indexes.json` (project root, wired
into `firebase.json`) :

```
collectionGroup: onboarding_tasks     (queryScope: COLLECTION_GROUP)
fields: adminId ASC, status ASC, updatedAt DESC
```

### Creating the index

Pick one:

- **Firebase CLI** (uses the committed definition, applies to ALL listed
  indexes): `firebase deploy --only firestore:indexes --project bhmh-fd67c`
  (index creation changes no documents and no rules — only query planning).
- **Console**: open a dashboard panel while the index is missing; the
  actionable error banner mentions "Missing Firestore composite index." and
  Firestore's error carries a one-click **create index** link you can paste
  into the browser.

Index creation takes a few minutes; it does not touch production records.

### After the index is ready

**Important:** a live Firestore subscription that already failed (missing
index) does **NOT** recover by itself once the index finishes building.
The affected panel shows an actionable error instead of a fake healthy
state — press its **Retry** button (or reload the page) to start a fresh
subscription. Never restart the browser to "fix" it silently.

### Partial counts / pagination semantics

The dashboard shows the **newest** actionable tasks, one page of
`DEFAULT_ACTION_TASK_PAGE_SIZE` (25). Actionable-status filtering happens
server-side, so a page can never silently drop an older approval in favor
of newer non-actionable tasks; but if the page is full the count is shown
as `N+` and labelled *partial*, and a **Load older approvals** button
re-subscribes with the next page size (older approvals become reachable;
a full page of real approvals always offers this). Compliance alerts are
derived from the current page: while the page is partial the alerts panel
explicitly says it is **not** a complete compliance assessment.
### Employee provisioning — the joint callable + client result

The `registerStaff` callable creates the Auth account + `users/{uid}` doc +
welcome notification AND writes a small **legacy subset** (4 minimal
onboarding tasks incl. `personal_details` / `employee_handbook`, plus one
`hipaa_compliance` training). The admin panel then provisions the FULL Dart
template set inside **one transaction** and resolves that legacy subset in
the same transaction — so a web-registered employee ends with exactly
**46 onboarding tasks + 19 trainings + 4 clearances** and no concurrent
write can erase employee work mid-flight:

- IDs: onboarding tasks use the `create()` slug, trainings use the
  **different** `_createTraining` slug (dash stays a dash: `skills-streaming`,
  not `skills_streaming`) — see `seed-templates.ts`.
- ALL documents are read before any write; a template is created only if it
  is still missing at the write boundary, existing docs get an
  overlay/descriptive merge (status/updatedAt/progress preserved), and a
  legacy default is deleted only if it is **still pristine** when the
  transaction commits — a signature landing mid-flight is retained and
  reported; transaction retries re-read (revalidate) everything.
- If provisioning fails, the account still RECOVERS: the **deployed**
  `registerStaff` callable writes `setupStatus: "incomplete"` on the user
  doc when it creates a web account (request option `webProvisioning:
  true`, written before the callable returns success) — so the marker
  exists even if the browser closes before provisioning runs, and nothing
  client-side needs to write it after a failure. The web client's only
  status writes are: (a) a **gap fallback** used only while an OLDER
  callable deployment is live, which fills the field **only when it is
  missing entirely** (never overwriting an `"incomplete"` from the callable
  or a concurrent `"complete"` from a successful retry), and (b) the
  provisioning transaction flipping it to `"complete"` **only on success**.
  The Directory card shows a **Setup incomplete** badge with a **Complete
  setup** action that retries the SAME uid (`completeEmployeeSetup` —
  active-admin + ownership checks, idempotent fill-missing/overlay-only
  provisioning). Failures surface as an actionable banner; the reset link
  is never stored in Firestore or browser storage.
- **DEPLOYMENT REQUIREMENT:** the server-side marker guarantee (and with
  it, refresh-proof recovery for a browser closed immediately after
  registration) requires the updated callable to be deployed:
  `firebase deploy --only functions`. **The currently deployed backend has
  NOT been deployed with this change** — until then, web registrations
  rely on the gap fallback above, which only fills a *missing* marker and
  cannot rescue a browser closed between account creation and the client
  marking step.
- `updateEmployee` validates the employee is still active **inside the
  write transaction** (a deactivation racing the edit cannot bypass it).

### Directory error vs empty state

Empty-directory / empty-filter / search-miss texts render only after a
**successful, ready** read. A failed read shows the error banner + Retry;
cards retained from the last successful update are labelled stale and no
empty-state message is shown.

### Employee detail page (`/dashboard/directory/[employeeId]`)

Port of the Flutter `AdminDirectoryInnerProfileCard` screen. Data model:

- **Single-employee subscription.** The page never subscribes to the
  workspace-wide employees stream. `subscribeEmployeeDetail(employeeId, adminUid)`
  attaches exactly FOUR listeners independent of staff count:
  `doc(users/{employeeId})` first (the ownership gate), then — only after the
  gate confirmed `doc.adminId === adminUid && doc.role === "employee"` — the
  three document modules (`onboarding_tasks` / `trainings` / `clearance`).
  A deletion, ownership/role change, or profile failure STOPS and resets the
  document-module listeners (generation-token guarded against late callbacks)
  and shows the not-found / not-owned panel. The same module snapshots feed
  BOTH the checklist grouping and the progress bars, through the shared pure
  formulas in `src/lib/admin/progress-models.ts` (identical to Dashboard and
  Directory — onboarding counts the `isCompleted` flag over tasks whose
  status is not `noActionRequired`; training raw `completed`; clearance raw
  `verified`; overall averages only the modules that contain data).
- `src/lib/admin/compliance-helpers.ts` is a port of `ComplianceHelpers` +
  the Dart merge Builder **with documented corrections** (the Dart behavior
  hid requirements; no Firestore record is touched by this fix):
  1. Template title/actionType still override the live document's own
     values (guards against the buggy "Onboarding Task" duplicate titles).
  2. The ten seeded ids the Dart category lists predates — 8 policy
     acknowledgments plus `tax_documents_w_4` / `tax_documents_w_1` — were
     invisible in Flutter; they are Category 2 here.
  3. Onboarding records matching no category list land in a visible
     **"Additional Requirements"** fallback group instead of vanishing
     (Flutter's `tax_documents_w_4`, custom forms, …).
  4. Custom and retained-legacy trainings/clearances are appended after the
     19/4 template rows instead of being dropped.
  5. Identity is `source + document id` (see `subtaskKey`): identical ids in
     different modules are distinct requirements and both stay visible
     (the Dart code dropped one side of such collisions). Two Category-2
     ids (`corporate_confidentiality_statement`,
     `transportation_acknowledgement_statement`) still have no default task —
     they materialize only when such a doc exists, as in Dart.
  → A fresh employee shows 3/**31**/6/3/3/19/4 = **69 rows** (+ an empty
  fallback group), i.e. all 46 onboarding + 19 training + 4 clearance
  requirements, instead of Flutter's 59.
- **Module read states are explicit** (pending / ready / failed) and drive
  what may be rendered:
  - A module still connecting renders a loading state — its requirements
    are never fabricated, and counts are labelled partial.
  - A module that fails BEFORE delivering anything shows the actionable
    error + Retry and contributes nothing — template defaults are never
    mislabelled as retained results.
  - A module that fails after delivering keeps exactly its delivered rows,
    labelled with a per-category "Stale" chip + the stale note; empty
    retained reads retain nothing. Counts are partial whenever any module
    is unavailable.
  This is a deliberate hardening over Flutter, which renders all 69
  defaults even while its loaders fail.
- The Dart "No compliance requirements found." copy is kept but effectively
  unreachable (template-backed categories are never all-empty on a ready
  read), exactly like the Flutter source.
- Header lifecycle actions (Edit / Deactivate / durable Complete-setup
  recovery) behave identically to the Directory cards.

### Task review panel (accept / reject / skip / blank form)

Port of `TaskDetailPanel` + the Flutter split-screen task manager.
`src/app/dashboard/directory/[employeeId]/task-manager.tsx` renders the
checklist tiles plus the selected requirement; on screens ≥ 1280 px the
detail is a sticky side pane, below that the same panel opens in a dialog.
Requirements keep their `source:id` identity, so a training `start` row and
an onboarding `start` row open different panels.

Task actions live in `src/lib/admin/task-actions.ts` as **direct Firestore
writes** (no new callables) and mirror the Dart payloads the employee app
reads. Ownership fields (`employeeName`, and `title` for skip) are added when
the admin surface passes them:

| Action | Source | Write |
| --- | --- | --- |
| Accept | onboarding | `setDoc(merge)`: `verified`, `isCompleted: true`, `updatedAt`, `completedAt`, `employeeName` |
| Accept | training | `updateDoc`: `verified`, `updatedAt` (Dart does **not** stamp `completedAt` here — kept verbatim) |
| Accept | clearance | `updateDoc`: `verified`, `verifiedAt`, `updatedAt` |
| Reject | onboarding | `setDoc(merge)`: `rejected`, `isCompleted: false`, `updatedAt`, `rejectionReason`, `employeeName` |
| Reject | training / clearance | `updateDoc`: `actionRequired`, `updatedAt`, `rejectionReason` |
| Skip / unskip | onboarding | `setDoc(merge)`: `noActionRequired` / `notStarted`, `isCompleted: false`, `updatedAt`, `employeeName`, `title` |
| Blank form URL | I-9 / W-9 onboarding | `updateDoc`: **only** `blankFormLink`, `updatedAt` |

Documented corrections (no Firestore data is repaired by the panel):

1. **Skip is onboarding-only.** Flutter showed the skip switch for every
   source but always wrote to `onboarding_tasks`, so skipping a training or
   clearance row silently wrote to a non-existent document. The control is
   hidden for those sources and the action rejects them defensively.
2. **Blank-form links are non-destructive.** Flutter re-sent the task status
   and `isCompleted: false`, which un-completed verified I-9/W-9 tasks; it
   also used `setDoc`, which could recreate a deleted task. The web panel
   writes only `blankFormLink + updatedAt`, requires an `http(s)` URL, and is
   restricted to the two tax tasks.
3. **No stale approvals.** Every review control is disabled while the
   owning module holds retained (stale) data. Approving from a snapshot that
   may be minutes old can double-review an already-decided task; the panel
   shows an explicit "live data could not be refreshed" note instead of
   failing silently. Retained rows stay readable.
4. **Split-field tasks keep Flutter's hidden approve/reject** (they are
   counter-signed through their form) but show a read-only employee +
   administrative submission summary so reviewers can inspect what was
   submitted. `AdminAcknowledgeFormView` renders legal documents verbatim
   from `src/lib/admin/legal-content.ts`.
5. **No fabricated admin upload / audit PDF yet.** Phase 5 owns uploads and
   server-side PDFs. For now the panel links directly to uploaded originals
   and renders the submitted form data; it never claims a document download
   that does not exist.

The task timeline, skip control, blank-form card, file/signature previews,
form data, administrative review (including the rejection reason) and
activity footer are all covered by tests in
`src/app/dashboard/directory/__tests__/task-detail-panel.test.tsx` and
`admin-form-views.test.tsx`; the payloads are pinned in
`src/lib/admin/__tests__/task-actions.test.ts`.

**Production prerequisite:** these are client writes, so Firestore security
rules are the only server-side guard. Confirm the console-managed rules only
allow an admin to write tasks for employees they own (`adminId`) before
using this panel against real data.



## Deploy

`next build` is Vercel-ready. Set the production env vars from
`.env.example` in the hosting provider's dashboard. `STAFFRAIL_REQUIRE_HTTPS_ORIGIN=true`
is implied in production.
