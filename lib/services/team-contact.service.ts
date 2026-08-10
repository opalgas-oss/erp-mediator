// lib/services/team-contact.service.ts
// Service Direktori Kontak Tim Tahap A — SELURUH logika bisnis fitur ini.
// Dipakai oleh: app/api/superadmin/team-contacts/** (Route Handler) + halaman yang
//               membutuhkan alamat tujuan tautan "hubungi tim kami".
// Dibuat: Sesi #423 — Direktori Kontak Tim Tahap A, FASE 3.4
//
// Layer Service (3-layer: Route → Service → Repository). NOL query DB langsung di sini —
// setiap sentuhan tabel lewat team-contact.repository.ts.
//
// Acuan: 03_Architecture/00_Global/DESAIN_MAINTENANCE_DAN_KONTAK_TIM.md §6.1 · §6.3
//        Mockup disetujui: 04_Mockup_UI/02_SuperAdmin/Mockup_SA_TeamContacts_v2.html (S#419)
//
// TIGA KEPUTUSAN MOCKUP (S#421) yang ditegakkan di file ini:
//   1. Kolom "Prioritas" = POSISI ORDINAL hasil urut (1·2·3·4) — BUKAN nilai sort_order.
//   2. Tombol panah = TUKAR sort_order dengan baris tetangga → menyentuh 2 BARIS, bukan 1.
//   3. Urutan `sort_order ASC, created_at ASC` — pemecah seri wajib karena DEFAULT 0.
//
// K-420-5: sort_order DEFAULT 0 di DB; jenjang 10/20/30 DIHITUNG DI SINI (max + 10).
//          SA menggeser lewat tombol panah — TIDAK PERNAH mengetik angka.
//
// PEMBAGIAN VALIDASI (keputusan teknis S#423, disebut terbuka):
//   · Bentuk/format masukan (email, panjang teks, enum) → DTO Zod di Route Handler (3.5),
//     mengikuti pattern wajib `cr_patterns.is_mandatory`.
//   · Aturan BISNIS (kecocokan scope↔tenant_id, jabatan sah, sort_order hasil hitungan)
//     → di sini.
//   Fungsi `validateEmail` bersama SENGAJA tidak dibuat: cek registry S#423 (Q-01/Q-02 atas
//   `%email%` + `%validate%`) mengembalikan NOL padanan, dan ATURAN 19 poin 4 melarang membuat
//   fungsi shared baru tanpa konfirmasi Philips. Zod `.email()` menutup kebutuhan itu tanpa
//   menambah fungsi baru.

import 'server-only'
import { validateSortOrder } from '@/lib/utils/validation.server'
import { normalkanNomorWaLink } from '@/lib/utils/wa-link.util'
import {
  TeamContactRepo_findAll,
  TeamContactRepo_findById,
  TeamContactRepo_findMaxSortOrder,
  TeamContactRepo_insert,
  TeamContactRepo_update,
  TeamContactRepo_softDelete,
  TeamContactRepo_updateSortOrder,
  TeamContactRepo_findPublished,
  type TargetPublikasi,
} from '@/lib/repositories/team-contact.repository'
import type {
  TeamContactRow,
  TeamContactScope,
  JabatanKontak,
  BuatKontakTimPayload,
  UbahKontakTimPayload,
  GeserKontakTimPayload,
  KontakTimBaris,
  KontakTerpublikasi,
} from '@/lib/types/team-contact.types'

// ─── Konstanta lokal ──────────────────────────────────────────────────────────
// 6 jabatan resmi GLOSSARY BAB 7. Menegakkan CHECK constraint yang sudah hidup di DB
// (chk_team_contacts_jabatan) — bukan daftar baru. Istilah "PIC" DILARANG (Philips S#413).
const JABATAN_VALID: readonly JabatanKontak[] = [
  'penanggung_jawab',
  'operator',
  'finance',
  'warehouse',
  'sales',
  'lainnya',
]

const SCOPE_VALID: readonly TeamContactScope[] = ['super_admin', 'admin_tenant', 'vendor']

/** Jarak antar-jenjang sort_order (K-420-5). Rung 10 / 20 / 30 ... */
const JENJANG = 10

// ─── Helper internal: validasi aturan bisnis ─────────────────────────────────

