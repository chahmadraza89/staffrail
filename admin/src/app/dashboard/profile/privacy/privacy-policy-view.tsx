import Link from "next/link"
import { ArrowLeft, ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ORG_CONFIG } from "@/lib/config/organization"

const PRIVACY_SECTIONS = [
  {
    title: "1. Information We Collect",
    content:
      `We collect information that you provide directly to us, including your name, email address, employee ID, and profile photograph. We also collect data related to your professional training and clearance statuses as part of the ${ORG_CONFIG.shortName} platform.`,
  },
  {
    title: "2. How We Use Your Data",
    content:
      "Your information is used to manage your professional profile, track compliance requirements, facilitate workspace management, and ensure the security of the healthcare environment. We do not sell your personal data to third parties.",
  },
  {
    title: "3. Data Retention & Deletion",
    content:
      'We retain your personal data for as long as your account is active. If you choose to delete your account, your data will enter a 30-day "Pending Deletion" period, after which it will be permanently removed from our active systems, subject to legal retention requirements.',
  },
  {
    title: "4. Security Measures",
    content:
      "We implement industry-standard technical and organizational measures to protect your data, including end-to-end encryption for sensitive data and mandatory multi-factor authentication triggers for critical account changes.",
  },
  {
    title: "5. Your Rights",
    content:
      "You have the right to access, correct, or request the deletion of your personal data at any time through your profile settings. For cascading workspace deletions, please contact your workspace administrator.",
  },
] as const

/**
 * Privacy Policy — port of the Flutter
 * `lib/features/auth/presentation/privacy/privacy_policy_page.dart`.
 * The five sections are verbatim; the staggered Flutter entrance animation is
 * intentionally omitted from the admin console.
 */
export function PrivacyPolicyView() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/dashboard/profile">
            <ArrowLeft className="mr-1.5 size-4" />
            Profile
          </Link>
        </Button>
      </div>

      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Privacy &amp; Security</h1>
        <p className="text-muted-foreground text-sm">
          How the {ORG_CONFIG.name} ({ORG_CONFIG.shortName}) platform handles personal data.
        </p>
      </header>

      <Card>
        <CardContent className="flex items-center gap-4">
          <span className="bg-primary/10 text-primary flex size-12 shrink-0 items-center justify-center rounded-full">
            <ShieldCheck className="size-6" />
          </span>
          <div>
            <p className="font-semibold">Your Privacy Matters</p>
            <p className="text-muted-foreground text-sm">
              This policy mirrors the employee app&apos;s Privacy Policy screen.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-7">
          {PRIVACY_SECTIONS.map((section) => (
            <section key={section.title}>
              <h2 className="text-primary text-sm font-semibold tracking-wide">
                {section.title}
              </h2>
              <p className="text-muted-foreground mt-2 text-sm leading-6">
                {section.content}
              </p>
            </section>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
