import { createFileRoute, notFound, redirect } from '@tanstack/react-router'
import { FormBuilder } from '@/components/admin/form-builder'
import { checkFormUsageFn } from '@/src/server/form-usage'
import { getFormFn } from '@/src/server/forms'
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
    const usage = await checkFormUsageFn({ data: { formId: params.formId } })
    return {
      form: result.form,
      usageCount: usage.count ?? 0,
      isLocked: usage.isUsed ?? false,
    }
  },
  component: EditFormPage,
})

function EditFormPage() {
  const { form, usageCount, isLocked } = Route.useLoaderData()
  const schema = (form.schema as { fields: FormField[] } | null) ?? { fields: [] }
  return (
    <div className="mx-auto max-w-3xl p-6">
      <FormBuilder
        mode="edit"
        formId={form.id}
        initialTitle={form.title}
        initialDescription={form.description ?? ''}
        initialSchema={schema.fields ?? []}
        isLocked={isLocked}
        usageCount={usageCount}
      />
    </div>
  )
}
