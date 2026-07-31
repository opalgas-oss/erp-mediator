// lib/services/app-error.service.ts
// Orkestrasi laporan gangguan: CATAT ke audit trail → KIRIM email ke tim.
// Dibuat: Sesi #424 — FASE 3.6e jalur EMAIL. Nol query langsung (semua lewat repository).
//
// ═══ KENAPA EMAIL, DAN KENAPA SERVER YANG MENGIRIM ═══════════════════════════════════════════
// Keputusan Philips S#424 (verbatim): *"untuk Support Problem hampir / sebagian besar tidak
// menggunakan komunikasi via WA, tapi harus melalui Email. Karena keterkaitan dengan Audit Trail
// dan Log History Problem sebuah aplikasi dan memastikan tidak ada penyelesaian case karena
// subjektif ke dekatan personal."*
//
// Sebelum S#424 satu-satunya jalur email adalah `mailto:` — yaitu MENITIPKAN ke aplikasi email
// pengguna. Diuji nyata di komputer Philips (jendela normal, bukan Incognito): Chrome membentuk
// Request URL yang SEMPURNA (terbukti dari tab Payload DevTools) lalu BERHENTI — `0 B transferred`,
// nol aplikasi terbuka, karena tidak ada handler `mailto:` terdaftar. Gagal SENYAP, nol umpan balik.
//
// Modul ini memindahkan pengiriman ke SERVER. Bedanya bukan selera:
//   · server TAHU email terkirim atau tidak (`mailto:` tidak pernah tahu)
//   · laporan tercatat di `app_error_log` SEBELUM email — audit trail tidak bergantung email
//   · tidak butuh aplikasi apa pun di komputer pengguna
//
// DRY (ATURAN 19) — registry `cr_functions` diperiksa lebih dulu, NOL fungsi kirim email baru dibuat:
//   `sendResendEmail()` di `lib/utils/resend.server.ts` SUDAH ADA (S#218), server-only, sinkron,
//   credential dari M3 DB. Provider `resend` terverifikasi `is_aktif=true` + 1 instance aktif.

import 'server-only'
import {
  appErrorRepo_upsertDedup,
  type AppErrorInput,
  type AreaError,
} from '@/lib/repositories/app-error.repository'
import { getConfigPageItems } from '@/lib/config-registry'
import { getMessage }         from '@/lib/message-library'
import { sendResendEmail }    from '@/lib/utils/resend.server'
import { getNamaBrandPlatform } from '@/lib/utils/brand.server'
import { TeamContactService_getKontakTujuan } from '@/lib/services/team-contact.service'
import { isiVariabel, buangBarisKosong } from '@/lib/utils/bug-mailto.util'

// ─── Tipe ─────────────────────────────────────────────────────────────────────

export interface LaporGangguanInput {
  routePath:   string
  namaHalaman: string | null
  menuKey:     string | null
  digest:      string | null
  pesan:       string | null
  area:        AreaError
  uid:         string | null
  tenantId:    string | null
  userAgent:   string | null
}

export interface LaporGangguanResult {
  /** id baris app_error_log — dipakai UI sebagai Bug Code kalau `digest` tidak ada */
  idLaporan:        string
  occurrenceCount:  number
  barisBaru:        boolean
  emailTerkirim:    boolean
  /** alasan email tidak terkirim — untuk ditampilkan jujur ke pengguna, bukan disembunyikan */
  alasanEmailGagal: string | null
}

const DEDUP_MINUTES_DEFAULT = 10

// ─── AppErrorService_laporGangguan ────────────────────────────────────────────
/**
 * Catat gangguan ke audit trail, lalu kirim email ke kontak tim yang dicentang
 * `publish_bug_dashboard`.
 *
 * **Urutan SENGAJA: catat DULU, kirim email SESUDAH.** Kalau email gagal, laporannya tetap
 * tercatat — audit trail TIDAK BOLEH bergantung pada keberhasilan pengiriman. Ini inti alasan
 * Philips memilih email sebagai kanal resmi: jejaknya harus ada apa pun yang terjadi.
 *
 * **Email hanya dikirim saat baris BARU lahir.** Kejadian berulang dalam jendela dedup hanya
 * menaikkan `occurrence_count` — satu gangguan yang diklik 50 kali menghasilkan 1 email, bukan 50.
 * Inilah fungsi bisnis dedup, bukan sekadar kerapian tabel.
 */
