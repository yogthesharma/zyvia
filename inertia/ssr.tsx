import { client } from '~/client'
import { ReactElement } from 'react'
import Layout from '~/layouts/default'
import { ThemeProvider } from '~/components/theme-provider'
import { Data } from '@generated/data'
import ReactDOMServer from 'react-dom/server'
import { createInertiaApp } from '@inertiajs/react'
import { TuyauProvider } from '@adonisjs/inertia/react'
import { resolvePageComponent } from '@adonisjs/inertia/helpers'

export default function render(page: any) {
  return createInertiaApp({
    page,
    render: ReactDOMServer.renderToString,
    resolve: (name) => {
      const shouldUseLayout = !name.startsWith('auth/')

      return resolvePageComponent(
        `./pages/${name}.tsx`,
        import.meta.glob('./pages/**/*.tsx', { eager: true }),
        (page: ReactElement<Data.SharedProps>) =>
          shouldUseLayout ? <Layout children={page} /> : page
      )
    },
    setup: ({ App, props }) => {
      return (
        <TuyauProvider client={client}>
          <ThemeProvider>
            <App {...props} />
          </ThemeProvider>
        </TuyauProvider>
      )
    },
  })
}
