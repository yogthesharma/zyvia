import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import UserTransformer from '#transformers/user_transformer'
import BaseInertiaMiddleware from '@adonisjs/inertia/inertia_middleware'
import { resolveWorkspaceRoleForUser, resolveWorkspacesForUser, type WorkspaceRole } from '#services/workspace_resolver'

type SidebarModel = {
  sections: Array<{
    key: string
    label?: string
    items: Array<{ key: string; title: string; url: string; iconKey: string }>
  }>
  apps: Array<{
    name: string
    url: string
    iconKey: string
    items: Array<{ title: string; url: string }>
  }>
}

export default class InertiaMiddleware extends BaseInertiaMiddleware {
  private buildSidebarAccess(role: WorkspaceRole | null | undefined) {
    if (!role) {
      return {
        personal: false,
        projects: false,
        myWork: {
          inbox: false,
          assigned: false,
          dueToday: false,
        },
        apps: {
          frontend: false,
          backend: false,
          mobile: false,
          platform: false,
        },
      }
    }

    // Keep same entries for all roles for now, but source of truth is backend.
    return {
      personal: true,
      projects: true,
      myWork: {
        inbox: true,
        assigned: true,
        dueToday: true,
      },
      apps: {
        frontend: true,
        backend: true,
        mobile: true,
        platform: true,
      },
    }
  }

  private async getWorkspaces(ctx: HttpContext) {
    const userId = ctx.auth.user?.id
    if (!userId) {
      return []
    }

    return resolveWorkspacesForUser(userId)
  }

  private buildSidebarModel(workspaceSlug: string | undefined, access: ReturnType<InertiaMiddleware['buildSidebarAccess']>) {
    const baseUrl = workspaceSlug ? `/${workspaceSlug}` : ''

    const sections: SidebarModel['sections'] = []
    if (access.personal) {
      sections.push({
        key: 'personal',
        items: [
          access.myWork.assigned
            ? { key: 'my-issues', title: 'My issues', url: `${baseUrl}/me/assigned`, iconKey: 'home' }
            : null,
          access.myWork.dueToday
            ? { key: 'pulse', title: 'Pulse', url: `${baseUrl}/me/due-today`, iconKey: 'radar' }
            : null,
          access.myWork.dueToday
            ? { key: 'drafts', title: 'Drafts', url: `${baseUrl}/me/due-today`, iconKey: 'file-plus' }
            : null,
          access.myWork.inbox ? { key: 'inbox', title: 'Inbox', url: `${baseUrl}/me/inbox`, iconKey: 'inbox' } : null,
        ].filter((item): item is { key: string; title: string; url: string; iconKey: string } => Boolean(item)),
      })
    }

    if (access.projects) {
      sections.push({
        key: 'workspace',
        label: 'Workspace',
        items: [
          { key: 'initiatives', title: 'Initiatives', url: `${baseUrl}/apps/platform/overview`, iconKey: 'circle' },
          { key: 'projects', title: 'Projects', url: `${baseUrl}/apps/frontend/board`, iconKey: 'kanban' },
          { key: 'views', title: 'Views', url: `${baseUrl}/apps/backend/overview`, iconKey: 'sparkles' },
        ],
      })
    }

    const apps: SidebarModel['apps'] = [
      access.apps.frontend
        ? {
            name: 'Frontend App',
            url: '#',
            iconKey: 'home',
            items: [
              { title: 'Overview', url: `${baseUrl}/apps/frontend/overview` },
              { title: 'Board', url: `${baseUrl}/apps/frontend/board` },
              { title: 'Backlog', url: `${baseUrl}/apps/frontend/backlog` },
              { title: 'Cycles', url: `${baseUrl}/apps/frontend/cycles` },
            ],
          }
        : null,
      access.apps.backend
        ? {
            name: 'Backend App',
            url: '#',
            iconKey: 'bot',
            items: [
              { title: 'Overview', url: `${baseUrl}/apps/backend/overview` },
              { title: 'Board', url: `${baseUrl}/apps/backend/board` },
              { title: 'Backlog', url: `${baseUrl}/apps/backend/backlog` },
              { title: 'Cycles', url: `${baseUrl}/apps/backend/cycles` },
            ],
          }
        : null,
      access.apps.mobile
        ? {
            name: 'Mobile App',
            url: '#',
            iconKey: 'kanban',
            items: [
              { title: 'Overview', url: `${baseUrl}/apps/mobile/overview` },
              { title: 'Board', url: `${baseUrl}/apps/mobile/board` },
              { title: 'Backlog', url: `${baseUrl}/apps/mobile/backlog` },
              { title: 'Cycles', url: `${baseUrl}/apps/mobile/cycles` },
            ],
          }
        : null,
      access.apps.platform
        ? {
            name: 'Platform App',
            url: '#',
            iconKey: 'terminal',
            items: [
              { title: 'Overview', url: `${baseUrl}/apps/platform/overview` },
              { title: 'Board', url: `${baseUrl}/apps/platform/board` },
              { title: 'Backlog', url: `${baseUrl}/apps/platform/backlog` },
              { title: 'Cycles', url: `${baseUrl}/apps/platform/cycles` },
            ],
          }
        : null,
    ].filter((item): item is SidebarModel['apps'][number] => Boolean(item))

    return { sections, apps }
  }

  async share(ctx: HttpContext) {
    /**
     * The share method is called everytime an Inertia page is rendered. In
     * certain cases, a page may get rendered before the session middleware
     * or the auth middleware are executed. For example: During a 404 request.
     *
     * In that case, we must always assume that HttpContext is not fully hydrated
     * with all the properties
     */
    const { session, auth } = ctx as Partial<HttpContext>

    /**
     * Fetching the first error from the flash messages
     */
    const error = session?.flashMessages.get('error') as string
    const success = session?.flashMessages.get('success') as string

    /**
     * Data shared with all Inertia pages. Make sure you are using
     * transformers for rich data-types like Models.
     */
    const workspaces = await this.getWorkspaces(ctx)
    const workspaceSlug = ctx.params.workspaceSlug as string | undefined
    const workspaceRole =
      auth?.user && workspaceSlug ? await resolveWorkspaceRoleForUser(auth.user.id, workspaceSlug) : undefined
    const sidebarAccess = this.buildSidebarAccess(workspaceRole)
    const sidebarModel = this.buildSidebarModel(workspaceSlug, sidebarAccess)

    return {
      errors: ctx.inertia.always(this.getValidationErrors(ctx)),
      flash: ctx.inertia.always({
        error,
        success,
      }),
      user: ctx.inertia.always(auth?.user ? UserTransformer.transform(auth.user) : undefined),
      workspaceSlug: ctx.inertia.always(workspaceSlug),
      workspaceRole: ctx.inertia.always(workspaceRole ?? undefined),
      sidebarAccess: ctx.inertia.always(sidebarAccess),
      sidebarModel: ctx.inertia.always(sidebarModel),
      workspaces: ctx.inertia.always(workspaces),
    }
  }

  async handle(ctx: HttpContext, next: NextFn) {
    await this.init(ctx)

    const output = await next()
    this.dispose(ctx)

    return output
  }
}

declare module '@adonisjs/inertia/types' {
  type MiddlewareSharedProps = InferSharedProps<InertiaMiddleware>
  export interface SharedProps extends MiddlewareSharedProps {}
}
