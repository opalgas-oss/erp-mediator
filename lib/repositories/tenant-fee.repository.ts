// lib/repositories/tenant-fee.repository.ts
// Repository: Fee Structure Engine — tenant_fees + tenant_fee_history
// Dibuat: Sesi #319 — Fee Structure Engine (anti-hardcode)
// Layer: Repository (query Supabase langsung — tidak ada RSC query direct)

import { createServerSupabaseClient } from '@/lib/supabase-server'
import type {
  TenantFee,
  TenantFeeHistory,
  FeeAktif,
  FeeDefault,
  FeeNilaiSnapshot,
  TambahFeePayload,
  FeeListResponse,
  FeeHistoryResponse,
} from '@/lib/types/tenant-fee.types'

// ─── Helper: baca fee default dari config_registry ───────────────────────────

export async function feeRepo_getDefault(): Promise<FeeDefault> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('config_registry')
    .select('policy_key, nilai')
    .eq('feature_key', 'fee_default')
    .is('tenant_id', null)

  if (error) throw new Error(`feeRepo_getDefault: ${error.message}`)

  const numMap: Record<string, number> = {}
  const strMap: Record<string, string> = {}
  for (const row of data ?? []) {
    const asNum = parseFloat(row.nilai)
    if (!isNaN(asNum)) {
      numMap[row.policy_key] = asNum
    } else {
      strMap[row.policy_key] = row.nilai
    }
  }

  return {
    komisi_persen:     numMap['komisi_persen']     ?? 8,
    proses_flat:       numMap['proses_flat']       ?? 1250,
    gateway_persen:    numMap['gateway_persen']    ?? 0.7,
    gateway_flat:      numMap['gateway_flat']      ?? 500,
    ppn_persen:        numMap['ppn_persen']        ?? 11,
    fee_berlaku_mulai: strMap['fee_berlaku_mulai'] ?? '2026-01-01',  // fallback hanya jika baris DB belum ada
  }
}

// ─── Helper: baca fee aktif tenant (override atau fallback default) ───────────

