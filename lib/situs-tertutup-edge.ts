// lib/situs-tertutup-edge.ts
// Pembaca posisi saklar "Tutup Situs Sementara" (#75) — KHUSUS Edge Runtime (middleware.ts).
//
// Dibuat Sesi #450 — butir 1 dari 6 (#75 HUTANG-SAKLAR-TUTUP-SITUS).
// Spesifikasi disetujui Philips S#449 (K-449-3). Keputusan yang mengikat berkas ini:
//   T-449-10 — gerbang dipasang di middleware.ts, bukan di layout
//   T-449-11 — posisi saklar dibaca dari cache Redis yang SUDAH ADA, fail-OPEN saat miss
//   T-449-15 — middleware hanya memutuskan gerbang, lalu rewrite ke Route Handler
//
// ⛔ KENAPA BERKAS INI ADA DAN TIDAK MEMAKAI lib/redis.ts
//   `lib/redis.ts` memuat `import 'server-only'` (baris 22). Middleware berjalan di Edge Runtime,
//   di luar jangkauan pengaman itu — dan SPEK S#449 sudah menetapkan penawarnya di depan:
//   "helper tipis tanpa server-only, env var yang SAMA, nol kredensial kedua".
//   ⇒ Berkas ini membaca `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` yang PERSIS SAMA
//   dengan lib/redis.ts. NOL kredensial baru, NOL env var baru, NOL infrastruktur baru.
//
// 🔴 SUMBER KEBENARAN TETAP `config_registry` (ATURAN 36).
//   Redis di sini HANYA cache. Dua key yang dibaca, berurutan:
//     1. `gate:site_closed`  — key gerbang. DITULIS oleh PATCH /api/config/[feature_key] di momen
//        yang SAMA dengan penghapusan cache (butir 4). Ini yang menutup jendela gagal-senyap:
//        tanpa key ini, sesudah SA menekan Simpan cache terhapus ⇒ miss ⇒ fail-OPEN ⇒ gerbang
//        tidak menyala walau layar SA sudah bilang tersimpan.
//     2. `config:api:sistem` — cache yang GET /api/config/[feature_key] sudah tulis hari ini.
//        Dipakai kalau key gerbang belum pernah ditulis (mis. Redis baru di-flush).
//
// 🔴 FAIL-OPEN — DISENGAJA, BUKAN KELALAIAN (T-449-11)
//   Redis miss / mati / env kosong / bentuk data tak dikenal ⇒ situs DIANGGAP TERBUKA.
//   Menutup seluruh situs karena cache kosong = kerusakan jauh lebih besar daripada situs
//   terlanjur terbuka beberapa detik. Setiap jalur `catch` di bawah memulangkan `tertutup: false`.
//
// ⚠️ BELUM TERBUKTI SAMPAI `npm run build` NYATA — tidak diklaim di sini:
//   apakah `@upstash/redis` (v1.37.0, berbasis fetch) benar-benar terpakai dari middleware Edge.
//   Kalau build menolaknya, penggantinya `fetch` mentah ke Upstash REST API — dan itu akan
//   dikatakan apa adanya, bukan ditambal diam-diam.

import { Redis } from '@upstash/redis'

// ─── Konstanta — nilai yang dipakai bersama butir 3 (middleware) & butir 4 (PATCH) ───────────
export const KEY_GERBANG_TUTUP_SITUS = 'gate:site_closed'
export const KEY_CACHE_CONFIG_SISTEM = 'config:api:sistem'
export const POLICY_KEY_TUTUP_SITUS  = 'site_closed'
export const FEATURE_KEY_SISTEM      = 'sistem'

export type SumberPosisi = 'gerbang' | 'cache-config' | 'fail-open'

export interface PosisiSaklarTutupSitus {
  /** true HANYA kalau posisi tertutup terbaca eksplisit. Ragu apa pun ⇒ false (fail-OPEN). */
  tertutup: boolean
  /** dari mana jawabannya datang — untuk diagnosa saat TC, bukan untuk logika bisnis */
  sumber:   SumberPosisi
}

const TERBUKA: PosisiSaklarTutupSitus = { tertutup: false, sumber: 'fail-open' }

// ─── Client Redis — lazy, tanpa `server-only`, kredensial SAMA dengan lib/redis.ts ────────────
let _client        : Redis | null = null
let _initAttempted  = false

