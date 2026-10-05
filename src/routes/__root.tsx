import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { useEffect } from 'react'
import { Toaster } from 'sonner'
import { ThemeProvider } from '@/lib/theme-compat'
import { registerPwa } from '@/src/lib/pwa'
import { fetchUserFn } from '../server/auth'
import appCss from '../styles/app.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, viewport-fit=cover',
      },
      { title: 'docvue – formularze dla salonów beauty' },
      {
        name: 'description',
        content:
          'Twórz formularze zgody i ankiety dla swojego salonu kosmetycznego. Klienci wypełniają online, Ty zarządzasz z dashboardu.',
      },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
      { name: 'apple-mobile-web-app-title', content: 'docvue' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/favicon.ico', sizes: '32x32' },
      { rel: 'icon', href: '/icons/icon-32.png', type: 'image/png', sizes: '32x32' },
      { rel: 'icon', href: '/icons/icon-192.png', type: 'image/png', sizes: '192x192' },
      { rel: 'apple-touch-icon', href: '/icons/apple-touch-icon.png', sizes: '180x180' },
      { rel: 'manifest', href: '/manifest.webmanifest' },
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
  useEffect(() => {
    registerPwa()
  }, [])

  return (
    <html lang="pl">
      <head>
        <HeadContent />
        <meta name="theme-color" content="#fcf9f8" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#1a1817" media="(prefers-color-scheme: dark)" />
      </head>
      <body>
        <ThemeProvider defaultTheme="system" storageKey="docvue-theme">
          <Outlet />
          <Toaster
            richColors
            position="top-right"
            mobileOffset={{ top: 'calc(3.5rem + env(safe-area-inset-top) + 8px)' }}
          />
        </ThemeProvider>
        {import.meta.env.DEV && <TanStackRouterDevtools />}
        <Scripts />
      </body>
    </html>
  )
}
