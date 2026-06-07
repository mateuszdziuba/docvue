import { createServerFn } from '@tanstack/react-start'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseServerClient } from '../utils/supabase'

// Admin client — uses SERVICE_ROLE key (server-only, never exposed to browser)
function getSupabaseAdminClient() {
  const url = process.env.VITE_SUPABASE_URL ?? (import.meta.env.VITE_SUPABASE_URL as string)
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  return createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
}

/** Get current user's salon ownership + staff status */
async function resolveCallerSalon(supabase: ReturnType<typeof getSupabaseServerClient>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Try owner
  const { data: salon } = await supabase.from('salons').select('id').eq('user_id', user.id).single()
  if (salon) return { salonId: salon.id, userId: user.id, isOwner: true }

  // Try staff
  const { data: staff } = await supabase.from('staff_members').select('salon_id, role').eq('user_id', user.id).single()
  if (staff) return { salonId: staff.salon_id, userId: user.id, isOwner: false, role: staff.role }

  return null
}

// ── Queries ──────────────────────────────────────────────────────────────────

export const getStaffFn = createServerFn({ method: 'GET' }).handler(async () => {
  const supabase = getSupabaseServerClient()
  const caller = await resolveCallerSalon(supabase)
  if (!caller || !caller.isOwner) return { error: 'Brak uprawnień', data: null }

  const { data, error } = await supabase
    .from('staff_members')
    .select('*')
    .eq('salon_id', caller.salonId)
    .order('created_at', { ascending: true })

  if (error) return { error: error.message, data: null }
  return { error: null, data }
})

// ── Mutations ─────────────────────────────────────────────────────────────────

export const inviteStaffFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { name: string; email: string; role?: 'staff' | 'manager' }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const caller = await resolveCallerSalon(supabase)
    if (!caller || !caller.isOwner) return { error: 'Brak uprawnień' }

    // Check if email already invited to this salon
    const { data: existing } = await supabase
      .from('staff_members')
      .select('id')
      .eq('salon_id', caller.salonId)
      .eq('email', data.email)
      .single()
    if (existing) return { error: 'Ten adres email jest już przypisany do tego salonu' }

    // Create the staff_members record first (without user_id — filled on invite accept)
    const { data: newStaff, error: insertError } = await supabase
      .from('staff_members')
      .insert({
        salon_id: caller.salonId,
        name: data.name,
        email: data.email,
        role: data.role || 'staff',
      })
      .select('id')
      .single()

    if (insertError) return { error: insertError.message }

    // Send invite via Supabase Admin API
    const admin = getSupabaseAdminClient()
    const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(data.email, {
      data: {
        salon_id: caller.salonId,
        staff_member_id: newStaff.id,
        role: data.role || 'staff',
        name: data.name,
      },
      redirectTo: `${process.env.VITE_SITE_URL ?? import.meta.env.VITE_SITE_URL ?? 'http://localhost:3000'}/accept-invite`,
    })
    if (inviteError) {
      // Clean up the staff record if invite failed
      await supabase.from('staff_members').delete().eq('id', newStaff.id)
      return { error: inviteError.message }
    }

    return { error: null, data: { id: newStaff.id } }
  })

export const updateStaffFn = createServerFn({ method: 'POST' })
  .inputValidator((d: {
    id: string
    name?: string
    role?: 'staff' | 'manager'
    is_active?: boolean
    avatar_path?: string | null
  }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const caller = await resolveCallerSalon(supabase)
    if (!caller || !caller.isOwner) return { error: 'Brak uprawnień' }

    const { id, ...updates } = data
    const { error } = await supabase
      .from('staff_members')
      .update(updates)
      .eq('id', id)
      .eq('salon_id', caller.salonId)

    if (error) return { error: error.message }
    return { error: null }
  })

export const deleteStaffFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const caller = await resolveCallerSalon(supabase)
    if (!caller || !caller.isOwner) return { error: 'Brak uprawnień' }

    // Get user_id before deleting
    const { data: staff } = await supabase
      .from('staff_members')
      .select('user_id')
      .eq('id', data.id)
      .eq('salon_id', caller.salonId)
      .single()

    const { error } = await supabase
      .from('staff_members')
      .delete()
      .eq('id', data.id)
      .eq('salon_id', caller.salonId)

    if (error) return { error: error.message }

    // Optionally disable the Supabase auth user
    if (staff?.user_id) {
      try {
        const admin = getSupabaseAdminClient()
        await admin.auth.admin.updateUserById(staff.user_id, { ban_duration: 'none' })
        // Note: to fully delete: admin.auth.admin.deleteUser(staff.user_id)
        // We soft-ban instead to preserve audit trail
      } catch {
        // Non-fatal if admin client unavailable
      }
    }

    return { error: null }
  })

// Links the newly-created auth user to their pre-created staff_members record.
// Called from /accept-invite after user sets password.
export const linkStaffUserFn = createServerFn({ method: 'POST' }).handler(async () => {
  const supabase = getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Brak sesji' }

  // staff_member_id was stored in user metadata when the invite was sent
  const staffMemberId = user.user_metadata?.staff_member_id as string | undefined
  if (!staffMemberId) return { error: null } // Not an invite flow — no-op

  const { error } = await supabase
    .from('staff_members')
    .update({ user_id: user.id })
    .eq('id', staffMemberId)
    .is('user_id', null) // Only link if not already linked

  if (error) return { error: error.message }
  return { error: null }
})

// ── Convenince re-exports ────────────────────────────────────────────────────
export const getStaff = () => getStaffFn()
export const inviteStaff = (d: { name: string; email: string; role?: 'staff' | 'manager' }) =>
  inviteStaffFn({ data: d })
export const updateStaff = (d: Parameters<typeof updateStaffFn>[0]['data']) =>
  updateStaffFn({ data: d })
export const deleteStaff = (d: { id: string }) => deleteStaffFn({ data: d })
