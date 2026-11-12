# StaffRail

Open-source, database-free staff onboarding, compliance training, clearance tracking, and audit PDF management platform.

StaffRail provides:
- **Next.js Web Portal (`admin/`)**: Complete Node.js Admin Console and Employee Self-Service Portal backed by a built-in in-memory `DataStore`, HMAC-signed cookie sessions, and PDF generation — **zero external database or cloud backend required**.
- **Flutter Cross-Platform App (`lib/`)**: Mobile/desktop client backed by a pure-Dart in-memory `LocalDataStore`, `LocalAuth`, and `LocalStorage` for offline/database-free operation.
- **Static Showcase ([`docs/index.html`](docs/index.html))**: Standalone HTML overview of the app — open it directly in any browser locally, or publish `docs/` via **GitHub Settings → Pages** to get a live link you can put at the top of this README.

---

## Quick Start — Next.js Web Portal (`admin/`)

### Requirements
- **Node.js 20+** and **npm**

### Run Locally (Database-Free)

```bash
cd admin
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. No database setup, Docker container, or cloud project is needed — the portal seeds an in-memory demo workspace automatically on startup.

### Demo Credentials

Use the quick-fill buttons on `/login` or sign in manually:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@staffrail.local` | `DemoPassword123!` |
| **Employee** | `employee@staffrail.local` | `DemoPassword123!` |

### Organization Customization

Configure organization metadata in `admin/.env.local` (all optional; sensible defaults are provided):

```env
STAFFRAIL_SESSION_SECRET=replace-with-a-random-32-byte-secret
NEXT_PUBLIC_ORG_NAME="Example Health Clinic, LLC"
NEXT_PUBLIC_ORG_SHORT_NAME="StaffRail"
NEXT_PUBLIC_ORG_ADDRESS="100 Main Street, Suite 200 · Anytown, USA 00000"
NEXT_PUBLIC_ORG_SUPPORT_EMAIL="support@staffrail.local"
NEXT_PUBLIC_ORG_SUPPORT_PHONE="+1 (800) 555-0199"
NEXT_PUBLIC_ORG_DIRECTOR_NAME="Clinic Director"
```

---

## Quick Start — Flutter App

### Requirements
- **Flutter SDK 3.x** / **Dart 3.10+**

### Run & Test (Database-Free)

```bash
flutter pub get
flutter analyze
flutter test
flutter run
```

Demo organization settings for Flutter live in [`lib/core/config/organization_config.dart`](lib/core/config/organization_config.dart), and the database-free store lives in [`lib/core/data/local_data_store.dart`](lib/core/data/local_data_store.dart).

---

## Repository Structure

```text
.
├── admin/                  # Next.js 16 Admin & Employee Web Portal (Node.js)
│   ├── src/app/            # App Router pages & local API routes (/api/auth, /api/data, /api/files, /api/audit-pdf)
│   ├── src/lib/data/       # Database-free DataStore interface, MemoryDataStore & seeded demo workspace
│   ├── src/lib/auth/       # Local HMAC-SHA256 session cookies & route guards
│   ├── src/lib/admin/      # Admin workflows, compliance helpers, templates & audit PDF builder
│   └── src/lib/employee/   # Employee portal streams & task actions
├── lib/                    # Flutter cross-platform application
├── test/                   # Flutter unit & widget tests
├── docs/                   # Static HTML overview / GitHub Pages showcase (docs/index.html)
├── CONTRIBUTING.md         # Contributor guide & verification commands
└── LICENSE                 # MIT License
```

---

## Verification Commands

```bash
# Next.js (admin/)
cd admin
npx tsc --noEmit
npm run lint
npm test
npm run build

# Flutter (root)
flutter analyze
flutter test
```

## License

Licensed under the [MIT License](LICENSE).