export async function AppErrorService_laporGangguan(
  input: LaporGangguanInput
): Promise<LaporGangguanResult> {
  // ── Jendela dedup dari config (ATURAN 8 — nol hardcode) ────────────────────
  let dedupMinutes = DEDUP_MINUTES_DEFAULT
  try {
    const rows = await getConfigPageItems('monitoring')
    const baris = rows.find((r) => r.policy_key === 'error_report_dedup_minutes')
    const angka = Number(baris?.nilai)
    if (Number.isFinite(angka) && angka > 0) dedupMinutes = angka
  } catch (err) {
    // BUKAN catch kosong (BUG-034/BUG-038). Config tak terbaca bukan alasan menggagalkan laporan —
    // tapi WAJIB berbunyi supaya tidak jadi bug senyap.
    console.warn('[AppErrorService] gagal membaca error_report_dedup_minutes, pakai default', err)
  }

  // ── dedup_key = digest + route_path (K-417-3) ──────────────────────────────
  // Halaman PUBLIK sengaja tidak mengirim `digest` (tidak ada error boundary di sana), sehingga
  // dedup_key-nya STABIL. Efek samping yang disengaja: pengunjung anonim tidak bisa melahirkan
  // baris baru tanpa batas dengan mengarang digest acak — satu halaman = satu baris per jendela.
  const dedupKey = `${input.digest ?? 'tanpa-digest'}::${input.routePath}`

  const payload: AppErrorInput = {
    route_path:   input.routePath,
    menu_key:     input.menuKey,
    nama_halaman: input.namaHalaman,
    digest:       input.digest,
    pesan:        input.pesan,
    area:         input.area,
    uid:          input.uid,
    tenant_id:    input.tenantId,
    user_agent:   input.userAgent,
    dedup_key:    dedupKey,
  }

  // ── LANGKAH 1: audit trail. Gagal di sini = gagal beneran, dilempar ke caller.
  const tercatat = await appErrorRepo_upsertDedup(payload, dedupMinutes)

  // ── LANGKAH 2: email — hanya untuk baris BARU.
  if (!tercatat.baris_baru) {
    return {
      idLaporan:        tercatat.id,
      occurrenceCount:  tercatat.occurrence_count,
      barisBaru:        false,
      emailTerkirim:    false,
      alasanEmailGagal: null, // bukan gagal — memang sengaja tidak dikirim (dedup)
    }
  }

  let emailTerkirim = false
  let alasanGagal: string | null = null

  try {
    const kontak = await TeamContactService_getKontakTujuan('bug_dashboard')

    if (!kontak?.email) {
      // §6.3 — tidak ada alamat tujuan. Bukan galat sistem; laporannya sudah tercatat.
      alasanGagal = 'Belum ada kontak tim yang dicentang untuk laporan bug'
      console.warn('[AppErrorService] nol kontak bug_dashboard — email dilewati, laporan tetap tercatat')
    } else {
      const [templatePerihal, templateIsi, brandName, rowsUmum] = await Promise.all([
        getMessage('error_email_subject'),
        getMessage('error_email_body'),
        getNamaBrandPlatform(input.tenantId),
        getConfigPageItems('platform_general'),
      ])

      const zona =
        rowsUmum.find((r) => r.policy_key === 'platform_timezone')?.nilai || 'Asia/Jakarta'

      const waktu = new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'long',
        timeStyle: 'short',
        timeZone:  zona,
      }).format(new Date())

      // Bug Code = `digest` kalau ada; kalau tidak, id baris laporan. Pengguna SELALU punya satu
      // kode yang bisa disebut ke tim — itu yang membuat case bisa dilacak, bukan diingat-ingat.
      const bugCode = input.digest ?? tercatat.id

      const kosong: string[] = []
      if (!input.uid) kosong.push('pengguna')

      const nilai: Record<string, string> = {
        nama_halaman:   input.namaHalaman ?? input.routePath,
        alamat_halaman: input.routePath,
        waktu,
        brand_name:     brandName,
        pengguna:       input.uid ?? '',
        kode_error:     bugCode,
      }

      const perihal = isiVariabel(templatePerihal, nilai)
      const isi     = isiVariabel(buangBarisKosong(templateIsi, kosong), nilai)

      const hasil = await sendResendEmail({
        toEmail:  kontak.email,
        toNama:   kontak.nama,
        subject:  perihal,
        textBody: isi,
      })

      emailTerkirim = hasil.success
      if (!hasil.success) {
        alasanGagal = hasil.message ?? 'Pengiriman email gagal'
        console.error('[AppErrorService] Resend gagal:', hasil.message)
      }
    }
  } catch (err) {
    // WAJIB berbunyi. Laporan SUDAH tercatat di langkah 1, jadi kegagalan email tidak
    // menghilangkan jejak — tapi menelannya diam-diam akan mengubah fitur anti-bug-senyap
    // ini menjadi bug senyap (BUG-034 · BUG-038).
    alasanGagal = err instanceof Error ? err.message : 'Kesalahan tak dikenal saat mengirim email'
    console.error('[AppErrorService] pengiriman email gangguan gagal:', err)
  }

  return {
    idLaporan:        tercatat.id,
    occurrenceCount:  tercatat.occurrence_count,
    barisBaru:        true,
    emailTerkirim,
    alasanEmailGagal: alasanGagal,
  }
}
