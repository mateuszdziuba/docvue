import { createFileRoute } from '@tanstack/react-router'
import { logoutFn } from '../server/auth'
import { useEffect } from 'react'
import { useRouter } from '@tanstack/react-router'

export const Route = createFileRoute('/logout')({
  component: LogoutPage,
})

function LogoutPage() {
  const router = useRouter()

  useEffect(() => {
    logoutFn().catch(() => {
      router.navigate({ to: '/login' })
    })
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-muted-foreground text-sm">Wylogowywanie…</p>
    </div>
  )
}
