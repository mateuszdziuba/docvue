import { createFileRoute, notFound, redirect } from '@tanstack/react-router'
import { getFormFn } from '@/src/server/forms'
import EditFormClient from '@/components/admin/edit-form-client'
import type { FormField } from '@/types/database'

export const Route = createFileRoute('/_authed/dashboard/forms/$formId/edit')({
  beforeLoad: ({ context }) => {
    if (!(context as { isOwner?: boolean }).isOwner) {
      throw redirect({ to: '/dashboard/forms' })
    }
  },
  loader: async ({ params }) => {
    const result = await getFormFn({ data: { id: params.formId } })
    if (result.error || !result.form) throw notFound()
    return { form: result.form }
  },
  component: EditFormPage,
})

function EditFormPage() {
  const { form } = Route.useLoaderData()
  return (
    <EditFormClient
      form={{
        ...form,
        description: form.description ?? null,
        schema: ((form.schema as { fields: FormField[] }) ?? { fields: [] }),
      }}
    />
  )
}
