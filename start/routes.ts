/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'
import User from '#models/user'
import { resolveFirstWorkspaceSlugForUser } from '#services/workspace_resolver'

const appNameBySlug: Record<string, string> = {
  frontend: 'Frontend App',
  backend: 'Backend App',
  mobile: 'Mobile App',
  platform: 'Platform App',
}

router.get('/', async ({ auth, response }) => {
  if (!(await auth.check())) {
    return response.redirect('/login')
  }

  const user = auth.user as User
  if (!user.onboardingCompleted) {
    return response.redirect('/onboarding')
  }

  const workspaceSlug = await resolveFirstWorkspaceSlugForUser(user.id)
  if (!workspaceSlug) {
    return response.redirect('/onboarding')
  }

  return response.redirect(`/${workspaceSlug}`)
})

router
  .group(() => {
    router.get('signup', [() => import('#controllers/new_account_controller'), 'create']).as('new_account.create')
    router.post('signup', [() => import('#controllers/new_account_controller'), 'store']).as('new_account.store')

    router.get('login', [() => import('#controllers/session_controller'), 'create']).as('session.create')
    router.post('login', [() => import('#controllers/session_controller'), 'store']).as('session.store')
  })
  .use(middleware.guest())

router
  .group(() => {
    router.get('onboarding', [() => import('#controllers/onboarding_controller'), 'show']).as('onboarding.show')
    router.post('onboarding', [() => import('#controllers/onboarding_controller'), 'store']).as('onboarding.store')

    router.post('logout', [() => import('#controllers/session_controller'), 'destroy']).as('session.destroy')

    router
      .group(() => {
        router.get('/', [() => import('#controllers/workspace_controller'), 'show']).as('workspace.home')
        router.get('settings', ({ params, response }) => {
          return response.redirect(`/${params.workspaceSlug}/settings/preferences`)
        }).as('workspace.settings')
        router
          .get('settings/:section', [() => import('#controllers/settings_controller'), 'showSection'])
          .as('workspace.settings.section')
        router
          .patch('settings/preferences', [() => import('#controllers/settings_controller'), 'updatePreferences'])
          .as('workspace.settings.preferences.update')
        router
          .patch('/', [() => import('#controllers/workspace_controller'), 'updateSettings'])
          .as('workspace.settings.update')
          .use(middleware.workspaceRole({ anyOf: ['owner', 'admin'] }))

        router.on('me/inbox').renderInertia('me/inbox', {}).as('me.inbox')
        router.on('me/assigned').renderInertia('me/assigned', {}).as('me.assigned')
        router.on('me/due-today').renderInertia('me/due_today', {}).as('me.dueToday')

        router.get('apps/:appSlug/:view', async ({ params, inertia }) => {
          const appName = appNameBySlug[params.appSlug] ?? 'App'
          const viewName = `${String(params.view).charAt(0).toUpperCase()}${String(params.view).slice(1)}`
          return inertia.render('apps/view', { appName, viewName })
        })
      })
      .prefix('/:workspaceSlug')
      .use([middleware.workspace(), middleware.workspaceRole({ anyOf: ['owner', 'admin', 'member'] })])
  })
  .use([middleware.auth(), middleware.onboarding()])
