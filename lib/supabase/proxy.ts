import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import { isDefaultHomeView } from "@/lib/preferences/schema"
import { getSupabaseEnv } from "@/lib/supabase/env"
import { safeInternalPath } from "@/lib/validation"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const { url, publishableKey } = getSupabaseEnv()

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        )
        supabaseResponse = NextResponse.next({
          request,
        })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  const { data } = await supabase.auth.getClaims()
  const user = data?.claims
  const userId = typeof user?.sub === "string" ? user.sub : null
  const { pathname } = request.nextUrl

  const isAuthPage = pathname === "/login" || pathname === "/signup"
  const isProtected =
    pathname.startsWith("/onboarding") || pathname.startsWith("/w/")

  if (!user && isProtected) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = "/login"
    const next = safeInternalPath(pathname)
    if (next) redirectUrl.searchParams.set("next", next)
    return NextResponse.redirect(redirectUrl)
  }

  if (user && userId && isAuthPage) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_step, onboarding_completed_at")
      .eq("id", userId)
      .maybeSingle()

    const redirectUrl = request.nextUrl.clone()

    if (profile?.onboarding_step === "done" && profile.onboarding_completed_at) {
      const { data: membership } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle()

      if (membership) {
        const { data: workspace } = await supabase
          .from("workspaces")
          .select("slug")
          .eq("id", membership.workspace_id)
          .maybeSingle()

        if (workspace?.slug) {
          const { data: prefs } = await supabase
            .from("user_preferences")
            .select("default_home_view")
            .eq("user_id", userId)
            .maybeSingle()

          const homeView = isDefaultHomeView(prefs?.default_home_view)
            ? prefs.default_home_view
            : "issues"

          redirectUrl.pathname = `/w/${workspace.slug}/${homeView}`
          redirectUrl.search = ""
          return NextResponse.redirect(redirectUrl)
        }
      }

      redirectUrl.pathname = "/onboarding/workspace"
      redirectUrl.search = ""
      return NextResponse.redirect(redirectUrl)
    }

    const step = profile?.onboarding_step ?? "profile"
    const stepPath =
      step === "workspace"
        ? "/onboarding/workspace"
        : step === "team"
          ? "/onboarding/team"
          : step === "theme"
            ? "/onboarding/theme"
            : step === "invite"
              ? "/onboarding/invite"
              : "/onboarding/profile"

    redirectUrl.pathname = stepPath
    redirectUrl.search = ""
    return NextResponse.redirect(redirectUrl)
  }

  return supabaseResponse
}
