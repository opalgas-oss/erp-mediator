// lib/repositories/team-contact.repository.ts
// Repository Direktori Kontak Tim Tahap A (tabel team_contacts, 19 kolom).
// Dipakai oleh: team-contact.service.ts
// Dibuat: Sesi #423 — Direktori Kontak Tim Tahap A, FASE 3.3
//
// Layer Repository (3-layer: Route → Service → Repository). HANYA query DB di sini.
// NOL logika bisnis: jenjang sort_order (max+10), penukaran posisi, dan pemilihan
// kontak tujuan email semuanya dihitung di Service — bukan di sini.
//
// Acuan: Shared_Database/Schema_TeamContacts.md
//        03_Architecture/00_Global/DESAIN_MAINTENANCE_DAN_KONTAK_TIM.md §6.1 + §6.3
//
// AREA RAWAN yang dijaga di file ini:
//   · Subquery PostgREST DILARANG (BUG-038) → semua query = filter datar + order
//   · `is_active`, BUKAN `is_aktif` (BUG-039)
//   · Soft delete: setiap pembacaan WAJIB `.is('deleted_at', null)`
//   · NOL `catch {}` kosong (BUG-034 · BUG-038) → galat dilempar dengan konteks
//
// RLS: team_contacts RLS ENABLED dengan NOL policy `anon`. createServerSupabaseClient()
//      memakai SERVICE_ROLE key (rolbypassrls=true), jadi pembacaan kontak terpublikasi
//      untuk halaman maintenance publik SAH dilakukan dari server — dan HANYA dari server.
//
// Catatan konvensi (keputusan teknis S#423): nama fungsi memakai awalan PascalCase
// `TeamContactRepo_*` mengikuti konvensi repository terbaru yang hidup di kode
// (`DashboardMenuRepo_*`, S#254), bukan `teamContactRepo_*` yang tertulis di rencana
// FASE 1.2 S#419. Hanya kapitalisasi yang berubah; cakupan fungsinya sama persis dengan
// yang sudah lolos cek duplikasi registry FASE 2 (K-420-2).

import 'server-only'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import type {
  TeamContactRow,
  TeamContactScope,
  BuatKontakTimPayload,
  UbahKontakTimPayload,
} from '@/lib/types/team-contact.types'

// Daftar kolom eksplisit — hindari `select('*')` supaya penambahan kolom di DB
// tidak diam-diam mengubah bentuk data yang mengalir ke service.
const KOLOM = [
  'id',
  'scope',
  'tenant_id',
  'vendor_id',
  'user_id',
  'nama',
  'telepon',
  'email',
  'jabatan',
  'publish_bug_dashboard',
  'publish_dashboard_admin_tenant',
  'publish_public_website',
  'is_active',
  'sort_order',
  'created_at',
  'created_by',
  'updated_at',
  'updated_by',
  'deleted_at',
  'deleted_by',
].join(', ')

/**
 * Target publikasi — menentukan kolom penanda mana yang difilter.
 * TIGA kanal sejak S#454 (K-454-4):
 *   'bug_dashboard'        — KANAL 1, INTERNAL: halaman error Dashboard SA + AT
 *   'dashboard_admin_tenant' — KANAL 2, INTERNAL: halaman maintenance Dashboard AT (wajib login AT)
 *   'public_website'       — KANAL 3, PUBLIK: halaman Website yang bisa dibuka siapa saja
 * ⛔ 'public_page' (nama lama) DICABUT S#454 — ia menamai ruang lingkup yang salah (K-450-6:
 *   kata "publik" dilarang berdiri sendiri). Kolom lamanya masih ada di Supabase tetapi
 *   sudah tidak dibaca kode ini (pola expand-migrate-contract); DROP di sesi berikutnya.
 */
export type TargetPublikasi = 'bug_dashboard' | 'dashboard_admin_tenant' | 'public_website'

/** Peta target → kolom penanda di Supabase. Satu-satunya tempat pemetaan ini hidup. */
const KOLOM_TARGET: Record<TargetPublikasi, string> = {
  bug_dashboard:          'publish_bug_dashboard',
  dashboard_admin_tenant: 'publish_dashboard_admin_tenant',
  public_website:         'publish_public_website',
}

// ─── FUNGSI 1: TeamContactRepo_findAll ────────────────────────────────────────
/**
 * Ambil semua kontak satu scope yang belum di-soft-delete — untuk tabel kelola SA.
 * TIDAK memfilter `is_active`: SA wajib melihat kontak nonaktif supaya bisa
 * mengaktifkannya kembali (pola S#110, sama dengan config_registry).
 *
 * Urutan `sort_order ASC, created_at ASC`. Pemecah seri `created_at` WAJIB karena
 * `sort_order` lahir DEFAULT 0 — tanpa itu urutan baris bisa berganti antar-request.
 *
 * @param scope    - 'super_admin' | 'admin_tenant' | 'vendor'
 * @param tenantId - NULL untuk tim SA; wajib terisi untuk scope 'admin_tenant'
 */
