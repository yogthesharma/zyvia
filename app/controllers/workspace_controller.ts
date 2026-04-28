import db from '@adonisjs/lucid/services/db'
import type { HttpContext } from '@adonisjs/core/http'

export default class WorkspaceController {
  async show({ inertia, params }: HttpContext) {
    return inertia.render('home', {
      workspaceSlug: params.workspaceSlug,
    })
  }

  async updateSettings({ request, params, response, session }: HttpContext) {
    const workspaceSlug = params.workspaceSlug as string
    const name = String(request.input('name') ?? '').trim()

    if (!name) {
      session.flash('error', 'Workspace name is required')
      return response.redirect().back()
    }

    await db.from('workspaces').where('slug', workspaceSlug).update({
      name,
      updated_at: new Date(),
    })

    session.flash('success', 'Workspace updated')
    return response.redirect().back()
  }
}
