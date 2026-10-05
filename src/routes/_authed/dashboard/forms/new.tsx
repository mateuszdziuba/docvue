import { createFileRoute, redirect } from '@tanstack/react-router'
import { FormBuilder } from '@/components/admin/form-builder'

export const Route = createFileRoute('/_authed/dashboard/forms/new')({
  beforeLoad: ({ context }) => {
    if (!(context as { isOwner?: boolean }).isOwner) {
      throw redirect({ to: '/dashboard/forms' })
    }
  },
  component: NewFormPage,
})

function NewFormPage() {
  return (
    <div className="mx-auto max-w-3xl p-6">
      <FormBuilder mode="create" />
    </div>
  )
}
