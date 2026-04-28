import db from '@adonisjs/lucid/services/db'
import Workspace from '#models/workspace'
import { onboardingValidator } from '#validators/onboarding'
import type { HttpContext } from '@adonisjs/core/http'
import { resolveFirstWorkspaceSlugForUser } from '#services/workspace_resolver'

export default class OnboardingController {
  async show({ auth, inertia, response }: HttpContext) {
    if (!auth.user) {
      return response.redirect('/login')
    }

    if (auth.user.onboardingCompleted) {
      const workspaceSlug = await resolveFirstWorkspaceSlugForUser(auth.user.id)
      if (workspaceSlug) {
        return response.redirect(`/${workspaceSlug}`)
      }
    }

    return inertia.render('auth/onboarding', {})
  }

  async store({ auth, request, response }: HttpContext) {
    const user = auth.user
    if (!user) {
      return response.redirect('/login')
    }

    const payload = await request.validateUsing(onboardingValidator)

    const workspace = await db.transaction(async (trx) => {
      const createdWorkspace = await Workspace.create(
        {
          name: payload.workspaceName,
          slug: payload.workspaceSlug,
          ownerUserId: user.id,
        },
        { client: trx }
      )

      await trx.table('workspace_members').insert({
        workspace_id: createdWorkspace.id,
        user_id: user.id,
        role: 'owner',
        created_at: new Date(),
      })

      user.useTransaction(trx)
      user.onboardingCompleted = true
      user.preferredTheme = payload.preferredTheme
      await user.save()

      return createdWorkspace
    })

    return response.redirect(`/${workspace.slug}`)
  }
}
