/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  newAccount: {
    create: typeof routes['new_account.create']
    store: typeof routes['new_account.store']
  }
  session: {
    create: typeof routes['session.create']
    store: typeof routes['session.store']
    destroy: typeof routes['session.destroy']
  }
  onboarding: {
    show: typeof routes['onboarding.show']
    store: typeof routes['onboarding.store']
  }
  workspace: {
    home: typeof routes['workspace.home']
    settings: typeof routes['workspace.settings'] & {
      section: typeof routes['workspace.settings.section']
      preferences: {
        update: typeof routes['workspace.settings.preferences.update']
      }
      update: typeof routes['workspace.settings.update']
    }
  }
  me: {
    inbox: typeof routes['me.inbox']
    assigned: typeof routes['me.assigned']
    dueToday: typeof routes['me.dueToday']
  }
}
