'use client'

// components/superadmin/UsageTrackingPanel.subcomponents.tsx
// Sub-komponen internal untuk UsageTrackingPanel — tidak di-export keluar.
// Dipecah dari UsageTrackingPanel.tsx di S#123 karena file melebihi batas 10 KB (ATURAN 9).
//
// Sub-komponen:
//   VerdictIcon       — icon berdasarkan safety_verdict
//   VerdictLabel      — teks penjelasan verdict
//   BreakdownSection  — badge ringkasan jumlah per status
//   DependencyList    — daftar modul pemakai + T4/T5 action buttons
//   FooterNote        — catatan kaki penjelasan
//
// T4/T5 action buttons (ditambah S#123):
//   AKTIF         → tombol "Nonaktifkan"     → PATCH status TIDAK_DIPAKAI
//   TIDAK_DIPAKAI → tombol "Aktifkan Kembali" → PATCH status AKTIF
//
// Dibuat: Sesi #123 — dipecah dari UsageTrackingPanel.tsx

import { useState }                         from 'react'
import { ICON_STATUS, ICON_ACTION }         from '@/lib/constants/icons.constant'
import {
  TYPOGRAPHY,
  LIFECYCLE_LABEL,
  VERDICT_STYLE,
  resolveLifecycleColor,
  resolveLifecycleLabel,
}                                           from '@/lib/constants/ui-tokens.constant'
import type {
  CheckUsageResult,
  SafetyVerdict,
  DependencyItem,
  LifecycleStatus,
}                                           from '@/lib/types/usage-tracking.types'

// ─── VerdictIcon ─────────────────────────────────────────────────────────────

export function VerdictIcon({
  verdict,
  loading,
  style,
}: {
  verdict?: SafetyVerdict
  loading:  boolean
  style:    typeof VERDICT_STYLE._default
}) {
  if (loading) {
    return <ICON_STATUS.loading size={20} className="animate-spin text-slate-400 shrink-0" />
  }
  if (!verdict) {
    return <ICON_STATUS.info size={20} className="text-slate-400 shrink-0" />
  }
  const IconMap: Record<SafetyVerdict, React.ElementType> = {
    AMAN:       ICON_STATUS.success,
    TIDAK_BISA: ICON_STATUS.warning,
    TIDAK_AMAN: ICON_STATUS.error,
  }
  const Icon = IconMap[verdict]
  return <Icon size={20} className={`${style.icon} shrink-0`} />
}

// ─── VerdictLabel ────────────────────────────────────────────────────────────

export function VerdictLabel({
  result,
  style,
}: {
  result: CheckUsageResult
  style:  typeof VERDICT_STYLE._default
}) {
  const verdictMessages: Record<SafetyVerdict, string> = {
    AMAN:
      result.total_dependency === 0
        ? 'Item ini belum pernah didaftarkan sebagai dependency.'
        : 'Semua dependency tidak aktif — item ini aman untuk dihapus.',
    TIDAK_BISA:
      'Item ini ada di kode modul yang sedang dibangun. ' +
      'Hapus bisa menyebabkan error di kode meski belum ada data user.',
    TIDAK_AMAN:
      `Item ini sedang aktif dipakai ${result.breakdown.AKTIF} modul. ` +
      'Menghapus atau menonaktifkan akan merusak data user yang sudah ada.',
  }

  return (
    <p className={`text-sm font-medium ${style.title}`}>
      {style.label}
      {' — '}
      <span className="font-normal">
        {verdictMessages[result.safety_verdict]}
      </span>
    </p>
  )
}

// ─── BreakdownSection ────────────────────────────────────────────────────────