function pastikanJabatanSah(jabatan: JabatanKontak): void {
  if (!JABATAN_VALID.includes(jabatan)) {
    throw new Error(`Jabatan tidak dikenal: ${jabatan}. Nilai sah: ${JABATAN_VALID.join(', ')}`)
  }
}

/**
 * Kecocokan scope ↔ tenant_id ↔ vendor_id (§6.1).
 * Dilanggar = baris yatim yang tidak akan pernah terbaca oleh query mana pun.
 */
function pastikanScopeKonsisten(
  scope:    TeamContactScope,
  tenantId: string | null,
  vendorId: string | null
): void {
  if (!SCOPE_VALID.includes(scope)) {
    throw new Error(`Scope tidak dikenal: ${scope}`)
  }
  if (scope === 'super_admin' && tenantId !== null) {
    throw new Error('Kontak tim SuperAdmin tidak boleh terikat ke tenant (tenant_id wajib kosong)')
  }
  if (scope === 'admin_tenant' && !tenantId) {
    throw new Error('Kontak scope admin_tenant wajib menyertakan tenant_id')
  }
  if (scope === 'vendor' && !vendorId) {
    throw new Error('Kontak scope vendor wajib menyertakan vendor_id')
  }
  if (scope !== 'vendor' && vendorId !== null) {
    throw new Error('vendor_id hanya boleh terisi untuk kontak scope vendor')
  }
}

function pastikanNamaTerisi(nama: string): void {
  if (!nama || nama.trim().length === 0) {
    throw new Error('Nama kontak wajib diisi')
  }
}

// ─── Normalisasi nomor telepon SEBELUM disimpan (S#424) ─────────────────────────────
/**
 * `TEMUAN-TELEPON-TEAMCONTACTS-BUKAN-62` — ditemukan S#424, ditutup di sesi yang sama atas
 * tagihan Philips (*"2 temuan itu kapan kamu mau selesaikan atau di biarkan terus saja"*).
 *
 * **Masalahnya:** baris pertama tabel ini menyimpan `08164851879`, sedangkan standar platform
 * adalah `62xxx` (ditegakkan `validateNomorWa` di `validation.server.ts`, dipakai TenantService).
 * Route S#423 memakai DTO Zod tapi TIDAK menegakkan format itu, jadi dua format hidup
 * berdampingan — kelas persis ATURAN 41 (nilai `role` uppercase vs lowercase).
 *
 * **Kenapa berbahaya:** setiap konsumen baru harus menormalkan sendiri. `buildBugWaLink()`
 * sudah terpaksa melakukannya saat merender tautan. Menambal di konsumen = tambalan berulang
 * tanpa akhir; yang benar adalah data masuk sudah bersih.
 *
 * **Nol fungsi baru (ATURAN 19):** memakai ulang `normalkanNomorWaLink()` dari `wa-link.util.ts`
 * — satu-satunya normalisasi nomor di repo ini yang server-safe DAN bebas dependensi berat.
 *
 * Kosong dibiarkan kosong (kolom opsional). Terisi tapi tidak layak → DITOLAK, supaya data kotor
 * tidak pernah mendarat.
 */
function normalkanTeleponUntukSimpan(telepon: string | null | undefined): string | null {
  const mentah = (telepon ?? '').trim()
  if (!mentah) return null

  const rapi = normalkanNomorWaLink(mentah)
  if (!rapi) {
    throw new Error(
      `Nomor telepon tidak sah: "${mentah}". Gunakan format 08xxx, 8xxx, atau 62xxx (10–15 digit).`
    )
  }
  return rapi
}

// ─── Helper internal: baris mentah → baris siap-render ────────────────────────
/**
 * Ubah daftar baris mentah (SUDAH terurut dari repository) menjadi baris tabel SA.
 *
 * `prioritas` = POSISI ORDINAL (index + 1), BUKAN `sort_order`. Merender `sort_order`
 * mentah di kolom itu = menampilkan 10/20/30 ke SA padahal mockup menjanjikan 1/2/3.
 */
function keBarisTabel(rows: TeamContactRow[]): KontakTimBaris[] {
  const total = rows.length
  return rows.map((r, i) => ({
    id:                  r.id,
    prioritas:           i + 1,
    nama:                r.nama,
    telepon:             r.telepon,
    email:               r.email,
    jabatan:             r.jabatan,
    publishBugDashboard:         r.publish_bug_dashboard,
    publishDashboardAdminTenant: r.publish_dashboard_admin_tenant,
    publishPublicWebsite:        r.publish_public_website,
    isActive:            r.is_active,
    isPertama:           i === 0,
    isTerakhir:          i === total - 1,
  }))
}

