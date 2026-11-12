# Contributing to StaffRail

Thank you for your interest in contributing to **StaffRail**!

## Architecture Rules

1. **Database-free core**: Keep all data access behind the repository/store interfaces:
   - Next.js (`admin/`): `DataStore` (`admin/src/lib/data/types.ts`) with `MemoryDataStore` / `/api/data`. Do not add direct database SDK dependencies to core features.
   - Flutter (`lib/`): `LocalDataStore`, `LocalAuth`, `LocalStorage`, and `LocalFunctions` (`lib/core/data/local_data_store.dart`).
2. **Configurable branding**: Use `ORG_CONFIG` (`admin/src/lib/config/organization.ts`) and `OrganizationConfig` (`lib/core/config/organization_config.dart`) instead of hardcoding clinic names, addresses, or contact details.
3. **No secrets or personal data**: Never commit `.env.local`, service account credentials, API keys, or real employee/patient records.
4. **Tests**: Add unit/integration tests alongside new logic and keep existing suites green before opening a pull request.

## Running Checks

### Next.js Web Portal (`admin/`)

```bash
cd admin
npm install
npx tsc --noEmit
npm run lint
npm test
npm run build
```

### Flutter Client (repository root)

```bash
flutter pub get
flutter analyze
flutter test
```

## Pull Request Checklist

- All checks pass in the affected subproject(s).
- Changes are scoped, focused, and do not introduce database vendor lock-in.
- Any new configuration variables are documented in `admin/.env.example`.
