import { redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { consumeRateLimit, rateLimitError, requestIp } from '@/lib/rate-limit'
import { getSupabaseServerClient } from '../utils/supabase'
import { resolveSiteUrl } from './_site-url'

const MIN_PASSWORD_LENGTH = 8

function passwordError(password: string): string | null {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return `Hasło musi mieć co najmniej ${MIN_PASSWORD_LENGTH} znaków`
  }
  return null
}

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
    const limit = consumeRateLimit(`login:${requestIp()}:${data.email}`, 10, 5 * 60_000)
    if (!limit.ok) return { error: rateLimitError(limit).error }

    const supabase = getSupabaseServerClient()
    const { data: signIn, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })
    if (error) return { error: error.message }

    // Jedno dodatkowe zapytanie zamiast osobnego round-tripu z klienta:
    // od razu wiemy, czy kierować do portalu klienta.
    let isClient = false
    if (signIn.user) {
      const { data: clientRow } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', signIn.user.id)
        .limit(1)
        .maybeSingle()
      isClient = Boolean(clientRow)
    }
    return { success: true, isClient }
  })

export const signupFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { email: string; password: string; name: string; phone?: string }) => d)
  .handler(async ({ data }) => {
    const limit = consumeRateLimit(`signup:${requestIp()}`, 10, 60 * 60_000)
    if (!limit.ok) return { error: rateLimitError(limit).error }

    const pwdError = passwordError(data.password)
    if (pwdError) return { error: pwdError }

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
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: salon } = await supabase.from('salons').select('id').eq('user_id', user.id).single()

  if (salon) return { isOwner: true, staffRole: null as null }

  const { data: staffRecord } = await supabase
    .from('staff_members')
    .select('role, is_active')
    .eq('user_id', user.id)
    .single()

  if (!staffRecord?.is_active) return null
  return { isOwner: false, staffRole: staffRecord.role as 'staff' | 'manager' }
})

export const requestPasswordResetFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { email: string }) => d)
  .handler(async ({ data }) => {
    const limit = consumeRateLimit(`reset:${requestIp()}`, 5, 60 * 60_000)
    if (!limit.ok) return { error: rateLimitError(limit).error }

    const email = data.email?.trim()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { error: 'Podaj poprawny adres email' }
    }

    const supabase = getSupabaseServerClient()
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${resolveSiteUrl()}/update-password`,
    })

    // Zawsze sukces — nie ujawniamy, czy konto istnieje.
    return { success: true }
  })

export const exchangeRecoveryCodeFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { code: string }) => d)
  .handler(async ({ data }) => {
    if (!data.code || data.code.length > 512) {
      return { error: 'Link do resetu hasła jest nieprawidłowy' }
    }
    const supabase = getSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(data.code)
    if (error) return { error: 'Link do resetu hasła jest nieprawidłowy lub wygasł' }
    return { success: true }
  })

export const changePasswordFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { password: string }) => d)
  .handler(async ({ data }) => {
    const pwdError = passwordError(data.password)
    if (pwdError) return { error: pwdError }

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
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { client: null, user: null }
  const { data: client } = await supabase
    .from('clients')
    .select('id, name')
    .eq('user_id', user.id)
    .single()
  return { client, user: { id: user.id, email: user.email } }
})

export const registerClientUserFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { email: string; password: string; name: string }) => d)
  .handler(async ({ data }) => {
    const limit = consumeRateLimit(`register-client:${requestIp()}`, 10, 60 * 60_000)
    if (!limit.ok) return { error: rateLimitError(limit).error }

    const pwdError = passwordError(data.password)
    if (pwdError) return { error: pwdError }

    const supabase = getSupabaseServerClient()

    // Check if email already taken
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id')
      .eq('email', data.email)
      .maybeSingle()
    if (existingClient) {
      return { error: 'Konto z tym adresem email już istnieje. Zaloguj się.' }
    }

    // Create auth user
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    })
    if (signUpError) return { error: signUpError.message }
    if (!authData.user) return { error: 'Nie udało się utworzyć konta.' }

    // Create client record (without salon assignment)
    const { error: insertError } = await supabase.from('clients').insert({
      salon_id: null,
      name: data.name,
      email: data.email,
      phone: '',
      user_id: authData.user.id,
    })
    if (insertError) return { error: insertError.message }

    return { success: true }
  })
