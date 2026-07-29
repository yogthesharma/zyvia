import type { Metadata } from "next"

import { SignupForm } from "@/components/auth/signup-form"
import { AuthShell } from "@/components/auth/auth-shell"

export const metadata: Metadata = {
  title: "Sign up",
}

export default function SignupPage() {
  return (
    <AuthShell
      title="Create your account"
      description="Email and password — we’ll set up your workspace next."
    >
      <SignupForm />
    </AuthShell>
  )
}
