import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { Authenticators } from '@adonisjs/auth/types'
import { resolveFirstWorkspaceSlugForUser } from '#services/workspace_resolver'

/**
 * Guest middleware is used to deny access to routes that should
 * be accessed by unauthenticated users.
 *
 * For example, the login page should not be accessible if the user
 * is already logged-in
 */
export default class GuestMiddleware {
  /**
   * The URL to redirect to when user is logged-in
   */
  redirectTo = '/onboarding'

  async handle(
    ctx: HttpContext,
    next: NextFn,
    options: { guards?: (keyof Authenticators)[] } = {}
  ) {
    for (let guard of options.guards || [ctx.auth.defaultGuard]) {
      if (await ctx.auth.use(guard).check()) {
        const user = ctx.auth.user
        ctx.session.reflash()
        if (!user) {
          return ctx.response.redirect(this.redirectTo, true)
        }

        if (!user.onboardingCompleted) {
          return ctx.response.redirect('/onboarding', true)
        }

        const workspaceSlug = await resolveFirstWorkspaceSlugForUser(user.id)
        if (workspaceSlug) {
          return ctx.response.redirect(`/${workspaceSlug}`, true)
        }

        return ctx.response.redirect('/onboarding', true)
      }
    }

    return next()
  }
}
