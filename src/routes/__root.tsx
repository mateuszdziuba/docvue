import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { Toaster } from 'sonner'
import { fetchUserFn } from '../server/auth'
import { ThemeProvider } from '@/lib/theme-compat'
import appCss from '../styles/app.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'docvue – formularze dla salonów beauty' },
      {
        name: 'description',
        content:
          'Twórz formularze zgody i ankiety dla swojego salonu kosmetycznego. Klienci wypełniają online, Ty zarządzasz z dashboardu.',
      },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/favicon.ico' },
    ],
  }),
  beforeLoad: async () => {
    try {
      const user = await fetchUserFn()
      return { user }
    } catch {
      return { user: null }
    }
  },
  component: RootComponent,
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-serif text-foreground mb-2">404</h1>
        <p className="text-muted-foreground">Strona nie istnieje</p>
      </div>
    </div>
  ),
})

function RootComponent() {
  return (
    <html lang="pl">
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider defaultTheme="system" storageKey="docvue-theme">
          <Outlet />
          <Toaster richColors position="top-right" />
        </ThemeProvider>
        {import.meta.env.DEV && <TanStackRouterDevtools />}
        <Scripts />
      </body>
    </html>
  )
}
