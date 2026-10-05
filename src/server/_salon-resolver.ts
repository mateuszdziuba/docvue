import type { getSupabaseServerClient } from '../utils/supabase'
import { getVerifiedUser } from './_auth'

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
  const user = await getVerifiedUser(supabase)
  if (!user) return null

  // Równoległe zapytania — owner i staff sprawdzani w jednym round-tripie.
  const [salonRes, staffRes] = await Promise.all([
    supabase.from('salons').select('id').eq('user_id', user.id).maybeSingle(),
    supabase
      .from('staff_members')
      .select('salon_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle(),
  ])

  if (salonRes.data) return { salonId: salonRes.data.id, userId: user.id, isOwner: true }
  if (staffRes.data) return { salonId: staffRes.data.salon_id, userId: user.id, isOwner: false }

  return null
}
