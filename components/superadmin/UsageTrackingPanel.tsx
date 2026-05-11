'use client'

// components/superadmin/UsageTrackingPanel.tsx
// Panel "Pemetaan Pemakaian" — info detail dependency item (modul yang pakai, status, dll).
//
// PERAN PANEL INI SETELAH S#125 REFACTOR:
//   Panel ini SEKARANG fokus pada TAMPILKAN DETAIL pemakaian:
//     - Daftar modul yang pakai item ini (dari sp_check_usage)
//     - Breakdown count per lifecycle status
//     - Tombol T4/T5 (Nonaktifkan / Aktifkan Kembali dep)
//
//   Verdict "boleh dihapus?" sekarang BUKAN tanggung jawab panel ini —
//   itu dihitung oleh useDeletePermission di parent dan ditampilkan via DeleteVerdictPanel.
//   Panel ini cukup TAMPILKAN DATA detail; verdict ditampilkan terpisah oleh DeleteVerdictPanel.
//
// Hierarki visual baru:
//   [DeleteVerdictPanel] ← dari verdict layer (warna hijau/amber/merah berdasarkan rules)
//   [UsageTrackingPanel] ← detail dep + tombol T4/T5
//
// Dibuat: Sesi #121 — PL-S12 Shared UI Component USAGE_TRACKING
// Update: Sesi #123 — split sub-komponen + T4/T5 action buttons
// Update: Sesi #125 — Re-scope: panel ini fokus DETAIL pemakaian, BUKAN verdict
//                     Verdict pindah ke DeleteVerdictPanel (terpisah, di-pass via prop dari parent)
// Update: Sesi #127 — Tambah prop hideVerdictHeader (default false, backward compat)
//                     Saat true: sembunyikan header verdict + container netral → dipakai di DropdownDetailDrawer

import { useCallback, useEffect, useState }  from 'react'
import { ICON_STATUS, ICON_NAV }             from '@/lib/constants/icons.constant'
import { TYPOGRAPHY, VERDICT_STYLE }         from '@/lib/constants/ui-tokens.constant'
import {
  VerdictIcon,
  VerdictLabel,
  BreakdownSection,
  DependencyList,
  FooterNote,
}                                            from '@/components/superadmin/UsageTrackingPanel.subcomponents'
import type { CheckUsageResult }             from '@/lib/types/usage-tracking.types'

// ─── Props ────────────────────────────────────────────────────────────────────

interface UsageTrackingPanelProps {
  sourceTable:       string
  sourceId:          string
  isOpen:            boolean
  onClose:           () => void
  itemLabel?:        string
  className?:        string
  /** Saat true: sembunyikan header verdict + close button. Dipakai di DropdownDetailDrawer
   *  agar tidak duplikat dengan DeleteVerdictPanel yang sudah tampil di atas drawer.
   *  Default: false (backward compat — perilaku lama tidak berubah). */
  hideVerdictHeader?: boolean
}

// ─── Komponen ─────────────────────────────────────────────────────────────────

export default function UsageTrackingPanel({
  sourceTable,
  sourceId,
  isOpen,
  onClose,
  itemLabel,
  className = '',
  hideVerdictHeader = false,
}: UsageTrackingPanelProps) {

  const [data,       setData]       = useState<CheckUsageResult | null>(null)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!isOpen) return

    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({ table: sourceTable, id: sourceId })
        const res    = await fetch(`/api/superadmin/usage/check?${params}`)
        const json   = await res.json()

        if (!res.ok || !json.success) {
          setError(json.message ?? 'Gagal memuat data pemakaian')
          return
        }

        setData(json.data as CheckUsageResult)
      } catch {
        setError('Gagal menghubungi server')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [isOpen, sourceTable, sourceId, refreshKey])

  const handleStatusChanged = useCallback(() => {
    setRefreshKey(k => k + 1)
  }, [])

  if (!isOpen) return null

  const verdict = data?.safety_verdict ?? '_default'
  const style   = VERDICT_STYLE[verdict] ?? VERDICT_STYLE._default

  // Saat hideVerdictHeader=true, container pakai warna netral (tidak ikut verdict)
  // supaya tidak clash dengan DeleteVerdictPanel yang tampil di atas drawer.
  const containerClass = hideVerdictHeader
    ? `border border-slate-200 bg-slate-50 ${className}`
    : `border rounded-lg p-4 ${style.container} ${className}`

  return (
    <div className={containerClass}>
      {/* Header verdict — disembunyikan saat hideVerdictHeader=true (dipakai di drawer) */}
      {!hideVerdictHeader && (
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <VerdictIcon verdict={data?.safety_verdict} loading={loading} style={style} />
            <div>
              <p className={`text-sm font-semibold ${style.title}`}>
                Pemetaan Pemakaian
                {itemLabel ? ` — ${itemLabel}` : ''}
              </p>
              {!loading && data && (
                <p className={TYPOGRAPHY.caption}>
                  {data.total_dependency === 0
                    ? 'Belum ada modul yang mendaftarkan pemakaian item ini'
                    : `${data.total_dependency} dependency terdaftar`
                  }
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Tutup panel"
          >
            <ICON_NAV.close size={16} />
          </button>
        </div>
      )}

      {/* Sub-heading saat dipakai di drawer (header disembunyikan) */}
      {hideVerdictHeader && (
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Detail Pemakaian</p>
      )}

      {loading && (
        <div className="mt-3 flex items-center gap-2 text-slate-500">
          <ICON_STATUS.loading size={14} className="animate-spin" />
          <span className={TYPOGRAPHY.muted}>Memuat data pemakaian...</span>
        </div>
      )}

      {!loading && error && (
        <div className="mt-3 flex items-center gap-2">
          <ICON_STATUS.error size={14} className="text-red-500" />
          <span className={TYPOGRAPHY.error}>{error}</span>
        </div>
      )}

      {!loading && !error && data && (
        <>
          <div className="mt-3">
            <VerdictLabel result={data} style={style} />
          </div>

          {data.total_dependency > 0 && (
            <BreakdownSection breakdown={data.breakdown} />
          )}

          {data.dependencies.length > 0 && (
            <DependencyList
              dependencies={data.dependencies}
              onStatusChanged={handleStatusChanged}
            />
          )}

          <FooterNote result={data} />
        </>
      )}
    </div>
  )
}
