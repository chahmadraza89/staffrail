import { PrivacyPolicyView } from "@/app/dashboard/profile/privacy/privacy-policy-view"
import { requireAdminProfile } from "@/lib/auth/profile-context"

export const instant = false

export default async function PrivacyPolicyPage() {
  await requireAdminProfile("/dashboard/profile/privacy")
  return <PrivacyPolicyView />
}