export async function TeamContactRepo_findAll(
  scope:    TeamContactScope,
  tenantId: string | null = null
): Promise<TeamContactRow[]> {
  const db = createServerSupabaseClient()

  let q = db
    .from('team_contacts')
    .select(KOLOM)
    .eq('scope', scope)
    .is('deleted_at', null)

  q = tenantId === null ? q.is('tenant_id', null) : q.eq('tenant_id', tenantId)

  const { data, error } = await q
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`TeamContactRepo_findAll(${scope}): ${error.message}`)
  }
  return (data ?? []) as unknown as TeamContactRow[]
}

// ─── FUNGSI 2: TeamContactRepo_findById ───────────────────────────────────────
/**
 * Ambil satu kontak berdasarkan id. Return null kalau tidak ada atau sudah dihapus.
 * Dipakai service untuk memastikan baris ada sebelum ubah/hapus/geser.
 */
export async function TeamContactRepo_findById(
  id: string
): Promise<TeamContactRow | null> {
  const db = createServerSupabaseClient()
  const { data, error } = await db
    .from('team_contacts')
    .select(KOLOM)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) {
    throw new Error(`TeamContactRepo_findById(${id}): ${error.message}`)
  }
  return (data ?? null) as unknown as TeamContactRow | null
}

// ─── FUNGSI 3: TeamContactRepo_findMaxSortOrder ───────────────────────────────
/**
 * Ambil nilai `sort_order` tertinggi dalam satu scope. Return 0 kalau belum ada baris.
 * Service memakainya untuk menghitung jenjang berikutnya (max + 10, K-420-5).
 * Penghitungannya sendiri BUKAN urusan repository.
 */
export async function TeamContactRepo_findMaxSortOrder(
  scope:    TeamContactScope,
  tenantId: string | null = null
): Promise<number> {
  const db = createServerSupabaseClient()

  let q = db
    .from('team_contacts')
    .select('sort_order')
    .eq('scope', scope)
    .is('deleted_at', null)

  q = tenantId === null ? q.is('tenant_id', null) : q.eq('tenant_id', tenantId)

  const { data, error } = await q
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(`TeamContactRepo_findMaxSortOrder(${scope}): ${error.message}`)
  }
  return data?.sort_order ?? 0
}

// ─── FUNGSI 4: TeamContactRepo_insert ─────────────────────────────────────────
/**
 * Sisipkan satu kontak baru. `sortOrder` DIHITUNG SERVICE dan dioper ke sini —
 * repository tidak pernah menentukan angkanya sendiri.
 */
export async function TeamContactRepo_insert(
  payload:   BuatKontakTimPayload,
  sortOrder: number,
  olehUid:   string
): Promise<TeamContactRow> {
  const db = createServerSupabaseClient()
  const { data, error } = await db
    .from('team_contacts')
    .insert({
      scope:                 payload.scope,
      tenant_id:             payload.tenant_id,
      vendor_id:             payload.vendor_id,
      user_id:               payload.user_id,
      nama:                  payload.nama,
      telepon:               payload.telepon,
      email:                 payload.email,
      jabatan:               payload.jabatan,
      publish_bug_dashboard:          payload.publish_bug_dashboard,
      publish_dashboard_admin_tenant: payload.publish_dashboard_admin_tenant,
      publish_public_website:         payload.publish_public_website,
      is_active:             true,
      sort_order:            sortOrder,
      created_by:            olehUid,
      updated_by:            olehUid,
    })
    .select(KOLOM)
    .single()

  if (error) {
    throw new Error(`TeamContactRepo_insert(${payload.email}): ${error.message}`)
  }
  return data as unknown as TeamContactRow
}

// ─── FUNGSI 5: TeamContactRepo_update ─────────────────────────────────────────
/**
 * Perbarui sebagian field satu kontak. Hanya field yang benar-benar dikirim yang
 * masuk ke perintah UPDATE — field yang `undefined` tidak disentuh.
 * `sort_order` SENGAJA tidak bisa diubah lewat fungsi ini (lihat FUNGSI 7).
 */
