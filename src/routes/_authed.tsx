import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { getUserRoleFn } from '../server/auth'

export const Route = createFileRoute('/_authed')({
  beforeLoad: async ({ context }) => {
    if (!context.user) {
      throw redirect({ to: '/login' })
    }

    const roleData = await getUserRoleFn()
    if (!roleData) {
      throw redirect({ to: '/login' })
    }

    return { isOwner: roleData.isOwner, staffRole: roleData.staffRole }
  },
  component: () => <Outlet />,
})
