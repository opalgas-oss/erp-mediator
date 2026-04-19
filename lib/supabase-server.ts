import 'server-only'
import { createClient } from '@supabase/supabase-js'

// Client Supabase dengan service_role key
// Hanya boleh dipakai di server-side (API routes, Server Components)
// JANGAN import file ini di Client Components
export function createServerSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

// Shorthand — dipakai di semua lib files
export const db = createServerSupabaseClient()