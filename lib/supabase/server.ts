import { getSupabaseServerClient } from '@/src/utils/supabase'

export async function createClient() {
  return getSupabaseServerClient()
}
