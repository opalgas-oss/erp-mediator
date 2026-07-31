// lib/services/app-error.service.ts
// KATEGORI: ORKESTRASI satu laporan gangguan — bentuk profil pelapor → CATAT → email → eskalasi.
//
// Dibuat: Sesi #424 (jalur EMAIL). Dipecah TIGA + ditulis ulang isinya: Sesi #427 (K-427-1).
//
// ═══ PETA PECAHAN — buka yang sesuai dengan yang mau diubah ══════════════════════════════════
//   · berkas ini                        ALUR: profil pelapor → catat → email → eskalasi
//   · `app-error-email.service.ts`      MENYUSUN + MENGIRIM email laporan pertama
//   · `app-error-eskalasi.service.ts`   MEMUTUSKAN kapan tim dipanggil + email eskalasinya
// Sumbunya TANGGUNG JAWAB, bukan ukuran: ketiganya berubah karena alasan yang berbeda. Pemicunya
// memang plafon — berkas ini 11.285 B SEBELUM disentuh — tetapi K-426-2 mengikat bahwa plafon
// yang terlewati adalah pemicu PEMECAHAN, bukan pemicu memangkas komentar.
//
// ═══ KENAPA EMAIL, DAN KENAPA SERVER YANG MENGIRIM ═══════════════════════════════════════════
// Keputusan Philips S#424 (verbatim): *"untuk Support Problem hampir / sebagian besar tidak
// menggunakan komunikasi via WA, tapi harus melalui Email. Karena keterkaitan dengan Audit Trail
// dan Log History Problem sebuah aplikasi dan memastikan tidak ada penyelesaian case karena
// subjektif ke dekatan personal."*
//
// Sebelum S#424 satu-satunya jalur email adalah `mailto:` — MENITIPKAN ke aplikasi email pengguna.
// Diuji nyata di komputer Philips: Chrome membentuk Request URL yang SEMPURNA lalu BERHENTI —
// `0 B transferred`, nol aplikasi terbuka. Gagal SENYAP, nol umpan balik. Modul ini memindahkan
// pengiriman ke SERVER: server TAHU email terkirim atau tidak, dan laporan tercatat SEBELUM email
// sehingga audit trail tidak bergantung pada keberhasilan pengiriman.
//
// ═══ APA YANG BERUBAH DI S#427 ═══════════════════════════════════════════════════════════════
//  1. `appErrorRepo_upsertDedup(payload, dedupMinutes)` → `appErrorRepo_catatLaporan(payload)`.
//     Parameter `dedupMinutes` DIBUANG mengikuti K-425-3: waktu BUKAN pelepas penahanan.
//     Konstanta `DEDUP_MINUTES_DEFAULT = 10` ikut dibuang — ia angka bisnis yang hidup di kode.
//     ⛔ DILARANG mengembalikan nama lama atau membuat alias supaya build lolos.
//  2. Profil pelapor dibentuk DI SINI: IP + browser + perangkat + 3 penanda laporan.
//  3. Header dioper DARI ROUTE. Service TIDAK membaca `request` sendiri — route yang memberi.
//     IP DILARANG datang dari body: body bisa dipalsukan klien, header tidak.
//  4. Profil pelapor WAJIB masuk isi email (K-424-5 poin 6) — dikerjakan di service email.
//  5. IP DILARANG ikut dikembalikan di respons API — lihat catatan di `LaporGangguanResult`.

import 'server-only'
import {
  appErrorRepo_catatLaporan,
  type AppErrorInput,
  type AreaError,
} from '@/lib/repositories/app-error.repository'
import { bacaIpPelapor }       from '@/lib/utils/ip-pelapor.util'
import { uraiProfilPerangkat } from '@/lib/utils/perangkat-pelapor.util'
import { buatInsidenKey, buatSidikProfil, buatDedupKey } from '@/lib/utils/penanda-laporan.util'
import { AppErrorEmail_kirimLaporanPertama } from '@/lib/services/app-error-email.service'
import { AppErrorEskalasi_periksaDanKirim }  from '@/lib/services/app-error-eskalasi.service'

// ─── Tipe ─────────────────────────────────────────────────────────────────────

export interface LaporGangguanInput {
  /**
   * Header permintaan, DIOPER DARI ROUTE. Sumber alamat IP dan `user-agent`.
   * Service sengaja tidak menerima `Request` utuh: yang dibutuhkan hanya header, dan mempersempit
   * masukan membuat mustahil ada nilai dari body menyelinap jadi identitas pelapor.
   */
  headers:       Headers
  routePath:     string
  /**
   * URL LENGKAP halaman bermasalah. SENGAJA dipisah dari `routePath` (koreksi Philips S#424:
   * *"isi nya masih belum menggambarkan detail page yang problem"*). Hanya untuk isi pesan —
   * penanda gangguan tetap memakai `routePath` supaya query string yang berubah-ubah tidak
   * memecah penahanan.
   */
  alamatLengkap: string | null
  namaHalaman:   string | null
  menuKey:       string | null
  digest:        string | null
  pesan:         string | null
  area:          AreaError
  uid:           string | null
  tenantId:      string | null
}

