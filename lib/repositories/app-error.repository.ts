// lib/repositories/app-error.repository.ts
// Query murni tabel `app_error_log` — pencatatan laporan gangguan + PENAHANAN PER-PROFIL.
// Dibuat:   Sesi #424 — FASE 3.6e jalur EMAIL (K-422-1 langkah 6 + K-417-3).
// Direvisi: Sesi #426 — K-424-5 poin 3–4 + K-425-3 (jendela waktu DICABUT, profil pelapor masuk).
//
// KENAPA JALUR EMAIL, BUKAN WA (keputusan Philips S#424, dicatat verbatim):
//   "untuk Support Problem hampir / sebagian besar tidak menggunakan komunikasi via WA, tapi harus
//    melalui Email. Karena keterkaitan dengan Audit Trail dan Log History Problem sebuah aplikasi
//    dan memastikan tidak ada penyelesaian case karena subjektif ke dekatan personal."
//   ⇒ Tabel inilah audit trail-nya. WA adalah pelengkap, BUKAN pengganti.
//
// AREA RAWAN yang dijaga di sini (Bug_Master):
//   · NOL `catch {}` kosong (BUG-034 · BUG-038) — fitur anti-bug-senyap DILARANG jadi bug senyap.
//   · NOL subquery PostgREST (BUG-038) — semua filter datar.
//   · `is_active` vs `is_aktif` (BUG-039) — tabel ini tidak punya kolom itu, nol risiko.
//
// Kolom nyata — 23 kolom (diverifikasi ULANG `information_schema` S#426, BUKAN dari dokumen):
//   id · route_path(NN) · menu_key · nama_halaman · digest · pesan · area(NN) · uid · tenant_id
//   · user_agent · dedup_key(NN) · occurrence_count(NN,d1) · first_occurred_at(NN,now())
//   · last_occurred_at(NN,now()) · status(NN,'BARU') · resolved_at · resolved_by · catatan
//   · ip_pelapor(inet) · browser · perangkat · insiden_key(NN) · sidik_profil(NN)  <- 5 kolom S#425
// CHECK terverifikasi: area ∈ (publik|super_admin|admin_tenant|vendor) · status ∈ (BARU|DITANGANI|SELESAI)
//
// 🔴 TEMUAN-1 (S#426) — INILAH YANG DIPERBAIKI BERKAS INI:
//   `insiden_key` dan `sidik_profil` NOT NULL **tanpa nilai bawaan**, tetapi `INSERT` versi S#424
//   tidak mengisi keduanya. Akibatnya SETIAP laporan yang harus melahirkan baris BARU ditolak
//   `not_null_violation` — pengunjung melihat pesan gagal, NOL email, NOL audit trail.
//   Dibuktikan dengan uji INSERT nyata yang dijamin dibatalkan (tabel tetap 2 baris, nol sisa uji).
//   Pelajaran: migration yang menambah kolom NOT NULL tanpa nilai bawaan MEMATAHKAN kode yang
//   sedang hidup — walaupun sesi yang menjalankannya tidak menyentuh satu baris kode pun.
//   S#425 menutup dengan "nol berkas kode" dan itu jujur; yang terlewat: memeriksa akibat DDL-nya.

import 'server-only'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// ─── Tipe ─────────────────────────────────────────────────────────────────────

export type AreaError = 'publik' | 'super_admin' | 'admin_tenant' | 'vendor'

export interface AppErrorInput {
  route_path:   string
  menu_key:     string | null
  nama_halaman: string | null
  digest:       string | null
  pesan:        string | null
  area:         AreaError
  uid:          string | null
  tenant_id:    string | null
  user_agent:   string | null
  dedup_key:    string
  /** BARU S#426 — penanda GANGGUAN. NOT NULL di Supabase, TANPA nilai bawaan. Wajib terisi. */
  insiden_key:  string
  /** BARU S#426 — penanda PELAPOR. NOT NULL di Supabase, TANPA nilai bawaan. Wajib terisi. */
  sidik_profil: string
  /** BARU S#426 — IP PENUH (inet). DILARANG di-hash, dipotong, atau disamarkan (K-424-6). */
  ip_pelapor:   string | null
  /** BARU S#426 — diurai dari `user_agent` DI SERVER, bukan dikirim klien. */
  browser:      string | null
  /** BARU S#426 — diurai dari `user_agent` DI SERVER, bukan dikirim klien. */
  perangkat:    string | null
}

export interface AppErrorUpsertResult {
  id:               string
  occurrence_count: number
  /**
   * `true`  = baris BARU lahir → laporan DIPROSES (Pop Up 1, email dikirim)
   * `false` = laporan DITAHAN  → profil SAMA + halaman SAMA dan baris lamanya belum `SELESAI`
   *           (Pop Up 2, NOL email) — K-425-3
   */
  baris_baru:       boolean
}

