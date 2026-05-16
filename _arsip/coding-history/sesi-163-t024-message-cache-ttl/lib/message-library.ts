// lib/message-library.ts
// Library server-side untuk membaca pesan dari tabel message_library di PostgreSQL.
// Dipakai dari:
//   - app/api/message-library/route.ts  → expose ke client via HTTP
//   - lib/account-lock.ts               → template WA notifikasi
//   - lib lain yang butuh pesan dinamis dari DB
//
// Untuk client component (login/page.tsx), gunakan API route — jangan import file ini.

import 'server-only'
import { unstable_cache } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// ─── Tipe Data ────────────────────────────────────────────────────────────────

export interface MessageItem {
  id:         string
  key:        string
  kategori:   string
  channel:    string
  teks:       string
  variabel:   string[]
  keterangan: string | null
  is_active:  boolean
  updated_at: string
}

// ─── FUNGSI 1: getMessagesByKategori ─────────────────────────────────────────
// Ambil semua pesan dalam satu atau beberapa kategori.
// Mengembalikan map { key: teks } untuk lookup cepat.

export async function getMessagesByKategori(
  kategori: string | string[]
): Promise<Record<string, string>> {
  const list = Array.isArray(kategori) ? kategori : [kategori]
  const cacheKey = list.slice().sort().join(',')

  const cached = unstable_cache(
    async () => {
      const db = createServerSupabaseClient()

      const { data, error } = await db
        .from('message_library')
        .select('key, teks')
        .in('kategori', list)
        .eq('is_active', true)

      if (error) throw new Error(`getMessagesByKategori gagal: ${error.message}`)

      const map: Record<string, string> = {}
      for (const row of data ?? []) {
        map[row.key] = row.teks
      }
      return map
    },
    [`messages:kategori:${cacheKey}`],
    {
      revalidate: 15 * 60,
      tags: ['messages', ...list.map(k => `messages:${k}`)],
    }
  )

  return cached()
}

// ─── FUNGSI 2: getMessage ─────────────────────────────────────────────────────
// Ambil satu pesan berdasarkan key.
// Jika key tidak ditemukan di DB, kembalikan nilai fallback atau key itu sendiri.

export async function getMessage(
  key: string,
  fallback?: string
): Promise<string> {
  const cached = unstable_cache(
    async () => {
      const db = createServerSupabaseClient()

      const { data } = await db
        .from('message_library')
        .select('teks')
        .eq('key', key)
        .eq('is_active', true)
        .single()

      return data?.teks ?? null
    },
    [`messages:single:${key}`],
    {
      revalidate: 15 * 60,
      tags: ['messages', `messages:key:${key}`],
    }
  )

  const result = await cached()
  return result ?? fallback ?? key
}

// ─── FUNGSI 3: interpolate ────────────────────────────────────────────────────
// Ganti placeholder {nama_variabel} dalam teks dengan nilai aktual.
// Contoh: interpolate("Halo {nama}", { nama: "Philips" }) → "Halo Philips"

export function interpolate(
  teks: string,
  vars: Record<string, string>
): string {
  return teks.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`)
}
