import { hasWorkspaceAccess, resolveFirstWorkspaceSlugForUser } from '#services/workspace_resolver'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class WorkspaceAccessMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.auth.user
    const workspaceSlug = ctx.params.workspaceSlug as string | undefined

    if (!user || !workspaceSlug) {
      return ctx.response.redirect('/login')
    }

    const canAccessWorkspace = await hasWorkspaceAccess(user.id, workspaceSlug)
    if (!canAccessWorkspace) {
      const firstWorkspace = await resolveFirstWorkspaceSlugForUser(user.id)
      if (firstWorkspace) {
        return ctx.response.redirect(`/${firstWorkspace}`)
      }
      return ctx.response.redirect().toRoute('onboarding.show')
    }

    return next()
  }
}
