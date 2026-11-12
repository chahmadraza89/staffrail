/**
 * Configurable organization / clinic metadata for open-source deployments.
 * Override via NEXT_PUBLIC_ORG_* environment variables when branding for a
 * specific organization; defaults to generic example clinic copy.
 */
export const ORG_CONFIG = {
  name: process.env.NEXT_PUBLIC_ORG_NAME?.trim() || "Example Health Clinic, LLC",
  shortName: process.env.NEXT_PUBLIC_ORG_SHORT_NAME?.trim() || "StaffRail",
  address:
    process.env.NEXT_PUBLIC_ORG_ADDRESS?.trim() ||
    "100 Main Street, Suite 200 · Anytown, USA 00000",
  supportEmail:
    process.env.NEXT_PUBLIC_ORG_SUPPORT_EMAIL?.trim() || "support@staffrail.local",
  supportPhone:
    process.env.NEXT_PUBLIC_ORG_SUPPORT_PHONE?.trim() || "+1 (800) 555-0199",
  directorName:
    process.env.NEXT_PUBLIC_ORG_DIRECTOR_NAME?.trim() || "Clinic Director",
} as const
