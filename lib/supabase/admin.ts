import { createClient } from '@supabase/supabase-js'

function resolveSupabaseUrl(): string {
  return (
    process.env.VITE_SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.SUPABASE_URL ??
    (import.meta.env.VITE_SUPABASE_URL as string) ??
    ''
  )
}

export async function createAdminClient() {
  const supabaseUrl = resolveSupabaseUrl()
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Supabase admin client misconfigured: missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY',
    )
  }
  return createClient(supabaseUrl, supabaseServiceKey)
}
