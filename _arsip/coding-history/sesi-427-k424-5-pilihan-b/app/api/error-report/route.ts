// app/api/error-report/route.ts
// POST — terima laporan gangguan dari halaman maintenance / halaman error, catat ke audit trail
// (`app_error_log`) lalu kirim email ke kontak tim.
//
// Dibuat: Sesi #424 — FASE 3.6e jalur EMAIL.
//
// ENDPOINT INI SENGAJA PUBLIK (tanpa auth) — halaman maintenance dan halaman error justru muncul
// saat sistem sedang tidak sehat; mewajibkan sesi login di sana berarti laporan tidak akan pernah
// sampai. Konsekuensinya dijaga di bawah, bukan diabaikan.
//
// PENGAMAN ANTI-BANJIR (disebut terbuka, bukan diam-diam):
//   1. `dedup_key` = digest + route_path. Halaman publik TIDAK mengirim digest, jadi kuncinya
//      STABIL → pengunjung anonim tidak bisa melahirkan baris tanpa batas. Satu halaman = satu
//      baris per jendela dedup, dan email hanya dikirim saat baris BARU lahir.
//   2. DTO Zod membatasi panjang setiap field — payload raksasa ditolak sebelum menyentuh DB.
//   3. `area` dibatasi enum yang sama persis dengan CHECK constraint di Supabase.
//   ⚠️ Rate limit per-IP (Upstash) BELUM ada — dicatat sebagai HUTANG-RATELIMIT-ERROR-REPORT,
//      bukan dianggap selesai. Pengaman 1 menahan kasus wajar, bukan penyerang yang gigih.
//
// AREA RAWAN — `catch {}` KOSONG (BUG-034 · BUG-038): route inilah yang paling rentan. Kalau galat
// ditelan diam-diam, fitur anti-bug-senyap BERUBAH menjadi bug senyap. Setiap cabang gagal di
// bawah WAJIB `console.error`/`console.warn`.

import { NextRequest, NextResponse } from 'next/server'
import { z }                         from 'zod'
import { AppErrorService_laporGangguan } from '@/lib/services/app-error.service'

export const dynamic = 'force-dynamic'

// ─── DTO ──────────────────────────────────────────────────────────────────────

const AREA = ['publik', 'super_admin', 'admin_tenant', 'vendor'] as const

const SkemaLaporan = z.object({
  routePath:     z.string().min(1).max(500),
  /** URL lengkap — untuk isi email/pesan saja, TIDAK masuk dedup_key (query string berubah-ubah) */
  alamatLengkap: z.string().max(1000).nullish(),
  namaHalaman: z.string().max(200).nullish(),
  menuKey:     z.string().max(120).nullish(),
  digest:      z.string().max(120).nullish(),
  pesan:       z.string().max(2000).nullish(),
  area:        z.enum(AREA),
})

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const raw = await request.json().catch(() => null)

    if (raw === null) {
      console.warn('[POST /api/error-report] body bukan JSON yang sah')
      return NextResponse.json(
        { success: false, message: 'Format laporan tidak dikenali' },
        { status: 400 }
      )
    }

    const parsed = SkemaLaporan.safeParse(raw)

    if (!parsed.success) {
      console.warn('[POST /api/error-report] DTO ditolak:', parsed.error.issues)
      return NextResponse.json(
        { success: false, message: 'Isi laporan tidak lengkap atau tidak sah' },
        { status: 400 }
      )
    }

    const d = parsed.data

    const hasil = await AppErrorService_laporGangguan({
      routePath:     d.routePath,
      alamatLengkap: d.alamatLengkap ?? null,
      namaHalaman: d.namaHalaman ?? null,
      menuKey:     d.menuKey ?? null,
      digest:      d.digest ?? null,
      pesan:       d.pesan ?? null,
      area:        d.area,
      // uid + tenantId SENGAJA null di Tahap ini: halaman publik tidak punya sesi. Halaman error
      // dashboard mengisinya di FASE berikutnya lewat sesi server, BUKAN dari body permintaan —
      // identitas TIDAK BOLEH datang dari klien (bisa dipalsukan).
      uid:         null,
      tenantId:    null,
      userAgent:   request.headers.get('user-agent'),
    })

    // Bug Code dikembalikan supaya pengguna punya kode yang bisa disebut ke tim.
    return NextResponse.json({
      success:          true,
      bugCode:          hasil.idLaporan,
      occurrenceCount:  hasil.occurrenceCount,
      barisBaru:        hasil.barisBaru,
      emailTerkirim:    hasil.emailTerkirim,
      alasanEmailGagal: hasil.alasanEmailGagal,
    })

  } catch (error) {
    // Laporan gagal DICATAT — ini kegagalan nyata dan wajib berisik.
    console.error('[POST /api/error-report] gagal mencatat laporan:', error)
    return NextResponse.json(
      { success: false, message: 'Laporan gagal dicatat. Silakan hubungi tim lewat kanal lain.' },
      { status: 500 }
    )
  }
}
