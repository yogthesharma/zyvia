import {
  hasWorkspaceRole,
  resolveFirstWorkspaceSlugForUser,
  type WorkspaceRole,
} from '#services/workspace_resolver'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

type WorkspaceRoleOptions = {
  anyOf: WorkspaceRole[]
}

export default class WorkspaceRoleMiddleware {
  async handle(ctx: HttpContext, next: NextFn, options: WorkspaceRoleOptions) {
    const user = ctx.auth.user
    const workspaceSlug = ctx.params.workspaceSlug as string | undefined

    if (!user || !workspaceSlug) {
      return ctx.response.redirect('/login')
    }

    const allowedRoles = options.anyOf ?? []
    if (allowedRoles.length === 0) {
      return next()
    }

    const authorized = await hasWorkspaceRole(user.id, workspaceSlug, allowedRoles)
    if (!authorized) {
      const fallbackWorkspaceSlug = await resolveFirstWorkspaceSlugForUser(user.id)
      if (fallbackWorkspaceSlug) {
        return ctx.response.redirect(`/${fallbackWorkspaceSlug}`)
      }

      return ctx.response.redirect().toRoute('onboarding.show')
    }

    return next()
  }
}
