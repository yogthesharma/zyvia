import type { Builder } from "@/lib/graphql/builder"

export type UserRow = {
  id: string
  full_name: string | null
  avatar_url: string | null
  theme: string
  onboarding_step: string
  email?: string | null
}

export function registerUser(builder: Builder) {
  const UserRef = builder.objectRef<UserRow>("User")

  UserRef.implement({
    fields: (t) => ({
      id: t.exposeID("id"),
      fullName: t.exposeString("full_name", { nullable: true }),
      avatarUrl: t.exposeString("avatar_url", { nullable: true }),
      theme: t.exposeString("theme"),
      onboardingStep: t.exposeString("onboarding_step"),
      email: t.string({
        nullable: true,
        resolve: (user) => user.email ?? null,
      }),
    }),
  })

  builder.queryField("viewer", (t) =>
    t.field({
      type: UserRef,
      nullable: true,
      resolve: async (_root, _args, ctx) => {
        if (!ctx.user) return null

        const { data: profile } = await ctx.supabase
          .from("profiles")
          .select("id, full_name, avatar_url, theme, onboarding_step")
          .eq("id", ctx.user.id)
          .maybeSingle()

        if (!profile) return null

        return { ...profile, email: ctx.user.email }
      },
    })
  )
}
