import { createFileRoute, notFound, redirect } from '@tanstack/react-router'
import { FormBuilder } from '@/components/admin/form-builder'
import { checkFormUsageFn } from '@/src/server/form-usage'
import { getFormFn } from '@/src/server/forms'
import { getSalonFn } from '@/src/server/settings'
import type { FormField } from '@/types/database'

export const Route = createFileRoute('/_authed/dashboard/forms/$formId/edit')({
  beforeLoad: ({ context }) => {
    if (!(context as { isOwner?: boolean }).isOwner) {
      throw redirect({ to: '/dashboard/forms' })
    }
  },
  loader: async ({ params }) => {
    const [result, usage, salon] = await Promise.all([
      getFormFn({ data: { id: params.formId } }),
      checkFormUsageFn({ data: { formId: params.formId } }),
      getSalonFn(),
    ])
    if (result.error || !result.form) throw notFound()
    return {
      form: result.form,
      usageCount: usage.count ?? 0,
      isLocked: usage.isUsed ?? false,
      salon,
    }
  },
  component: EditFormPage,
})

function EditFormPage() {
  const { form, usageCount, isLocked, salon } = Route.useLoaderData()
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
        salon={salon}
      />
    </div>
  )
}
