import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'new_account.create': { paramsTuple?: []; params?: {} }
    'new_account.store': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'session.store': { paramsTuple?: []; params?: {} }
    'onboarding.show': { paramsTuple?: []; params?: {} }
    'onboarding.store': { paramsTuple?: []; params?: {} }
    'session.destroy': { paramsTuple?: []; params?: {} }
    'workspace.home': { paramsTuple: [ParamValue]; params: {'workspaceSlug': ParamValue} }
    'workspace.settings': { paramsTuple: [ParamValue]; params: {'workspaceSlug': ParamValue} }
    'workspace.settings.section': { paramsTuple: [ParamValue,ParamValue]; params: {'workspaceSlug': ParamValue,'section': ParamValue} }
    'workspace.settings.preferences.update': { paramsTuple: [ParamValue]; params: {'workspaceSlug': ParamValue} }
    'workspace.settings.update': { paramsTuple: [ParamValue]; params: {'workspaceSlug': ParamValue} }
    'me.inbox': { paramsTuple: [ParamValue]; params: {'workspaceSlug': ParamValue} }
    'me.assigned': { paramsTuple: [ParamValue]; params: {'workspaceSlug': ParamValue} }
    'me.dueToday': { paramsTuple: [ParamValue]; params: {'workspaceSlug': ParamValue} }
  }
  GET: {
    'new_account.create': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'onboarding.show': { paramsTuple?: []; params?: {} }
    'workspace.home': { paramsTuple: [ParamValue]; params: {'workspaceSlug': ParamValue} }
    'workspace.settings': { paramsTuple: [ParamValue]; params: {'workspaceSlug': ParamValue} }
    'workspace.settings.section': { paramsTuple: [ParamValue,ParamValue]; params: {'workspaceSlug': ParamValue,'section': ParamValue} }
    'me.inbox': { paramsTuple: [ParamValue]; params: {'workspaceSlug': ParamValue} }
    'me.assigned': { paramsTuple: [ParamValue]; params: {'workspaceSlug': ParamValue} }
    'me.dueToday': { paramsTuple: [ParamValue]; params: {'workspaceSlug': ParamValue} }
  }
  HEAD: {
    'new_account.create': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'onboarding.show': { paramsTuple?: []; params?: {} }
    'workspace.home': { paramsTuple: [ParamValue]; params: {'workspaceSlug': ParamValue} }
    'workspace.settings': { paramsTuple: [ParamValue]; params: {'workspaceSlug': ParamValue} }
    'workspace.settings.section': { paramsTuple: [ParamValue,ParamValue]; params: {'workspaceSlug': ParamValue,'section': ParamValue} }
    'me.inbox': { paramsTuple: [ParamValue]; params: {'workspaceSlug': ParamValue} }
    'me.assigned': { paramsTuple: [ParamValue]; params: {'workspaceSlug': ParamValue} }
    'me.dueToday': { paramsTuple: [ParamValue]; params: {'workspaceSlug': ParamValue} }
  }
  POST: {
    'new_account.store': { paramsTuple?: []; params?: {} }
    'session.store': { paramsTuple?: []; params?: {} }
    'onboarding.store': { paramsTuple?: []; params?: {} }
    'session.destroy': { paramsTuple?: []; params?: {} }
  }
  PATCH: {
    'workspace.settings.preferences.update': { paramsTuple: [ParamValue]; params: {'workspaceSlug': ParamValue} }
    'workspace.settings.update': { paramsTuple: [ParamValue]; params: {'workspaceSlug': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}