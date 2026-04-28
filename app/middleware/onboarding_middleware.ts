import { resolveFirstWorkspaceSlugForUser } from '#services/workspace_resolver'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class OnboardingMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.auth.user

    if (!user) {
      return ctx.response.redirect('/login')
    }

    if (!user.onboardingCompleted) {
      const routeName = ctx.route?.name
      const isOnboardingRoute = routeName === 'onboarding.show' || routeName === 'onboarding.store'
      if (!isOnboardingRoute) {
        return ctx.response.redirect().toRoute('onboarding.show')
      }
    }

    const routeName = ctx.route?.name
    if (routeName === 'onboarding.show') {
      const workspaceSlug = await resolveFirstWorkspaceSlugForUser(user.id)
      if (workspaceSlug) {
        return ctx.response.redirect(`/${workspaceSlug}`)
      }
    }

    return next()
  }
}
