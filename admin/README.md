# StaffRail Web Portal (Admin & Employee)

Database-free Next.js (App Router, TypeScript, Tailwind CSS, shadcn/ui) web
application for **StaffRail** — employee onboarding, training, clearance
verification, compliance auditing, and staff communications.

## Zero-Database Quickstart

No external database, cloud account, or `.env` file is required to run locally.
The server initializes a seeded in-memory store with demo accounts and sample
compliance records.

```bash
cd admin
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo Credentials (Pre-Seeded)

- **Admin Portal (`/dashboard`)**: `admin@staffrail.local` / `DemoPassword123!`
- **Employee Portal (`/employee`)**: `employee@staffrail.local` / `DemoPassword123!`

The `/login` page also provides quick-fill buttons for both demo roles.

## Scripts

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Production build
npm start        # Run production build
npm test         # Run Vitest unit & component test suite
npm run lint     # Run ESLint
npx tsc --noEmit # Run TypeScript type check
```

## Architecture Highlights

- **Data Store Boundary (`src/lib/data/`)**: Pluggable `DataStore` abstraction
  backed by an in-memory transactional store (`MemoryDataStore`) on the server
  and an HTTP bridge (`RemoteHttpDataStore` via `/api/data` and `/api/files`)
  in the browser.
- **Session & CSRF Security (`src/lib/auth/`)**: HMAC-SHA256 signed HttpOnly
  session cookies (`staffrail_admin_session`) paired with double-submit CSRF
  protection (`staffrail_csrf` + `x-staffrail-csrf`) and strict same-origin
  checks.
- **Native Node.js Audit PDFs (`src/lib/pdf/` + `/api/audit-pdf`)**: Pure
  TypeScript PDF generator producing compliance audit records with no external
  cloud functions or binary dependencies.
- **Configurable Branding (`src/lib/config/organization.ts`)**: Customize
  organization name, address, support contact, and director signatory via
  `NEXT_PUBLIC_ORG_*` variables (see `.env.example`).
