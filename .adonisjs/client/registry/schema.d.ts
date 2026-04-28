/* eslint-disable prettier/prettier */
/// <reference path="../manifest.d.ts" />

import type { ExtractBody, ExtractErrorResponse, ExtractQuery, ExtractQueryForGet, ExtractResponse } from '@tuyau/core/types'
import type { InferInput, SimpleError } from '@vinejs/vine/types'

export type ParamValue = string | number | bigint | boolean

export interface Registry {
  'new_account.create': {
    methods: ["GET","HEAD"]
    pattern: '/signup'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/new_account_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/new_account_controller').default['create']>>>
    }
  }
  'new_account.store': {
    methods: ["POST"]
    pattern: '/signup'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').signupValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').signupValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/new_account_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/new_account_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'session.create': {
    methods: ["GET","HEAD"]
    pattern: '/login'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/session_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/session_controller').default['create']>>>
    }
  }
  'session.store': {
    methods: ["POST"]
    pattern: '/login'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/session_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/session_controller').default['store']>>>
    }
  }
  'onboarding.show': {
    methods: ["GET","HEAD"]
    pattern: '/onboarding'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/onboarding_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/onboarding_controller').default['show']>>>
    }
  }
  'onboarding.store': {
    methods: ["POST"]
    pattern: '/onboarding'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/onboarding').onboardingValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/onboarding').onboardingValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/onboarding_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/onboarding_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'session.destroy': {
    methods: ["POST"]
    pattern: '/logout'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/session_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/session_controller').default['destroy']>>>
    }
  }
  'workspace.home': {
    methods: ["GET","HEAD"]
    pattern: '/:workspaceSlug'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { workspaceSlug: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/workspace_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/workspace_controller').default['show']>>>
    }
  }
  'workspace.settings': {
    methods: ["GET","HEAD"]
    pattern: '/:workspaceSlug/settings'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { workspaceSlug: ParamValue }
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'workspace.settings.section': {
    methods: ["GET","HEAD"]
    pattern: '/:workspaceSlug/settings/:section'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { workspaceSlug: ParamValue; section: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/settings_controller').default['showSection']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/settings_controller').default['showSection']>>>
    }
  }
  'workspace.settings.preferences.update': {
    methods: ["PATCH"]
    pattern: '/:workspaceSlug/settings/preferences'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/preferences').preferencesValidator)>>
      paramsTuple: [ParamValue]
      params: { workspaceSlug: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/preferences').preferencesValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/settings_controller').default['updatePreferences']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/settings_controller').default['updatePreferences']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'workspace.settings.update': {
    methods: ["PATCH"]
    pattern: '/:workspaceSlug'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { workspaceSlug: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/workspace_controller').default['updateSettings']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/workspace_controller').default['updateSettings']>>>
    }
  }
  'me.inbox': {
    methods: ["GET","HEAD"]
    pattern: '/:workspaceSlug/me/inbox'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { workspaceSlug: ParamValue }
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'me.assigned': {
    methods: ["GET","HEAD"]
    pattern: '/:workspaceSlug/me/assigned'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { workspaceSlug: ParamValue }
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'me.dueToday': {
    methods: ["GET","HEAD"]
    pattern: '/:workspaceSlug/me/due-today'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { workspaceSlug: ParamValue }
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
}
