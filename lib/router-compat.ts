import { useNavigate, useRouter } from '@tanstack/react-router'

export function useRouterCompat() {
  const navigate = useNavigate()
  const router = useRouter()

  return {
    push(to: string) {
      navigate({ to: to as never })
    },
    replace(to: string) {
      navigate({ replace: true, to: to as never })
    },
    refresh() {
      void router.invalidate()
    },
    back() {
      window.history.back()
    },
    invalidate() {
      return router.invalidate()
    },
  }
}
