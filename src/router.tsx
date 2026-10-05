import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  const router = createRouter({
    routeTree,
    scrollRestoration: true,
    // Preload przy hover/touch + świeżość danych ogranicza miganie i skraca nawigację.
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 30_000,
    defaultStaleTime: 30_000,
    defaultPendingMs: 150,
    defaultPendingMinMs: 400,
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
