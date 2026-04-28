import '@adonisjs/inertia/types'

import type React from 'react'
import type { Prettify } from '@adonisjs/core/types/common'

type ExtractProps<T> =
  T extends React.FC<infer Props>
    ? Prettify<Omit<Props, 'children'>>
    : T extends React.Component<infer Props>
      ? Prettify<Omit<Props, 'children'>>
      : never

declare module '@adonisjs/inertia/types' {
  export interface InertiaPages {
    'apps/view': ExtractProps<(typeof import('../../inertia/pages/apps/view.tsx'))['default']>
    'auth/login': ExtractProps<(typeof import('../../inertia/pages/auth/login.tsx'))['default']>
    'auth/onboarding': ExtractProps<(typeof import('../../inertia/pages/auth/onboarding.tsx'))['default']>
    'auth/signup': ExtractProps<(typeof import('../../inertia/pages/auth/signup.tsx'))['default']>
    'errors/not_found': ExtractProps<(typeof import('../../inertia/pages/errors/not_found.tsx'))['default']>
    'errors/server_error': ExtractProps<(typeof import('../../inertia/pages/errors/server_error.tsx'))['default']>
    'home': ExtractProps<(typeof import('../../inertia/pages/home.tsx'))['default']>
    'me/assigned': ExtractProps<(typeof import('../../inertia/pages/me/assigned.tsx'))['default']>
    'me/due_today': ExtractProps<(typeof import('../../inertia/pages/me/due_today.tsx'))['default']>
    'me/inbox': ExtractProps<(typeof import('../../inertia/pages/me/inbox.tsx'))['default']>
    'settings/section': ExtractProps<(typeof import('../../inertia/pages/settings/section.tsx'))['default']>
  }
}
