import User from '#models/user'
import { resolveFirstWorkspaceSlugForUser } from '#services/workspace_resolver'
import type { HttpContext } from '@adonisjs/core/http'

export default class SessionController {
  async create({ inertia }: HttpContext) {
    return inertia.render('auth/login', {})
  }

  async store({ request, auth, response }: HttpContext) {
    const { email, password } = request.all()
    const user = await User.verifyCredentials(email, password)

    await auth.use('web').login(user)
    if (!user.onboardingCompleted) {
      return response.redirect().toRoute('onboarding.show')
    }

    const workspaceSlug = await resolveFirstWorkspaceSlugForUser(user.id)
    if (workspaceSlug) {
      return response.redirect(`/${workspaceSlug}`)
    }

    return response.redirect().toRoute('onboarding.show')
  }

  async destroy({ auth, response }: HttpContext) {
    await auth.use('web').logout()
    response.redirect().toRoute('session.create')
  }
}
