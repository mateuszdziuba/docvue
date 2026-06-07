import { createClient } from '@supabase/supabase-js'

export async function createAdminClient() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  return createClient(supabaseUrl, supabaseServiceKey)
}
