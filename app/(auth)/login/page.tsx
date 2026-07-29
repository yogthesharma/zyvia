import type { Metadata } from "next"

import { LoginForm } from "@/components/auth/login-form"
import { AuthShell } from "@/components/auth/auth-shell"

export const metadata: Metadata = {
  title: "Log in",
}

export default function LoginPage() {
  return (
    <AuthShell title="Welcome back" description="Sign in to your Zyvia workspace.">
      <LoginForm />
    </AuthShell>
  )
}