export async function feeRepo_getAktif(tenantId: string): Promise<FeeListResponse> {
  const supabase = await createServerSupabaseClient()

  // 1. Baca override fee tenant (berlaku_mulai <= today, is_active = true)
  const today = new Date().toISOString().split('T')[0]

  const { data: rows, error } = await supabase
    .from('tenant_fees')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .lte('berlaku_mulai', today)
    .or(`berlaku_sampai.is.null,berlaku_sampai.gte.${today}`)
    .order('berlaku_mulai', { ascending: false })

  if (error) throw new Error(`feeRepo_getAktif: ${error.message}`)

  // 1b. Baca fee terjadwal (berlaku_mulai > today, is_active = true)
  const { data: rowsTerjadwal, error: errorTerjadwal } = await supabase
    .from('tenant_fees')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .gt('berlaku_mulai', today)
    .order('berlaku_mulai', { ascending: true })

  if (errorTerjadwal) throw new Error(`feeRepo_getAktif terjadwal: ${errorTerjadwal.message}`)

  // 2. Ambil fee default dari config_registry (selalu perlu untuk fallback)
  const feeDefault = await feeRepo_getDefault()

  // 3. Deduplicate — per fee_key ambil berlaku_mulai paling baru
  const seen = new Set<string>()
  const aktif: FeeAktif[] = []

  for (const row of (rows ?? []) as TenantFee[]) {
    if (seen.has(row.fee_key)) continue
    seen.add(row.fee_key)
    aktif.push({
      fee_key:        row.fee_key,
      nama_biaya:     row.nama_biaya,
      tipe:           row.tipe,
      nilai_persen:   row.nilai_persen,
      nilai_flat:     row.nilai_flat,
      nilai_maks:     row.nilai_maks,
      berlaku_untuk:  row.berlaku_untuk,
      ppn_inklusif:   row.ppn_inklusif,
      passthrough:    row.passthrough,
      berlaku_mulai:  row.berlaku_mulai,
      berlaku_sampai: row.berlaku_sampai,
      sumber:         'tenant_override',
      fee_id:         row.id,
    })
  }

  // 4. Untuk fee_key yang tidak punya override, sisipkan dari platform default
  const PLATFORM_DEFAULTS: FeeAktif[] = [
    {
      fee_key:        'komisi_platform',
      nama_biaya:     'Komisi platform',
      tipe:           'persen',
      nilai_persen:   feeDefault.komisi_persen,
      nilai_flat:     null,
      nilai_maks:     null,
      berlaku_untuk:  'per_transaksi',
      ppn_inklusif:   true,
      passthrough:    false,
      berlaku_mulai:  feeDefault.fee_berlaku_mulai,
      berlaku_sampai: null,
      sumber:         'platform_default',
      fee_id:         null,
    },
    {
      fee_key:        'biaya_proses_order',
      nama_biaya:     'Biaya proses order',
      tipe:           'flat',
      nilai_persen:   null,
      nilai_flat:     feeDefault.proses_flat,
      nilai_maks:     null,
      berlaku_untuk:  'per_order',
      ppn_inklusif:   true,
      passthrough:    false,
      berlaku_mulai:  feeDefault.fee_berlaku_mulai,
      berlaku_sampai: null,
      sumber:         'platform_default',
      fee_id:         null,
    },
    {
      fee_key:        'gateway_xendit',
      nama_biaya:     'Biaya gateway Xendit',
      tipe:           'hybrid',
      nilai_persen:   feeDefault.gateway_persen,
      nilai_flat:     feeDefault.gateway_flat,
      nilai_maks:     null,
      berlaku_untuk:  'per_transaksi',
      ppn_inklusif:   false,
      passthrough:    false,
      berlaku_mulai:  feeDefault.fee_berlaku_mulai,
      berlaku_sampai: null,
      sumber:         'platform_default',
      fee_id:         null,
    },
    {
      fee_key:        'ppn_info',
      nama_biaya:     'PPN (informasi)',
      tipe:           'info',
      nilai_persen:   feeDefault.ppn_persen,
      nilai_flat:     null,
      nilai_maks:     null,
      berlaku_untuk:  'per_transaksi',
      ppn_inklusif:   true,
      passthrough:    false,
      berlaku_mulai:  feeDefault.fee_berlaku_mulai,
      berlaku_sampai: null,
      sumber:         'platform_default',
      fee_id:         null,
    },
  ]

  for (const def of PLATFORM_DEFAULTS) {
    if (!seen.has(def.fee_key)) {
      aktif.push(def)
      seen.add(def.fee_key)
    }
  }

  // Urutkan: komisi → proses → gateway → ppn → custom
  const ORDER: Record<string, number> = {
    komisi_platform:    0,
    biaya_proses_order: 1,
    gateway_xendit:     2,
    ppn_info:           3,
  }
  aktif.sort((a, b) =>
    (ORDER[a.fee_key] ?? 99) - (ORDER[b.fee_key] ?? 99)
  )

  // 5. Map baris terjadwal ke FeeAktif[]
  const terjadwal: FeeAktif[] = (rowsTerjadwal ?? []).map((row: TenantFee) => ({
    fee_key:        row.fee_key,
    nama_biaya:     row.nama_biaya,
    tipe:           row.tipe,
    nilai_persen:   row.nilai_persen,
    nilai_flat:     row.nilai_flat,
    nilai_maks:     row.nilai_maks,
    berlaku_untuk:  row.berlaku_untuk,
    ppn_inklusif:   row.ppn_inklusif,
    passthrough:    row.passthrough,
    berlaku_mulai:  row.berlaku_mulai,
    berlaku_sampai: row.berlaku_sampai,
    sumber:         'tenant_override',
    fee_id:         row.id,
  }))

  return { aktif, terjadwal, default: feeDefault }
}

// ─── GET riwayat fee tenant ───────────────────────────────────────────────────

