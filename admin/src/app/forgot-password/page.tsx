import { Suspense } from "react"
import { ForgotPasswordForm } from "./forgot-password-form"

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <Suspense fallback={null}>
        <ForgotPasswordForm />
      </Suspense>
    </main>
  )
}