function getRedisEdge(): Redis | null {
  if (_initAttempted) return _client
  _initAttempted = true

  try {
    const restUrl   = process.env.UPSTASH_REDIS_REST_URL   ?? null
    const restToken = process.env.UPSTASH_REDIS_REST_TOKEN ?? null

    // env kosong = konfigurasi belum lengkap, BUKAN alasan menutup situs
    if (!restUrl || !restToken) return null

    _client = new Redis({ url: restUrl, token: restToken })
    return _client
  } catch {
    return null
  }
}

// ─── Penerjemah nilai — `config_registry.nilai` bertipe TEXT, jadi yang datang selalu string ──
// Diterima sebagai TERTUTUP hanya bentuk yang eksplisit. Apa pun selain itu ⇒ terbuka.
function bacaSebagaiTertutup(nilai: unknown): boolean {
  if (nilai === true) return true
  if (typeof nilai === 'string') {
    const v = nilai.trim().toLowerCase()
    return v === 'true' || v === '1'
  }
  return false
}

// ─── Pencari baris saklar di dalam bentuk respons GET /api/config/[feature_key] ───────────────
// Bentuk yang disimpan ke cache: { success: true, data: [ { group_id, group_label, items: [...] } ] }
// Baris saklar dikenali dari kolom `policy_key` (diverifikasi dari information_schema S#450),
// BUKAN dari `label` — label bisa diubah SA dari layar, `policy_key` tidak.
function cariNilaiSaklar(payload: unknown): boolean | null {
  if (typeof payload !== 'object' || payload === null) return null

  const grup = (payload as { data?: unknown }).data
  if (!Array.isArray(grup)) return null

  for (const g of grup) {
    const items = (g as { items?: unknown })?.items
    if (!Array.isArray(items)) continue
    for (const it of items) {
      const row = it as { policy_key?: unknown; nilai?: unknown; is_active?: unknown }
      if (row?.policy_key !== POLICY_KEY_TUTUP_SITUS) continue
      if (row?.is_active === false) return false   // baris dinonaktifkan = saklar tidak berlaku
      return bacaSebagaiTertutup(row?.nilai)
    }
  }
  return null   // baris saklar belum ada di config_registry (butir 5 belum dikerjakan)
}

// ─── API PUBLIK BERKAS INI ───────────────────────────────────────────────────────────────────
/**
 * Membaca posisi saklar "Tutup Situs Sementara" dari cache Redis.
 *
 * TIDAK PERNAH melempar exception dan TIDAK PERNAH menyentuh Supabase — ia berjalan di jalur
 * yang dilewati SETIAP permintaan, jadi satu round-trip database di sini tidak dapat diterima
 * (dasar penolakan tiga alternatif lain: KERJA_SESI_449_SPEK_75.md, bagian "ONGKOS BACA POSISI").
 *
 * Ragu apa pun ⇒ `{ tertutup: false }`. Itu fail-OPEN yang disengaja (T-449-11).
 */
export async function bacaPosisiSaklarTutupSitus(): Promise<PosisiSaklarTutupSitus> {
  const redis = getRedisEdge()
  if (!redis) return TERBUKA

  // 1) Key gerbang — ditulis PATCH bersamaan dengan penghapusan cache (butir 4)
  try {
    const gerbang = await redis.get<unknown>(KEY_GERBANG_TUTUP_SITUS)
    if (gerbang !== null && gerbang !== undefined) {
      return { tertutup: bacaSebagaiTertutup(gerbang), sumber: 'gerbang' }
    }
  } catch {
    // Redis mati / jaringan gagal ⇒ jangan tutup situs, dan jangan lanjut menebak
    return TERBUKA
  }

  // 2) Cache config yang sudah ada — dipakai kalau key gerbang belum pernah ditulis
  try {
    const cached = await redis.get<unknown>(KEY_CACHE_CONFIG_SISTEM)
    if (cached === null || cached === undefined) return TERBUKA

    // Pola defensif yang SAMA dengan GET /api/config/[feature_key]: @upstash/redis sudah
    // mendeserialisasi otomatis, tapi nilai lama bisa saja masih berupa string JSON.
    const payload = typeof cached === 'string' ? JSON.parse(cached) : cached

    const nilai = cariNilaiSaklar(payload)
    if (nilai === null) return TERBUKA
    return { tertutup: nilai, sumber: 'cache-config' }
  } catch {
    return TERBUKA
  }
}
