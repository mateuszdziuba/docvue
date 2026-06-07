import { createServerFn } from '@tanstack/react-start'
import { redirect } from '@tanstack/react-router'
import { getSupabaseServerClient } from '../utils/supabase'

export const fetchUserFn = createServerFn({ method: 'GET' }).handler(async () => {
  try {
    const supabase = getSupabaseServerClient()
    const { data } = await supabase.auth.getUser()
    if (!data.user?.email) return null
    return { id: data.user.id, email: data.user.email }
  } catch {
    return null
  }
})

export const loginFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { email: string; password: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })
    if (error) return { error: error.message }
    return { success: true }
  })

export const signupFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { email: string; password: string; name: string; phone?: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    })
    if (error) return { error: error.message }
    if (!authData.user) return { error: 'Nie udało się utworzyć konta' }

    // Create salon record for the new user
    const { error: salonError } = await supabase.from('salons').insert({
      user_id: authData.user.id,
      name: data.name,
      phone: data.phone || null,
    })
    if (salonError) return { error: salonError.message }

    return { success: true }
  })

export const logoutFn = createServerFn({ method: 'POST' }).handler(async () => {
  const supabase = getSupabaseServerClient()
  await supabase.auth.signOut()
  throw redirect({ to: '/login' })
})

// Returns the current user's role data — used by _authed.tsx beforeLoad
// so the route file doesn't need to directly import server-only supabase util
export const getUserRoleFn = createServerFn({ method: 'GET' }).handler(async () => {
  const supabase = getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: salon } = await supabase
    .from('salons')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (salon) return { isOwner: true, staffRole: null as null }

  const { data: staffRecord } = await supabase
    .from('staff_members')
    .select('role, is_active')
    .eq('user_id', user.id)
    .single()

  if (!staffRecord || !staffRecord.is_active) return null
  return { isOwner: false, staffRole: staffRecord.role as 'staff' | 'manager' }
})

export const changePasswordFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { password: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { error: 'Nie jesteś zalogowany' }
    const { error } = await supabase.auth.updateUser({ password: data.password })
    if (error) return { error: error.message }
    return { success: true }
  })

// Returns client + user data for the client portal layout
export const getClientUserFn = createServerFn({ method: 'GET' }).handler(async () => {
  const supabase = getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { client: null, user: null }
  const { data: client } = await supabase
    .from('clients')
    .select('id, name')
    .eq('user_id', user.id)
    .single()
  return { client, user: { id: user.id, email: user.email } }
})

export const registerClientUserFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { email: string; password: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()

    // Check if client exists in system
    const { data: existingClient, error: clientError } = await supabase
      .from('clients')
      .select('id, user_id')
      .eq('email', data.email)
      .maybeSingle()

    if (clientError) return { error: 'Wystąpił błąd. Spróbuj ponownie.' }
    if (!existingClient) {
      return { error: 'Nie znaleziono profilu klienta z tym adresem email. Skontaktuj się z gabinetem.' }
    }
    if (existingClient.user_id) {
      return { error: 'Konto z tym adresem email już istnieje. Zaloguj się.' }
    }

    // Create auth user
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    })
    if (signUpError) return { error: signUpError.message }
    if (!authData.user) return { error: 'Nie udało się utworzyć konta.' }

    // Link client record to auth user
    const { error: linkError } = await supabase
      .from('clients')
      .update({ user_id: authData.user.id })
      .eq('id', existingClient.id)

    if (linkError) return { error: linkError.message }

    return { success: true }
  })
