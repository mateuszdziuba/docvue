import { createFileRoute, redirect } from '@tanstack/react-router'
import { FormBuilder } from '@/components/admin/form-builder'
import { getSalonFn } from '@/src/server/settings'

export const Route = createFileRoute('/_authed/dashboard/forms/new')({
  beforeLoad: ({ context }) => {
    if (!(context as { isOwner?: boolean }).isOwner) {
      throw redirect({ to: '/dashboard/forms' })
    }
  },
  loader: async () => {
    const salon = await getSalonFn()
    return { salon }
  },
  component: NewFormPage,
})

function NewFormPage() {
  const { salon } = Route.useLoaderData()
  return (
    <div className="mx-auto max-w-3xl p-6">
      <FormBuilder mode="create" salon={salon} />
    </div>
  )
}
