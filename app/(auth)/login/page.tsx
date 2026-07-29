import type { Metadata } from "next"

import { LoginForm } from "@/components/auth/login-form"
import { AuthShell } from "@/components/auth/auth-shell"
import { safeInternalPath } from "@/lib/validation"

export const metadata: Metadata = {
  title: "Log in",
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const params = await searchParams
  const next = safeInternalPath(params.next)

  return (
    <AuthShell title="Welcome back" description="Sign in to your Zyvia workspace.">
      <LoginForm next={next} />
    </AuthShell>
  )
}
