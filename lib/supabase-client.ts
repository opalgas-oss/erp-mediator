import { createBrowserClient } from '@supabase/ssr'

// Client Supabase untuk browser
// Hanya pakai anon key — tidak boleh pakai service_role key
export function createBrowserSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}