/* eslint-disable prettier/prettier */
import type { AdonisEndpoint } from '@tuyau/core/types'
import type { Registry } from './schema.d.ts'
import type { ApiDefinition } from './tree.d.ts'

const placeholder: any = {}

const routes = {
  'new_account.create': {
    methods: ["GET","HEAD"],
    pattern: '/signup',
    tokens: [{"old":"/signup","type":0,"val":"signup","end":""}],
    types: placeholder as Registry['new_account.create']['types'],
  },
  'new_account.store': {
    methods: ["POST"],
    pattern: '/signup',
    tokens: [{"old":"/signup","type":0,"val":"signup","end":""}],
    types: placeholder as Registry['new_account.store']['types'],
  },
  'session.create': {
    methods: ["GET","HEAD"],
    pattern: '/login',
    tokens: [{"old":"/login","type":0,"val":"login","end":""}],
    types: placeholder as Registry['session.create']['types'],
  },
  'session.store': {
    methods: ["POST"],
    pattern: '/login',
    tokens: [{"old":"/login","type":0,"val":"login","end":""}],
    types: placeholder as Registry['session.store']['types'],
  },
  'onboarding.show': {
    methods: ["GET","HEAD"],
    pattern: '/onboarding',
    tokens: [{"old":"/onboarding","type":0,"val":"onboarding","end":""}],
    types: placeholder as Registry['onboarding.show']['types'],
  },
  'onboarding.store': {
    methods: ["POST"],
    pattern: '/onboarding',
    tokens: [{"old":"/onboarding","type":0,"val":"onboarding","end":""}],
    types: placeholder as Registry['onboarding.store']['types'],
  },
  'session.destroy': {
    methods: ["POST"],
    pattern: '/logout',
    tokens: [{"old":"/logout","type":0,"val":"logout","end":""}],
    types: placeholder as Registry['session.destroy']['types'],
  },
  'workspace.home': {
    methods: ["GET","HEAD"],
    pattern: '/:workspaceSlug',
    tokens: [{"old":"/:workspaceSlug","type":1,"val":"workspaceSlug","end":""}],
    types: placeholder as Registry['workspace.home']['types'],
  },
  'workspace.settings': {
    methods: ["GET","HEAD"],
    pattern: '/:workspaceSlug/settings',
    tokens: [{"old":"/:workspaceSlug/settings","type":1,"val":"workspaceSlug","end":""},{"old":"/:workspaceSlug/settings","type":0,"val":"settings","end":""}],
    types: placeholder as Registry['workspace.settings']['types'],
  },
  'workspace.settings.section': {
    methods: ["GET","HEAD"],
    pattern: '/:workspaceSlug/settings/:section',
    tokens: [{"old":"/:workspaceSlug/settings/:section","type":1,"val":"workspaceSlug","end":""},{"old":"/:workspaceSlug/settings/:section","type":0,"val":"settings","end":""},{"old":"/:workspaceSlug/settings/:section","type":1,"val":"section","end":""}],
    types: placeholder as Registry['workspace.settings.section']['types'],
  },
  'workspace.settings.preferences.update': {
    methods: ["PATCH"],
    pattern: '/:workspaceSlug/settings/preferences',
    tokens: [{"old":"/:workspaceSlug/settings/preferences","type":1,"val":"workspaceSlug","end":""},{"old":"/:workspaceSlug/settings/preferences","type":0,"val":"settings","end":""},{"old":"/:workspaceSlug/settings/preferences","type":0,"val":"preferences","end":""}],
    types: placeholder as Registry['workspace.settings.preferences.update']['types'],
  },
  'workspace.settings.update': {
    methods: ["PATCH"],
    pattern: '/:workspaceSlug',
    tokens: [{"old":"/:workspaceSlug","type":1,"val":"workspaceSlug","end":""}],
    types: placeholder as Registry['workspace.settings.update']['types'],
  },
  'me.inbox': {
    methods: ["GET","HEAD"],
    pattern: '/:workspaceSlug/me/inbox',
    tokens: [{"old":"/:workspaceSlug/me/inbox","type":1,"val":"workspaceSlug","end":""},{"old":"/:workspaceSlug/me/inbox","type":0,"val":"me","end":""},{"old":"/:workspaceSlug/me/inbox","type":0,"val":"inbox","end":""}],
    types: placeholder as Registry['me.inbox']['types'],
  },
  'me.assigned': {
    methods: ["GET","HEAD"],
    pattern: '/:workspaceSlug/me/assigned',
    tokens: [{"old":"/:workspaceSlug/me/assigned","type":1,"val":"workspaceSlug","end":""},{"old":"/:workspaceSlug/me/assigned","type":0,"val":"me","end":""},{"old":"/:workspaceSlug/me/assigned","type":0,"val":"assigned","end":""}],
    types: placeholder as Registry['me.assigned']['types'],
  },
  'me.dueToday': {
    methods: ["GET","HEAD"],
    pattern: '/:workspaceSlug/me/due-today',
    tokens: [{"old":"/:workspaceSlug/me/due-today","type":1,"val":"workspaceSlug","end":""},{"old":"/:workspaceSlug/me/due-today","type":0,"val":"me","end":""},{"old":"/:workspaceSlug/me/due-today","type":0,"val":"due-today","end":""}],
    types: placeholder as Registry['me.dueToday']['types'],
  },
} as const satisfies Record<string, AdonisEndpoint>

export { routes }

export const registry = {
  routes,
  $tree: {} as ApiDefinition,
}

declare module '@tuyau/core/types' {
  export interface UserRegistry {
    routes: typeof routes
    $tree: ApiDefinition
  }
}