export async function TeamContactRepo_update(
  id:      string,
  payload: UbahKontakTimPayload,
  olehUid: string
): Promise<TeamContactRow> {
  const db = createServerSupabaseClient()

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    updated_by: olehUid,
  }
  if (payload.nama                  !== undefined) patch.nama                  = payload.nama
  if (payload.telepon               !== undefined) patch.telepon               = payload.telepon
  if (payload.email                 !== undefined) patch.email                 = payload.email
  if (payload.jabatan               !== undefined) patch.jabatan               = payload.jabatan
  if (payload.publish_bug_dashboard !== undefined) patch.publish_bug_dashboard = payload.publish_bug_dashboard
  if (payload.publish_dashboard_admin_tenant !== undefined) patch.publish_dashboard_admin_tenant = payload.publish_dashboard_admin_tenant
  if (payload.publish_public_website         !== undefined) patch.publish_public_website         = payload.publish_public_website
  if (payload.is_active             !== undefined) patch.is_active             = payload.is_active

  const { data, error } = await db
    .from('team_contacts')
    .update(patch)
    .eq('id', id)
    .is('deleted_at', null)
    .select(KOLOM)
    .single()

  if (error) {
    throw new Error(`TeamContactRepo_update(${id}): ${error.message}`)
  }
  return data as unknown as TeamContactRow
}

// ─── FUNGSI 6: TeamContactRepo_softDelete ─────────────────────────────────────
/**
 * Hapus lunak satu kontak — isi `deleted_at` + `deleted_by`. Baris TIDAK dibuang
 * dari tabel (Keputusan 5 KONSEP_BISNIS: soft delete wajib untuk tabel bisnis).
 */
export async function TeamContactRepo_softDelete(
  id:      string,
  olehUid: string
): Promise<void> {
  const db = createServerSupabaseClient()
  const now = new Date().toISOString()

  const { error } = await db
    .from('team_contacts')
    .update({
      deleted_at: now,
      deleted_by: olehUid,
      updated_at: now,
      updated_by: olehUid,
    })
    .eq('id', id)
    .is('deleted_at', null)

  if (error) {
    throw new Error(`TeamContactRepo_softDelete(${id}): ${error.message}`)
  }
}

// ─── FUNGSI 7: TeamContactRepo_updateSortOrder ────────────────────────────────
/**
 * Tulis satu nilai `sort_order` ke satu baris.
 *
 * Menggeser prioritas = TUKAR nilai dengan baris tetangga → service memanggil fungsi
 * ini DUA KALI (keputusan mockup S#421 #2). Repository sengaja hanya tahu satu baris;
 * pasangan mana yang ditukar adalah keputusan service.
 */
export async function TeamContactRepo_updateSortOrder(
  id:        string,
  sortOrder: number,
  olehUid:   string
): Promise<void> {
  const db = createServerSupabaseClient()
  const { error } = await db
    .from('team_contacts')
    .update({
      sort_order: sortOrder,
      updated_at: new Date().toISOString(),
      updated_by: olehUid,
    })
    .eq('id', id)
    .is('deleted_at', null)

  if (error) {
    throw new Error(`TeamContactRepo_updateSortOrder(${id}): ${error.message}`)
  }
}

// ─── FUNGSI 8: TeamContactRepo_findPublished ──────────────────────────────────
/**
 * Ambil kontak yang BOLEH dipublikasikan untuk satu target, terurut siap-pakai.
 * Inilah sumber alamat tujuan tautan "hubungi tim kami".
 *
 * Filter datar (NOL subquery — BUG-038):
 *   scope = scope · tenant_id sesuai · deleted_at IS NULL · is_active = true ·
 *   kolom penanda publikasi target = true
 *
 * Urutan `sort_order ASC, created_at ASC` — service mengambil yang PERTAMA sebagai
 * alamat tujuan. Kalau hasilnya KOSONG, service WAJIB tidak menampilkan ajakan
 * menghubungi sama sekali (§6.3: tidak ada ajakan menghubungi tanpa alamat di baliknya).
 */
export async function TeamContactRepo_findPublished(
  target:   TargetPublikasi,
  scope:    TeamContactScope = 'super_admin',
  tenantId: string | null    = null
): Promise<TeamContactRow[]> {
  const db = createServerSupabaseClient()
  const kolomTarget = KOLOM_TARGET[target]

  let q = db
    .from('team_contacts')
    .select(KOLOM)
    .eq('scope', scope)
    .eq('is_active', true)
    .eq(kolomTarget, true)
    .is('deleted_at', null)

  q = tenantId === null ? q.is('tenant_id', null) : q.eq('tenant_id', tenantId)

  const { data, error } = await q
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`TeamContactRepo_findPublished(${target}): ${error.message}`)
  }
  return (data ?? []) as unknown as TeamContactRow[]
}
