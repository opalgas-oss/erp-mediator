import 'server-only'
import { createClient } from '@supabase/supabase-js'

// Client Supabase dengan service_role key
// Hanya boleh dipakai di server-side (API routes, Server Components)
// JANGAN import file ini di Client Components
//
// CATATAN: export const db dihapus karena menyebabkan error saat build
// (module dieksekusi sebelum env vars tersedia di Vercel build time)
// Gunakan createServerSupabaseClient() langsung di setiap file yang butuh

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
