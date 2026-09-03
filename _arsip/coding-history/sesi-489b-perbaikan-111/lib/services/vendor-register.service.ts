// lib/services/vendor-register.service.ts
// Pendaftaran vendor publik — Tahap 1 (Opsi B). Dibuat: Sesi #486.
// Rumah spesifikasinya: Arsitektur_Project/02_Functional/01_Auth_Akses/SPEK_FORMULIR_REGISTER_VENDOR_v1.md
//
// 🔴 SERVER YANG MENEGAKKAN SAKLAR SA, BUKAN LAYAR (SPEK §3 K6). Kolom yang tidak `is_visible`
//   atau tidak `is_active` DIBUANG di sini — jawaban untuknya tidak pernah ditulis, sekalipun
//   dikirim. Tanpa ini, saklar di layar SuperAdmin hanya hiasan.
// 🔴 Nol nilai kebijakan dibekukan: status awal & tenant pendaftar dibaca dari Config Registry.

import 'server-only'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getConfigValue }             from '@/lib/config-registry'
import { getFormFieldsUntukFormulir } from '@/lib/services/form-field-registry.service'
import { getOpsiUntukKolom, saringKolomYangBisaDirender } from '@/lib/services/form-field-opsi.service'
import { validasiSemuaKolom }         from '@/lib/utils/validasi-form-field.util'
import { findByEmail }                from '@/lib/repositories/user.repository'
import {
  VendorRegisterRepo_buatSubmission,
  VendorRegisterRepo_simpanJawaban,
  VendorRegisterRepo_hapusSubmission,
} from '@/lib/repositories/vendor-register.repository'
import type { BarisJawaban } from '@/lib/repositories/vendor-register.repository'
import type { FormFieldRow } from '@/lib/types/form-field-registry.types'
import type {
  HasilPendaftaranVendor,
  NilaiJawaban,
  OpsiPilihan,
  VendorRegisterPayload,
} from '@/lib/types/vendor-register.types'

export const FORM_KEY_VENDOR = 'register_vendor'
export const FEATURE_KEY_VENDOR = 'register_vendor'

/**
 * Tipe kolom yang Tahap 1 sanggup render. `file` dan `image` sengaja BELUM didukung —
 * belum ada tempat penyimpanan berkas (SPEK §1). Kalau SA menyalakannya, kolomnya dilewati
 * dengan catatan log, ⛔ bukan membuat formulir buntu.
 */
const TIPE_DIDUKUNG_TAHAP_1 = ['text', 'textarea', 'number', 'boolean', 'select', 'multiselect', 'date']

export interface SusunanFormulir {
  kolom: FormFieldRow[]
  opsi:  Record<string, OpsiPilihan[]>
}

/**
 * Susunan kolom yang benar-benar berlaku: aktif + tampil (dari Field Registry), tipenya didukung,
 * dan — untuk kolom pilihan — sumber opsinya benar-benar berisi.
 * ⇒ Layar dan server memakai fungsi yang SAMA, jadi keduanya tidak mungkin berbeda pendapat.
 */
export async function getSusunanFormulirVendor(): Promise<SusunanFormulir> {
  const grup   = await getFormFieldsUntukFormulir(FORM_KEY_VENDOR)
  const semua  = grup.flatMap((g) => g.fields)

  const didukung = semua.filter((k) => {
    if (TIPE_DIDUKUNG_TAHAP_1.includes(k.tipe_input)) return true
    console.warn(`[vendor-register] tipe "${k.tipe_input}" belum didukung ⇒ kolom "${k.field_key}" dilewati`)
    return false
  })

  const opsi  = await getOpsiUntukKolom(didukung)
  const kolom = saringKolomYangBisaDirender(didukung, opsi)
  return { kolom, opsi }
}

/** Kelompokkan untuk layar, urutan kelompok mengikuti kemunculan pertama (urutan sudah terurut). */
export function kelompokkanKolom(kolom: FormFieldRow[]): { group_key: string; fields: FormFieldRow[] }[] {
  const peta = new Map<string, FormFieldRow[]>()
  for (const k of kolom) {
    if (!peta.has(k.group_key)) peta.set(k.group_key, [])
    peta.get(k.group_key)!.push(k)
  }
  return Array.from(peta.entries()).map(([group_key, fields]) => ({ group_key, fields }))
}

function keBarisJawaban(kolom: FormFieldRow[], jawaban: Record<string, NilaiJawaban>): BarisJawaban[] {
  const baris: BarisJawaban[] = []
  for (const k of kolom) {
    const nilai = jawaban[k.field_key]
    if (nilai === undefined || nilai === null) continue
    if (Array.isArray(nilai)) {
      if (nilai.length === 0) continue
      baris.push({ field_key: k.field_key, nilai: null, nilai_json: nilai })
      continue
    }
    if (typeof nilai === 'boolean') {
      baris.push({ field_key: k.field_key, nilai: nilai ? 'true' : 'false', nilai_json: null })
      continue
    }
    const teks = String(nilai).trim()
    if (teks.length === 0) continue
    baris.push({ field_key: k.field_key, nilai: teks, nilai_json: null })
  }
  return baris
}

