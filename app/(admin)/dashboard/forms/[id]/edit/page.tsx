import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import EditFormClient from '@/components/admin/edit-form-client'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditFormPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data: salon } = await supabase
    .from('salons')
    .select('id')
    .eq('user_id', user?.id)
    .single()

  // Get form
  const { data: form, error } = await supabase
    .from('forms')
    .select('*')
    .eq('id', id)
    .eq('salon_id', salon?.id)
    .single()

  if (error || !form) {
    notFound()
  }

  return <EditFormClient form={form} />
}