// ─── FUNGSI 1: TeamContactService_list ────────────────────────────────────────
/**
 * Daftar kontak siap-render untuk tabel kelola di Dashboard SA.
 * Urutan sudah ditentukan repository (`sort_order ASC, created_at ASC`).
 */
export async function TeamContactService_list(
  scope:    TeamContactScope = 'super_admin',
  tenantId: string | null    = null
): Promise<KontakTimBaris[]> {
  const rows = await TeamContactRepo_findAll(scope, tenantId)
  return keBarisTabel(rows)
}

// ─── FUNGSI 2: TeamContactService_create ──────────────────────────────────────
/**
 * Tambah satu kontak. `sort_order` DIHITUNG DI SINI: `max + 10` (K-420-5).
 * SA tidak pernah mengirim angka urutan — kalau UI mengirimnya, angka itu diabaikan
 * karena `BuatKontakTimPayload` memang tidak punya field `sort_order`.
 */
export async function TeamContactService_create(
  payload: BuatKontakTimPayload,
  olehUid: string
): Promise<TeamContactRow> {
  pastikanNamaTerisi(payload.nama)
  pastikanJabatanSah(payload.jabatan)
  pastikanScopeKonsisten(payload.scope, payload.tenant_id, payload.vendor_id)

  const max       = await TeamContactRepo_findMaxSortOrder(payload.scope, payload.tenant_id)
  const sortOrder = max + JENJANG

  // Aset dipakai ulang (K-420-3): melempar Error kalau bukan bilangan bulat non-negatif.
  validateSortOrder(sortOrder)

  return TeamContactRepo_insert(
    {
      ...payload,
      nama:    payload.nama.trim(),
      telepon: normalkanTeleponUntukSimpan(payload.telepon),
    },
    sortOrder,
    olehUid
  )
}

// ─── FUNGSI 3: TeamContactService_update ──────────────────────────────────────
/**
 * Ubah sebagian field satu kontak. `scope` / `tenant_id` / `vendor_id` / `sort_order`
 * SENGAJA tidak bisa diubah lewat sini — memindahkan kontak antar-scope adalah operasi
 * lain yang belum disepakati, dan urutan hanya berubah lewat tombol panah (FUNGSI 5).
 */
export async function TeamContactService_update(
  id:      string,
  payload: UbahKontakTimPayload,
  olehUid: string
): Promise<TeamContactRow> {
  const existing = await TeamContactRepo_findById(id)
  if (!existing) {
    throw new Error(`Kontak tidak ditemukan: ${id}`)
  }

  if (payload.nama    !== undefined) pastikanNamaTerisi(payload.nama)
  if (payload.jabatan !== undefined) pastikanJabatanSah(payload.jabatan)

  const bersih: UbahKontakTimPayload = {
    ...payload,
    ...(payload.nama !== undefined ? { nama: payload.nama.trim() } : {}),
    // Normalisasi telepon HANYA kalau field-nya memang dikirim — ini update PARSIAL,
    // dan menyentuh field yang tidak dikirim akan menimpa data lama dengan null.
    ...(payload.telepon !== undefined
      ? { telepon: normalkanTeleponUntukSimpan(payload.telepon) }
      : {}),
  }

  return TeamContactRepo_update(id, bersih, olehUid)
}

// ─── FUNGSI 4: TeamContactService_delete ──────────────────────────────────────
/** Hapus lunak satu kontak. Baris tetap ada untuk audit (KONSEP_BISNIS Keputusan 5). */
export async function TeamContactService_delete(
  id:      string,
  olehUid: string
): Promise<void> {
  const existing = await TeamContactRepo_findById(id)
  if (!existing) {
    throw new Error(`Kontak tidak ditemukan: ${id}`)
  }
  await TeamContactRepo_softDelete(id, olehUid)
}

// ─── FUNGSI 5: TeamContactService_geser ───────────────────────────────────────
/**
 * Geser prioritas satu kontak satu langkah naik/turun.
 *
 * Menyentuh TEPAT 2 BARIS (keputusan mockup S#421 #2): nilai `sort_order` baris ini
 * ditukar dengan nilai milik baris tetangga. Tidak ada penomoran ulang seluruh tabel.
 *
 * Di ujung daftar (sudah paling atas / paling bawah) fungsi ini TIDAK melempar Error —
 * ia berhenti diam-diam, karena UI sudah menonaktifkan tombolnya lewat `isPertama` /
 * `isTerakhir`, dan melempar galat untuk klik yang tidak berbahaya hanya membingungkan SA.
 *
 * @returns true bila ada perubahan, false bila sudah di ujung daftar
 */
