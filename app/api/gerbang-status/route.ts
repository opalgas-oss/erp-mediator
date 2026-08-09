// app/api/gerbang-status/route.ts
// ALAT DIAGNOSA GERBANG "Tutup Situs Sementara" (#75) — dibuat Sesi #452.
//
// ⛔ KENAPA BERKAS INI ADA
//   Gerbang #75 bersifat **fail-OPEN** (T-449-11). Itu keputusan yang benar, tetapi ia punya satu
//   akibat yang mahal: TIGA kegagalan yang sama sekali berbeda menghasilkan layar yang SAMA PERSIS
//   dari luar — situs terlihat terbuka. Selama beberapa sesi, setiap diagnosa karena itu hanya
//   berupa TEBAKAN atas sebab yang tidak pernah diukur.
//
//     A. key `gate:site_closed` ada, tapi nilainya bukan posisi tertutup
//     B. Redis tidak terjangkau dari Edge / env var kosong  ⇒ fail-OPEN diam-diam
//     C. pembacanya benar (tertutup=true) tapi gerbang di middleware tidak menutup apa pun
//
//   `bacaPosisiSaklarTutupSitus()` SUDAH memulangkan `sumber: 'gerbang' | 'cache-config' |
//   'fail-open'` — satu kata yang membedakan ketiganya — dan nilai itu selama ini DIBUANG,
//   tidak pernah keluar ke mana pun. Berkas ini hanya mengeluarkannya.
//
// 🔴 CARA MEMBACA JAWABANNYA — satu lihat, satu vonis:
//     sumber="fail-open"                    ⇒ B  — Edge tidak bisa membaca Redis (cek env var)
//     sumber="gerbang" + tertutup=false     ⇒ A  — key gerbang ada tapi isinya bukan "true"
//                                                  (masalahnya di PATCH /api/config/[feature_key])
//     sumber="gerbang" + tertutup=true
//       TAPI situs masih terbuka            ⇒ C  — pembaca benar, yang tidak bekerja gerbangnya
//     sumber="cache-config"                 ⇒ key gerbang belum pernah ditulis; posisi dibaca dari
//                                             cache config. PATCH tidak menuliskannya.
//
// ⚠️ BATASNYA DISEBUT: berkas ini TIDAK memperbaiki apa pun dan TIDAK mengubah perilaku apa pun.
//   Ia hanya membaca — nol tulisan ke Redis, nol tulisan ke Supabase. Ia memakai fungsi baca yang
//   PERSIS SAMA dengan yang dipakai middleware (ATURAN 36 — satu rumah, bukan salinan kedua),
//   dan `runtime = 'edge'` supaya lingkungannya sama dengan middleware, bukan lingkungan lain.
//
// 🔒 NOL rahasia dibocorkan: env var hanya dilaporkan ADA / TIDAK ADA (boolean), bukan nilainya.
//
// ⏭️ CATATAN UNTUK SESI BERIKUTNYA: begitu gerbang terbukti bekerja, alamat `/api/gerbang-status`
//   WAJIB ditambahkan ke daftar pengecualian `lolosGerbangTanpaQuery()` di `middleware.ts` —
//   kalau tidak, alat diagnosa ini ikut tertutup persis saat ia paling dibutuhkan. Sengaja BELUM
//   dikerjakan di sesi ini supaya perubahan tetap SATU BERKAS.

import { NextResponse } from 'next/server'
import {
  bacaPosisiSaklarTutupSitus,
  KEY_GERBANG_TUTUP_SITUS,
  KEY_CACHE_CONFIG_SISTEM,
  POLICY_KEY_TUTUP_SITUS,
} from '@/lib/situs-tertutup-edge'

export const runtime    = 'edge'
export const dynamic    = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const posisi = await bacaPosisiSaklarTutupSitus()

  return NextResponse.json(
    {
      // ── jawaban pokok ───────────────────────────────────────────────
      tertutup: posisi.tertutup,
      sumber:   posisi.sumber,

      // ── bahan diagnosa: ADA / TIDAK ADA saja, nilainya TIDAK pernah ditampilkan ──
      envUpstashUrlAda:   Boolean(process.env.UPSTASH_REDIS_REST_URL),
      envUpstashTokenAda: Boolean(process.env.UPSTASH_REDIS_REST_TOKEN),

      // ── nama key yang dibaca, supaya bisa dicocokkan langsung di konsol Upstash ──
      keyGerbang: KEY_GERBANG_TUTUP_SITUS,
      keyCache:   KEY_CACHE_CONFIG_SISTEM,
      policyKey:  POLICY_KEY_TUTUP_SITUS,

      waktu: new Date().toISOString(),
    },
    { headers: { 'cache-control': 'no-store, must-revalidate' } },
  )
}
