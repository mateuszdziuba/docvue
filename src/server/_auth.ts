import type { getSupabaseServerClient } from '../utils/supabase'

export type VerifiedUser = {
  id: string
  email: string | null
}

type ServerSupabase = ReturnType<typeof getSupabaseServerClient>

/**
 * Weryfikuje użytkownika bez zbędnego round-tripu do Supabase Auth:
 * - brak sesji → null (getSession czyta cookies lokalnie),
 * - projekt z asymetrycznym kluczem JWT → weryfikacja lokalna (getClaims),
 * - klucz symetryczny → getClaims robi fallback do getUser (jak dotychczas).
 */
export async function getVerifiedUser(supabase: ServerSupabase): Promise<VerifiedUser | null> {
  try {
    const { data, error } = await supabase.auth.getClaims()
    if (error || !data?.claims) return null
    const claims = data.claims as { sub?: string; email?: string }
    if (!claims.sub) return null
    return { id: claims.sub, email: claims.email ?? null }
  } catch {
    const { data } = await supabase.auth.getUser()
    return data.user ? { id: data.user.id, email: data.user.email ?? null } : null
  }
}
