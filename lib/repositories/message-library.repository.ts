// lib/repositories/message-library.repository.ts
// Repository untuk tabel message_library — akses DB langsung.
//
// Fungsi di sini dibagi dua kategori:
//   1. getAllForAdmin() — ambil semua pesan tanpa cache, untuk CRUD SuperAdmin
//   2. Fungsi cache-based ada di lib/message-library.ts (untuk konsumsi app-wide)
//
// Dibuat: Sesi #101 — DRY fix Langkah C
//   Sebelumnya: RSC page.tsx dan API route GET query DB langsung tanpa service/repo layer.
//   Arsitektur yang benar: Route → Service → Repository → DB.

import 'server-only'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { MessageItem }           from '@/lib/message-library'

/**
 * Ambil semua pesan dari message_library — semua kolom, tanpa cache.
 * Dipakai oleh SuperAdmin CRUD — bukan untuk konsumsi app-wide (gunakan getMessage/getMessagesByKategori).
 *
 * @returns Array MessageItem diurutkan: kategori ASC, key ASC
 * @throws Error jika query DB gagal
 */
export async function messageLibraryRepo_getAllForAdmin(): Promise<MessageItem[]> {
  const db = createServerSupabaseClient()

  const { data, error } = await db
    .from('message_library')
    .select('id, key, kategori, channel, teks, variabel, keterangan, is_active, updated_at, updated_by')
    .order('kategori', { ascending: true })
    .order('key',      { ascending: true })

  if (error) {
    throw new Error(`[message-library.repository] getAllForAdmin: ${error.message}`)
  }

  return (data ?? []) as MessageItem[]
}