export interface LaporGangguanResult {
  /** id baris app_error_log — dipakai UI sebagai Kode laporan kalau `digest` tidak ada */
  idLaporan:        string
  occurrenceCount:  number
  /** `false` = laporan DITAHAN (Pop Up 2, nol email) — profil sama + halaman sama, K-425-3 */
  barisBaru:        boolean
  emailTerkirim:    boolean
  alasanEmailGagal: string | null
  /** Ringkasan eskalasi — `null` kalau laporannya ditahan (eskalasi tidak dievaluasi). */
  eskalasi: { menyala: boolean; jumlahPelapor: number; ambangTertembus: number | null } | null
}
// ⛔ CATATAN KEAMANAN: `ip_pelapor` SENGAJA TIDAK ADA di tipe ini. IP disimpan PENUH di Supabase
// (K-424-6) dan ikut isi email ke tim, tetapi DILARANG dikembalikan ke pemanggil API — pengunjung
// tidak boleh menerima kembali alamat IP dari respons halaman publik.

// ─── AppErrorService_laporGangguan ────────────────────────────────────────────
/**
 * Catat gangguan ke audit trail, kirim email pertama, lalu serahkan keputusan eskalasi.
 *
 * **Urutan SENGAJA: catat DULU, email SESUDAH.** Kalau email gagal, laporannya tetap tercatat —
 * audit trail TIDAK BOLEH bergantung pada keberhasilan pengiriman.
 *
 * **Email dan eskalasi hanya saat baris BARU lahir.** Laporan yang ditahan hanya menaikkan
 * `occurrence_count`; ia tidak menambah pelapor unik, jadi mengevaluasi eskalasi di sana hanya
 * membuang query.
 */
export async function AppErrorService_laporGangguan(
  input: LaporGangguanInput
): Promise<LaporGangguanResult> {
  // ── Profil pelapor: seluruhnya dari HEADER, diurai DI SERVER ────────────────
  const ip = bacaIpPelapor(input.headers)
  // `user-agent` juga diambil dari header, bukan dari body — alasan yang sama dengan IP.
  const userAgent = input.headers.get('user-agent')
  const { browser, perangkat } = uraiProfilPerangkat(userAgent)

  const insidenKey  = buatInsidenKey(input.digest, input.routePath)
  const sidikProfil = buatSidikProfil({ uid: input.uid, ip, browser, perangkat })
  const dedupKey    = buatDedupKey(insidenKey, sidikProfil)

  const payload: AppErrorInput = {
    route_path:   input.routePath,
    menu_key:     input.menuKey,
    nama_halaman: input.namaHalaman,
    digest:       input.digest,
    pesan:        input.pesan,
    area:         input.area,
    uid:          input.uid,
    tenant_id:    input.tenantId,
    user_agent:   userAgent,
    dedup_key:    dedupKey,
    insiden_key:  insidenKey,
    sidik_profil: sidikProfil,
    ip_pelapor:   ip,
    browser,
    perangkat,
  }

  // ── LANGKAH 1: audit trail. Gagal di sini = gagal beneran, dilempar ke caller.
  const tercatat = await appErrorRepo_catatLaporan(payload)

  if (!tercatat.baris_baru) {
    return {
      idLaporan:        tercatat.id,
      occurrenceCount:  tercatat.occurrence_count,
      barisBaru:        false,
      emailTerkirim:    false,
      alasanEmailGagal: null, // bukan gagal — memang ditahan (K-425-3)
      eskalasi:         null,
    }
  }

  const namaHalaman   = input.namaHalaman ?? input.routePath
  const alamatHalaman = input.alamatLengkap ?? input.routePath
  // Pengguna SELALU punya satu kode yang bisa disebut ke tim — itu yang membuat case bisa
  // dilacak, bukan diingat-ingat.
  const kodeError     = input.digest ?? tercatat.id

  // ── LANGKAH 2: email pertama ───────────────────────────────────────────────
  const email = await AppErrorEmail_kirimLaporanPertama({
    area:      input.area,
    namaHalaman,
    alamatHalaman,
    kodeError,
    uid:       input.uid,
    tenantId:  input.tenantId,
    ipPelapor: ip,
    browser,
    perangkat,
  })

  // ── LANGKAH 3: eskalasi (K-425-2) — kegagalannya TIDAK menggagalkan laporan ─
  const eskalasi = await AppErrorEskalasi_periksaDanKirim({
    insidenKey,
    namaHalaman,
    alamatHalaman,
    labelArea: email.labelArea,
    tenantId:  input.tenantId,
    kodeError,
    ipPelapor: ip,
    browser,
    perangkat,
  })

  return {
    idLaporan:        tercatat.id,
    occurrenceCount:  tercatat.occurrence_count,
    barisBaru:        true,
    emailTerkirim:    email.terkirim,
    alasanEmailGagal: email.alasanGagal,
    eskalasi: {
      menyala:         eskalasi.menyala,
      jumlahPelapor:   eskalasi.jumlahPelapor,
      ambangTertembus: eskalasi.ambangTertembus,
    },
  }
}
