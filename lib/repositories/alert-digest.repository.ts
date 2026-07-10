// lib/repositories/alert-digest.repository.ts
// Repository untuk query alert_log rentang harian — keperluan A5 Digest Harian.
// Dibuat: Sesi #351 — A5 Daily Digest WA/Email
//
// DIPISAH dari alert-log.repository.ts karena:
//   - Fungsi digest berbeda domain (rentang tanggal, bukan realtime/terbaru)
//   - ATURAN 9: alert-log.repository.ts sudah mendekati batas 10 KB
//   - ATURAN 31: pecah by kategori sejak awal
//
// Dipakai oleh: alert-digest.service.ts

import { createServerSupabaseClient } from '@/lib/supabase-server'

// ─── Tipe ────────────────────────────────────────────────────────────────────

export interface DigestIncident {
  provider_id:       string
  provider_nama:     string | null
  alert_type:        string
  occurrence_count:  number
  first_triggered:   string   // ISO timestamp UTC
  last_triggered:    string   // ISO timestamp UTC
  status:            string
}

// ─── Helper: rentang waktu kemarin WIB dalam UTC ─────────────────────────────

/**
 * Hitung rentang "kemarin 00:00–23:59 WIB" dalam UTC.
 * WIB = UTC+7.
 * Kemarin 00:00 WIB = kemarin 17:00 UTC.
 * Kemarin 23:59:59 WIB = hari ini 16:59:59 UTC.
 *
 * @returns { from: string; to: string } — ISO timestamps UTC
 */
export function getYesterdayWIBRangeUTC(): { from: string; to: string } {
  const now = new Date()

  // Hitung "kemarin" dalam WIB: offset 7 jam
  const WIB_OFFSET_MS = 7 * 60 * 60 * 1000

  // Momen sekarang dalam "waktu WIB" (numerik)
  const nowWIBms = now.getTime() + WIB_OFFSET_MS

  // Ambil tanggal kemarin WIB: floor ke hari, lalu kurangi 1 hari
  const msPerDay = 24 * 60 * 60 * 1000
  const todayStartWIBms  = Math.floor(nowWIBms / msPerDay) * msPerDay
  const yesterdayStartWIBms = todayStartWIBms - msPerDay
  const yesterdayEndWIBms   = todayStartWIBms - 1   // 23:59:59.999 kemarin WIB

  // Konversi kembali ke UTC (kurangi offset)
  const fromUTC = new Date(yesterdayStartWIBms - WIB_OFFSET_MS)
  const toUTC   = new Date(yesterdayEndWIBms   - WIB_OFFSET_MS)

  return {
    from: fromUTC.toISOString(),
    to:   toUTC.toISOString(),
  }
}

// ─── findYesterdayIncidents ───────────────────────────────────────────────────

/**
 * Ambil semua insiden dari alert_log rentang kemarin 00:00–23:59 WIB.
 * JOIN ke service_providers untuk nama provider.
 * Dikelompokkan: satu baris per (provider_id + alert_type) — ambil yang paling baru
 * dengan occurrence_count total dan first/last triggered.
 *
 * Dipakai oleh: alert-digest.service.ts → buildDigestWA() + buildDigestEmail()
 *
 * @returns Array DigestIncident — kosong jika tidak ada insiden kemarin
 */
export async function findYesterdayIncidents(): Promise<DigestIncident[]> {
  const supabase = createServerSupabaseClient()
  const { from, to } = getYesterdayWIBRangeUTC()

  const { data, error } = await supabase
    .from('alert_log')
    .select(`
      provider_id,
      alert_type,
      occurrence_count,
      triggered_at,
      last_occurred_at,
      status,
      service_providers!alert_log_provider_id_fkey(
        nama
      )
    `)
    .gte('triggered_at', from)
    .lte('triggered_at', to)
    .order('triggered_at', { ascending: true })

  if (error) throw new Error(`findYesterdayIncidents: ${error.message}`)
  if (!data || data.length === 0) return []

  // Agregasi per (provider_id + alert_type): sum occurrence_count, first/last triggered
  const map = new Map<string, DigestIncident>()

  for (const row of data) {
    const spArr = row.service_providers as Array<{ nama: string }> | null
    const sp = spArr?.[0] ?? null
    const key = `${row.provider_id}::${row.alert_type}`

    const existing = map.get(key)
    const occCount = (row.occurrence_count ?? 1)
    const lastTs   = row.last_occurred_at ?? row.triggered_at

    if (!existing) {
      map.set(key, {
        provider_id:      row.provider_id,
        provider_nama:    sp?.nama ?? null,
        alert_type:       row.alert_type,
        occurrence_count: occCount,
        first_triggered:  row.triggered_at,
        last_triggered:   lastTs,
        status:           row.status,
      })
    } else {
      // Akumulasi occurrence_count, update last_triggered
      existing.occurrence_count += occCount
      if (lastTs > existing.last_triggered) {
        existing.last_triggered = lastTs
        existing.status = row.status   // ambil status terbaru
      }
    }
  }

  return Array.from(map.values())
}
