import { createFileRoute, redirect } from '@tanstack/react-router'
import { getSalonFn } from '@/src/server/settings'
import { fetchUserFn } from '@/src/server/auth'
import { SettingsPage } from '@/components/admin/settings-page'

export const Route = createFileRoute('/_authed/dashboard/settings/')({
  beforeLoad: async ({ context }) => {
    if (!(context as { isOwner?: boolean }).isOwner) {
      throw redirect({ to: '/dashboard' })
    }
  },
  loader: async () => {
    const [salon, user] = await Promise.all([getSalonFn(), fetchUserFn()])
    return { salon, user }
  },
  component: SettingsRoute,
})

function SettingsRoute() {
  const { salon, user } = Route.useLoaderData()
  return <SettingsPage salon={salon} user={user} />
}