export interface GagalPendaftaran { pesan: string; galatKolom?: Record<string, string> }

/**
 * Jalankan pendaftaran. Urutan + pemulihannya menyalin pola `admin-tenant-create.service.ts`:
 * akun auth → user_profiles → submission → jawaban; gagal di mana pun ⇒ akun dihapus lagi
 * supaya tidak lahir akun yatim yang menghalangi pendaftar mencoba ulang.
 * ⛔ Nol sesi dibuat: pendaftar tidak pernah login selagi statusnya belum disetujui.
 */
export async function daftarVendor(
  payload: VendorRegisterPayload,
  tenantIdDariDomain?: string | null,
): Promise<HasilPendaftaranVendor> {
  const { kolom } = await getSusunanFormulirVendor()

  // 1) Jawaban disaring ke kolom yang benar-benar berlaku — sisanya dibuang tanpa dicatat.
  const jawaban: Record<string, NilaiJawaban> = {}
  const kunciSah = new Set(kolom.map((k) => k.field_key))
  for (const j of payload.jawaban) {
    if (kunciSah.has(j.field_key)) jawaban[j.field_key] = j.nilai
  }

  // 2) Validasi ulang di server — layar boleh dilewati, ini tidak.
  const galatKolom = validasiSemuaKolom(kolom, jawaban)
  if (Object.keys(galatKolom).length > 0) {
    const gagal: GagalPendaftaran = { pesan: 'Ada isian yang belum benar', galatKolom }
    throw Object.assign(new Error(gagal.pesan), gagal)
  }

  // 3) Persetujuan: ketiganya wajib, ⛔ nol yang boleh dianggap tercentang.
  const { snk, data_pribadi, pasal_3_3 } = payload.persetujuan
  if (!snk || !data_pribadi || !pasal_3_3) {
    throw new Error('Ketiga pernyataan persetujuan wajib dicentang')
  }

  // 4) Email belum boleh terdaftar.
  const emailNormal = payload.akun.email.trim().toLowerCase()
  const sudahAda = await findByEmail(emailNormal)
  if (sudahAda) throw new Error('Email sudah terdaftar. Gunakan email lain atau masuk.')

  // 5) Nilai kebijakan dari Config Registry — ⛔ bukan dari kode.
  const [statusAwal, versiTeks, tenantConfig] = await Promise.all([
    getConfigValue(FEATURE_KEY_VENDOR, 'status_awal_pendaftar', 'pending'),
    getConfigValue(FEATURE_KEY_VENDOR, 'versi_teks_persetujuan'),
    getConfigValue(FEATURE_KEY_VENDOR, 'tenant_id_pendaftar_publik'),
  ])
  const tenantId = tenantIdDariDomain ?? tenantConfig
  if (!tenantId) {
    throw new Error('Konfigurasi tenant pendaftar publik belum diisi — hubungi pengelola')
  }

  const db = createServerSupabaseClient()

  // 6) Akun auth (server-only, service_role). Pendaftar TIDAK di-login-kan.
  const { data: authData, error: authError } = await db.auth.admin.createUser({
    email:         emailNormal,
    password:      payload.akun.password,
    email_confirm: false,
    user_metadata: { nama: payload.akun.nama.trim(), nomor_wa: payload.akun.nomor_wa.trim() },
  })
  if (authError || !authData?.user) {
    throw new Error(authError?.message ?? 'Gagal membuat akun')
  }
  const userId = authData.user.id

  try {
    const { error: galatProfil } = await db.from('user_profiles').insert({
      id:               userId,
      tenant_id:        tenantId,
      email:            emailNormal,
      nama:             payload.akun.nama.trim(),
      nomor_wa:         payload.akun.nomor_wa.trim(),
      role:             'vendor',
      register_status:  statusAwal ?? 'pending',
      lifecycle_status: 'in_registration',
    })
    if (galatProfil) throw new Error(galatProfil.message)

    const submissionId = await VendorRegisterRepo_buatSubmission({
      user_id:                userId,
      tenant_id:              tenantId,
      form_key:               FORM_KEY_VENDOR,
      status:                 statusAwal ?? 'pending',
      versi_teks_persetujuan: versiTeks,
      kanal:                  'web',
      persetujuan:            payload.persetujuan,
    })

    try {
      await VendorRegisterRepo_simpanJawaban(submissionId, keBarisJawaban(kolom, jawaban))
    } catch (err) {
      await VendorRegisterRepo_hapusSubmission(submissionId)
      throw err
    }

    return { submission_id: submissionId, status: statusAwal ?? 'pending' }
  } catch (err) {
    await db.auth.admin.deleteUser(userId).catch((e) =>
      console.error('[vendor-register.service] rollback deleteUser gagal:', e),
    )
    throw err
  }
}
