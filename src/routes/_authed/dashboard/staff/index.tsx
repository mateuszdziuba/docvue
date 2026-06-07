import { createFileRoute, redirect } from '@tanstack/react-router'
import { getStaffFn } from '@/src/server/staff'
import { StaffPageClient } from '@/components/admin/staff-page-client'

export const Route = createFileRoute('/_authed/dashboard/staff/')({
  beforeLoad: async ({ context }) => {
    if (!(context as { isOwner?: boolean }).isOwner) {
      throw redirect({ to: '/dashboard' })
    }
  },
  loader: async () => {
    const result = await getStaffFn()
    return result
  },
  component: StaffPage,
})

function StaffPage() {
  const data = Route.useLoaderData()
  const staff = data?.data ?? []

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-normal text-on-surface tracking-tight">Pracownicy</h1>
        <p className="text-on-surface-variant text-sm mt-1">
          Zarządzaj dostępem pracowników do systemu
        </p>
      </div>

      <StaffPageClient staff={staff} />
    </div>
  )
}