export async function TeamContactService_geser(
  payload:  GeserKontakTimPayload,
  olehUid:  string,
  scope:    TeamContactScope = 'super_admin',
  tenantId: string | null    = null
): Promise<boolean> {
  const existing = await TeamContactRepo_findById(payload.id)
  if (!existing) {
    throw new Error(`Kontak tidak ditemukan: ${payload.id}`)
  }

  const rows  = await TeamContactRepo_findAll(scope, tenantId)
  const index = rows.findIndex((r) => r.id === payload.id)
  if (index === -1) {
    throw new Error(`Kontak ${payload.id} tidak berada di scope ${scope}`)
  }

  const indexTetangga = payload.arah === 'naik' ? index - 1 : index + 1
  if (indexTetangga < 0 || indexTetangga >= rows.length) {
    return false // sudah di ujung — bukan galat
  }

  const ini      = rows[index]
  const tetangga = rows[indexTetangga]

  // Kasus normal: kedua nilai berbeda → tukar lurus.
  let nilaiUntukIni      = tetangga.sort_order
  let nilaiUntukTetangga = ini.sort_order

  // Kasus seri: kedua baris punya sort_order sama (hanya mungkin bila baris disisipkan
  // di luar service ini — DEFAULT 0 di DB). Menukar nilai yang sama = tidak terjadi apa-apa,
  // dan SA akan mengira tombolnya rusak. Karena rung berjarak 10, menggeser 1 satuan aman:
  // baris yang naik diberi nilai satu di bawah tetangganya, dan sebaliknya.
  if (ini.sort_order === tetangga.sort_order) {
    if (payload.arah === 'naik') {
      nilaiUntukIni      = Math.max(tetangga.sort_order - 1, 0)
      nilaiUntukTetangga = tetangga.sort_order
    } else {
      nilaiUntukIni      = tetangga.sort_order + 1
      nilaiUntukTetangga = tetangga.sort_order
    }
  }

  validateSortOrder(nilaiUntukIni)
  validateSortOrder(nilaiUntukTetangga)

  await TeamContactRepo_updateSortOrder(ini.id, nilaiUntukIni, olehUid)
  await TeamContactRepo_updateSortOrder(tetangga.id, nilaiUntukTetangga, olehUid)

  return true
}

// ─── FUNGSI 6: TeamContactService_getKontakTujuan ─────────────────────────────
/**
 * Alamat tujuan tautan "hubungi tim kami" untuk satu target (§6.3).
 *
 * Mengambil kontak terpublikasi PERTAMA menurut `sort_order ASC, created_at ASC`.
 *
 * **Return `null` = TIDAK ADA alamat**, dan pemanggil WAJIB tidak menampilkan ajakan
 * menghubungi sama sekali. Ini aturan §6.3 — *"tidak ada ajakan menghubungi tanpa alamat
 * di baliknya"* — dan justru aturan inilah yang mencegah HUTANG-LOOP-KONTAK-MAINTENANCE
 * lahir kembali. Dua keadaan menghasilkan `null`: daftar kontak kosong, ATAU ada kontak
 * tetapi nol yang dicentang untuk target itu.
 *
 * @param target - TIGA kanal sejak S#454 (K-454-4):
 *                 'bug_dashboard'          (halaman error Dashboard SA + AT — INTERNAL)
 *               | 'dashboard_admin_tenant' (halaman maintenance Dashboard AT — INTERNAL, wajib login)
 *               | 'public_website'         (halaman publik Website — siapa saja)
 */
export async function TeamContactService_getKontakTujuan(
  target:   TargetPublikasi,
  scope:    TeamContactScope = 'super_admin',
  tenantId: string | null    = null
): Promise<KontakTerpublikasi | null> {
  const rows = await TeamContactRepo_findPublished(target, scope, tenantId)
  const first = rows[0]
  if (!first) return null

  return {
    nama:    first.nama,
    email:   first.email,
    telepon: first.telepon,
    jabatan: first.jabatan,
  }
}