// ─── appErrorRepo_catatLaporan ─────────────────────────────────────────────────
/**
 * Catat satu laporan gangguan, dengan PENAHANAN PER-PROFIL (K-424-5 poin 4 + K-425-3).
 *
 * ⚠️ **NAMA FUNGSI SENGAJA DIGANTI** dari `appErrorRepo_upsertDedup`. Perilakunya berubah dari
 * akar — bukan disempurnakan. Mempertahankan nama lama berarti membiarkan kata "dedup" menempel
 * pada mekanisme yang justru lahir untuk menggantikannya, dan itu persis pelajaran S#425:
 * *istilah yang salah adalah kendaraan bagi aturan yang salah.*
 *
 * **Yang MENAHAN:** ada baris ber-`dedup_key` SAMA yang statusnya BELUM `SELESAI`. Kejadian
 * seperti itu menaikkan `occurrence_count` + memperbarui `last_occurred_at`, lalu mengembalikan
 * `baris_baru = false` — pemanggil menampilkan Pop Up 2 dan TIDAK mengirim email.
 *
 * **Yang MELEPAS penahanan, PERSIS DUA — waktu BUKAN salah satunya:**
 *   1. halaman BERBEDA → `insiden_key` berubah  → `dedup_key` berubah → baris BARU
 *   2. profil  BERBEDA → `sidik_profil` berubah → `dedup_key` berubah → baris BARU
 *
 * Ditambah satu jalan keluar yang disengaja: begitu baris lama ditandai `SELESAI` oleh tim Support,
 * gangguan yang kambuh dihitung sebagai KEJADIAN BARU — orang yang sama boleh melapor lagi. Itu
 * sebabnya index `idx_app_error_log_insiden` SENGAJA bukan UNIQUE.
 *
 * ⛔ **DILARANG menambahkan filter waktu di fungsi ini.** Versi S#424 memakai jendela
 * `error_report_dedup_minutes` (10 menit); Philips MENCABUTNYA di S#425 karena membuat pelapor yang
 * sama di halaman yang sama LOLOS LAGI sesudah 10 menit sehingga tim menerima email kedua — persis
 * yang perintah K-424-5 larang. Item config itu kini yatim (`TEMUAN-CONFIG-DEDUP-YATIM`) dan TIDAK
 * dihapus: menghapus item config bukan keputusan Claude.
 *
 * @param input - data kejadian, termasuk 5 kolom profil pelapor
 */
export async function appErrorRepo_catatLaporan(
  input: AppErrorInput
): Promise<AppErrorUpsertResult> {
  const db = createServerSupabaseClient()

  // Filter DATAR — nol subquery PostgREST (BUG-038).
  // `.neq('status','SELESAI')` menggantikan `.gte('last_occurred_at', batasWaktu)` versi S#424:
  // yang menentukan bukan lagi WAKTU, melainkan apakah laporannya sudah ditutup tim Support.
  const { data: existing, error: errCari } = await db
    .from('app_error_log')
    .select('id, occurrence_count')
    .eq('dedup_key', input.dedup_key)
    .neq('status', 'SELESAI')
    .order('last_occurred_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (errCari) {
    throw new Error(`appErrorRepo_catatLaporan gagal memeriksa penahanan: ${errCari.message}`)
  }

  if (existing) {
    const hitunganBaru = (existing.occurrence_count ?? 1) + 1

    const { error: errUpdate } = await db
      .from('app_error_log')
      .update({
        occurrence_count: hitunganBaru,
        last_occurred_at: new Date().toISOString(),
      })
      .eq('id', existing.id)

    if (errUpdate) {
      throw new Error(`appErrorRepo_catatLaporan gagal menaikkan hitungan: ${errUpdate.message}`)
    }

    return { id: existing.id, occurrence_count: hitunganBaru, baris_baru: false }
  }

  const { data: inserted, error: errInsert } = await db
    .from('app_error_log')
    .insert({
      route_path:   input.route_path,
      menu_key:     input.menu_key,
      nama_halaman: input.nama_halaman,
      digest:       input.digest,
      pesan:        input.pesan,
      area:         input.area,
      uid:          input.uid,
      tenant_id:    input.tenant_id,
      user_agent:   input.user_agent,
      dedup_key:    input.dedup_key,
      // ── 5 kolom profil pelapor — hidup di Supabase sejak S#425, BARU diisi di S#426 ──
      // `insiden_key` + `sidik_profil` NOT NULL tanpa nilai bawaan: tanpa dua baris di bawah,
      // setiap INSERT ditolak `not_null_violation` (TEMUAN-1). IP disimpan PENUH (K-424-6).
      insiden_key:  input.insiden_key,
      sidik_profil: input.sidik_profil,
      ip_pelapor:   input.ip_pelapor,
      browser:      input.browser,
      perangkat:    input.perangkat,
      // occurrence_count · first/last_occurred_at · status = DEFAULT kolom (1 · now() · 'BARU')
    })
    .select('id, occurrence_count')
    .single()

  if (errInsert) {
    throw new Error(`appErrorRepo_catatLaporan gagal menyimpan: ${errInsert.message}`)
  }

  return {
    id:               inserted.id,
    occurrence_count: inserted.occurrence_count ?? 1,
    baris_baru:       true,
  }
}
