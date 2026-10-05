import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '../utils/supabase'
import { getVerifiedUser } from './_auth'

export const updateSalonSettingsFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: {
      pin_code?: string
      name?: string
      phone?: string
      address?: string
      email?: string
      website?: string
      social_media?: string
      city?: string
    }) => d,
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const user = await getVerifiedUser(supabase)
    if (!user) return { error: 'Nie jesteś zalogowany' }

    const payload = {
      pin_code: data.pin_code || null,
      ...(data.name && { name: data.name }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.address !== undefined && { address: data.address }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.website !== undefined && { website: data.website }),
      ...(data.social_media !== undefined && { social_media: data.social_media }),
      ...(data.city !== undefined && { city: data.city }),
    }

    let { error } = await supabase.from('salons').update(payload).eq('user_id', user.id)

    // Zanim migracja z kolumnami kontaktowymi zostanie zastosowana, zapisz
    // przynajmniej pola podstawowe (żeby formularz Ustawień działał).
    if (
      error &&
      /column .*(email|website|social_media|city).* does not exist/i.test(error.message)
    ) {
      const fallback = await supabase
        .from('salons')
        .update({
          pin_code: data.pin_code || null,
          ...(data.name && { name: data.name }),
          ...(data.phone !== undefined && { phone: data.phone }),
          ...(data.address !== undefined && { address: data.address }),
        })
        .eq('user_id', user.id)
      error = fallback.error
    }

    if (error) return { error: error.message }
    return { success: true }
  })

export const getSalonFn = createServerFn({ method: 'GET' }).handler(async () => {
  const supabase = getSupabaseServerClient()
  const user = await getVerifiedUser(supabase)
  if (!user) return null

  // Owner path — jedno zapytanie
  const { data: salon } = await supabase
    .from('salons')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()
  if (salon) return salon

  // Staff path — salon przez staff_members
  const { data: staffRecord } = await supabase
    .from('staff_members')
    .select('salon_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()
  if (!staffRecord) return null

  const { data: staffSalon } = await supabase
    .from('salons')
    .select('*')
    .eq('id', staffRecord.salon_id)
    .maybeSingle()
  return staffSalon ?? null
})

// Legacy aliases
export const updateSalonSettings = (data: {
  pin_code?: string
  name?: string
  phone?: string
  address?: string
}) => updateSalonSettingsFn({ data })