export function BreakdownSection({
  breakdown,
}: {
  breakdown: CheckUsageResult['breakdown']
}) {
  const items = [
    { status: 'AKTIF',         count: breakdown.AKTIF },
    { status: 'DIBANGUN',      count: breakdown.DIBANGUN },
    { status: 'RENCANA',       count: breakdown.RENCANA },
    { status: 'TIDAK_DIPAKAI', count: breakdown.TIDAK_DIPAKAI },
  ].filter(i => i.count > 0)

  if (items.length === 0) return null

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {items.map(({ status, count }) => (
        <span
          key={status}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${resolveLifecycleColor(status)}`}
        >
          {resolveLifecycleLabel(status)}: {count}
        </span>
      ))}
    </div>
  )
}

// ─── DependencyList — dengan T4/T5 action buttons ────────────────────────────

/**
 * Daftar dependency per modul.
 * T4/T5: setiap item AKTIF tampilkan tombol Nonaktifkan,
 *        setiap item TIDAK_DIPAKAI tampilkan tombol Aktifkan Kembali.
 */
export function DependencyList({
  dependencies,
  onStatusChanged,
}: {
  dependencies:    DependencyItem[]
  /** Callback setelah status dependency berhasil diubah — parent akan re-fetch */
  onStatusChanged: () => void
}) {
  // State loading per dependency id agar tombol hanya spinner di baris yang diklik
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})
  const [actionError,   setActionError]   = useState<Record<string, string | null>>({})

  // ── Handler ubah status lifecycle ─────────────────────────────────────────
  const handleUpdateStatus = async (depId: string, newStatus: LifecycleStatus) => {
    setActionLoading(prev => ({ ...prev, [depId]: true }))
    setActionError(prev => ({ ...prev, [depId]: null }))

    try {
      const res = await fetch(`/api/superadmin/usage/${depId}/status`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ new_status: newStatus }),
      })
      const json = await res.json()

      if (!res.ok || !json.success) {
        setActionError(prev => ({
          ...prev,
          [depId]: json.message ?? 'Gagal mengubah status',
        }))
        return
      }

      // Berhasil → minta parent refresh data panel
      onStatusChanged()
    } catch {
      setActionError(prev => ({ ...prev, [depId]: 'Gagal menghubungi server' }))
    } finally {
      setActionLoading(prev => ({ ...prev, [depId]: false }))
    }
  }

  return (
    <div className="mt-3 space-y-2">
      <p className={`${TYPOGRAPHY.label} mb-1`}>Daftar Modul Pemakai:</p>
      {dependencies.map((dep) => (
        <div
          key={dep.id}
          className="bg-white/70 rounded-md px-3 py-2 text-xs"
        >
          {/* Baris atas: badge status + info modul */}
          <div className="flex items-start gap-2">
            {/* Badge status lifecycle */}
            <span
              className={`shrink-0 mt-0.5 px-2 py-0.5 rounded-full font-medium border ${resolveLifecycleColor(dep.lifecycle_status)}`}
            >
              {LIFECYCLE_LABEL[dep.lifecycle_status] ?? dep.lifecycle_status}
            </span>

            {/* Info dependency */}
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-700 truncate">{dep.module_name}</p>
              <p className={`${TYPOGRAPHY.caption} truncate`}>
                {dep.consumer_table}.{dep.consumer_column}
              </p>
              {dep.description && (
                <p className="text-slate-500 mt-0.5 line-clamp-2">{dep.description}</p>
              )}
            </div>
          </div>

          {/* T4/T5: Tombol aksi — tampil hanya untuk status AKTIF dan TIDAK_DIPAKAI */}
          {(dep.lifecycle_status === 'AKTIF' || dep.lifecycle_status === 'TIDAK_DIPAKAI') && (
            <div className="mt-2 flex items-center gap-2">

              {/* T4: Nonaktifkan — untuk item AKTIF → TIDAK_DIPAKAI */}
              {dep.lifecycle_status === 'AKTIF' && (
                <button
                  onClick={() => handleUpdateStatus(dep.id, 'TIDAK_DIPAKAI')}
                  disabled={actionLoading[dep.id]}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium
                             bg-amber-100 text-amber-700 border border-amber-200
                             hover:bg-amber-200 disabled:opacity-50 disabled:cursor-not-allowed
                             transition-colors"
                >
                  {actionLoading[dep.id]
                    ? <ICON_STATUS.loading size={12} className="animate-spin" />
                    : <ICON_ACTION.hide size={12} />
                  }
                  Nonaktifkan
                </button>
              )}

              {/* T5: Aktifkan Kembali — untuk item TIDAK_DIPAKAI → AKTIF */}
              {dep.lifecycle_status === 'TIDAK_DIPAKAI' && (
                <button
                  onClick={() => handleUpdateStatus(dep.id, 'AKTIF')}
                  disabled={actionLoading[dep.id]}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium
                             bg-green-100 text-green-700 border border-green-200
                             hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed
                             transition-colors"
                >
                  {actionLoading[dep.id]
                    ? <ICON_STATUS.loading size={12} className="animate-spin" />
                    : <ICON_ACTION.show size={12} />
                  }
                  Aktifkan Kembali
                </button>
              )}

              {/* Pesan error per baris */}
              {actionError[dep.id] && (
                <span className={TYPOGRAPHY.error}>{actionError[dep.id]}</span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── FooterNote ───────────────────────────────────────────────────────────────

export function FooterNote({ result }: { result: CheckUsageResult }) {
  if (result.total_dependency === 0) {
    return (
      <p className={`mt-3 ${TYPOGRAPHY.caption}`}>
        Item ini belum tercatat di registry dependency. Aman untuk dihapus.
      </p>
    )
  }

  const footerMap: Record<SafetyVerdict, string> = {
    AMAN:
      'Data lama tetap aman. Dependency berstatus "Tidak Dipakai" tidak memblokir penghapusan.',
    TIDAK_BISA:
      'Hubungi developer untuk update status dependency ke "Tidak Dipakai" terlebih dahulu.',
    TIDAK_AMAN:
      'Pilih "Nonaktifkan" untuk menyembunyikan item tanpa merusak data user yang sudah ada.',
  }

  return (
    <p className={`mt-3 ${TYPOGRAPHY.caption}`}>
      {footerMap[result.safety_verdict]}
    </p>
  )
}
