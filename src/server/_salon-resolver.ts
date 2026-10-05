import type { getSupabaseServerClient } from '../utils/supabase'

export type CallerInfo = {
  salonId: string
  userId: string
  isOwner: boolean
}

/**
 * Resolves the salon context for any authenticated caller — either an owner or a staff member.
 * Use this instead of local getSalonId() helpers in every server function.
 *
 * Returns { salonId, userId, isOwner } or null if not authenticated / not associated with a salon.
 */
export async function getCallerSalonId(
  supabase: ReturnType<typeof getSupabaseServerClient>,
): Promise<CallerInfo | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  // Owner path
  const { data: salon } = await supabase.from('salons').select('id').eq('user_id', user.id).single()
  if (salon) return { salonId: salon.id, userId: user.id, isOwner: true }

  // Staff path
  const { data: staffRecord } = await supabase
    .from('staff_members')
    .select('salon_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()
  if (staffRecord) return { salonId: staffRecord.salon_id, userId: user.id, isOwner: false }

  return null
}