export async function feeRepo_getHistory(
  tenantId: string,
  limit = 50,
  offset = 0,
): Promise<FeeHistoryResponse> {
  const supabase = await createServerSupabaseClient()

  const { data, error, count } = await supabase
    .from('tenant_fee_history')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('changed_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw new Error(`feeRepo_getHistory: ${error.message}`)

  return {
    data:  (data ?? []) as TenantFeeHistory[],
    total: count ?? 0,
  }
}

// ─── POST: tambah / jadwalkan fee baru ───────────────────────────────────────

export async function feeRepo_tambah(
  tenantId:  string,
  payload:   TambahFeePayload,
  changedBy: string,
): Promise<TenantFee> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('tenant_fees')
    .insert({
      tenant_id:      tenantId,
      fee_key:        payload.fee_key,
      nama_biaya:     payload.nama_biaya,
      tipe:           payload.tipe,
      nilai_persen:   payload.nilai_persen ?? null,
      nilai_flat:     payload.nilai_flat   ?? null,
      nilai_maks:     payload.nilai_maks   ?? null,
      berlaku_untuk:  payload.berlaku_untuk,
      ppn_inklusif:   payload.ppn_inklusif,
      passthrough:    payload.passthrough,
      berlaku_mulai:  payload.berlaku_mulai,
      berlaku_sampai: payload.berlaku_sampai ?? null,
      alasan:         payload.alasan ?? null,
      created_by:     changedBy,
    })
    .select()
    .single()

  if (error) throw new Error(`feeRepo_tambah: ${error.message}`)

  const fee = data as TenantFee

  // Catat ke history
  const snapshot: FeeNilaiSnapshot = {
    tipe:          fee.tipe,
    nilai_persen:  fee.nilai_persen,
    nilai_flat:    fee.nilai_flat,
    nilai_maks:    fee.nilai_maks,
    berlaku_untuk: fee.berlaku_untuk,
    ppn_inklusif:  fee.ppn_inklusif,
    passthrough:   fee.passthrough,
  }

  await supabase.from('tenant_fee_history').insert({
    tenant_id:     tenantId,
    fee_id:        fee.id,
    fee_key:       fee.fee_key,
    nama_biaya:    fee.nama_biaya,
    aksi:          'tambah',
    nilai_lama:    null,
    nilai_baru:    snapshot,
    alasan:        payload.alasan ?? null,
    berlaku_mulai: payload.berlaku_mulai,
    changed_by:    changedBy,
  })

  return fee
}

// ─── PATCH: ubah fee yang sudah ada (catat nilai lama → baru) ────────────────

export async function feeRepo_ubah(
  feeId:     string,
  tenantId:  string,
  payload:   Partial<TambahFeePayload>,
  changedBy: string,
): Promise<TenantFee> {
  const supabase = await createServerSupabaseClient()

  // Baca nilai lama dulu (untuk history)
  const { data: existing, error: readError } = await supabase
    .from('tenant_fees')
    .select('*')
    .eq('id', feeId)
    .eq('tenant_id', tenantId)
    .single()

  if (readError || !existing) throw new Error(`feeRepo_ubah: fee tidak ditemukan`)

  const nilaiLama: FeeNilaiSnapshot = {
    tipe:          existing.tipe,
    nilai_persen:  existing.nilai_persen,
    nilai_flat:    existing.nilai_flat,
    nilai_maks:    existing.nilai_maks,
    berlaku_untuk: existing.berlaku_untuk,
    ppn_inklusif:  existing.ppn_inklusif,
    passthrough:   existing.passthrough,
  }

  const updateData: Record<string, unknown> = {}
  if (payload.nilai_persen  !== undefined) updateData.nilai_persen  = payload.nilai_persen
  if (payload.nilai_flat    !== undefined) updateData.nilai_flat    = payload.nilai_flat
  if (payload.nilai_maks    !== undefined) updateData.nilai_maks    = payload.nilai_maks
  if (payload.ppn_inklusif  !== undefined) updateData.ppn_inklusif  = payload.ppn_inklusif
  if (payload.passthrough   !== undefined) updateData.passthrough   = payload.passthrough
  if (payload.berlaku_sampai !== undefined) updateData.berlaku_sampai = payload.berlaku_sampai
  if (payload.alasan        !== undefined) updateData.alasan        = payload.alasan

  const { data, error } = await supabase
    .from('tenant_fees')
    .update(updateData)
    .eq('id', feeId)
    .eq('tenant_id', tenantId)
    .select()
    .single()

  if (error) throw new Error(`feeRepo_ubah: ${error.message}`)

  const fee = data as TenantFee

  const nilaiBaru: FeeNilaiSnapshot = {
    tipe:          fee.tipe,
    nilai_persen:  fee.nilai_persen,
    nilai_flat:    fee.nilai_flat,
    nilai_maks:    fee.nilai_maks,
    berlaku_untuk: fee.berlaku_untuk,
    ppn_inklusif:  fee.ppn_inklusif,
    passthrough:   fee.passthrough,
  }

  await supabase.from('tenant_fee_history').insert({
    tenant_id:     tenantId,
    fee_id:        fee.id,
    fee_key:       fee.fee_key,
    nama_biaya:    fee.nama_biaya,
    aksi:          'ubah',
    nilai_lama:    nilaiLama,
    nilai_baru:    nilaiBaru,
    alasan:        payload.alasan ?? null,
    berlaku_mulai: fee.berlaku_mulai,
    changed_by:    changedBy,
  })

  return fee
}
