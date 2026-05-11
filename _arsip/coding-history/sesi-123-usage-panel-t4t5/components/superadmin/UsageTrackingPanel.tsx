'use client'

// components/superadmin/UsageTrackingPanel.tsx
// Panel "Pemetaan Pemakaian" — komponen shared yang bisa dipanggil dari modul manapun.
// Tampil sebagai inline accordion (expand di bawah baris) — BUKAN modal, BUKAN sidebar.
//
// Cara pakai (dari komponen induk):
//   const [showUsage, setShowUsage] = useState(false)
//   <UsageTrackingPanel
//     sourceTable="master_dropdown_options"
//     sourceId={item.id}
//     isOpen={showUsage}
//     onClose={() => setShowUsage(false)}
//   />
//
// States: loading / AMAN / TIDAK_BISA / TIDAK_AMAN / kosong (total_dependency = 0)
//
// Dibuat: Sesi #121 — PL-S12 Shared UI Component USAGE_TRACKING

import { useEffect, useState }                  from 'react'
import { ICON_STATUS, ICON_NAV }                from '@/lib/constants/icons.constant'
import {
  TYPOGRAPHY,
  BADGE_LIFECYCLE,
  LIFECYCLE_LABEL,
  VERDICT_STYLE,
  resolveLifecycleColor,
  resolveLifecycleLabel,
}                                               from '@/lib/constants/ui-tokens.constant'
import type {
  CheckUsageResult,
  SafetyVerdict,
  DependencyItem,
}                                               from '@/lib/types/usage-tracking.types'

// ─── Props ───────────────────────────────────────────────────────────────────

interface UsageTrackingPanelProps {
  /** Nama tabel yang menyimpan item (cth: master_dropdown_options) */
  sourceTable: string
  /** UUID item spesifik */
  sourceId:    string
  /** Panel terbuka atau tidak — dikelola parent */
  isOpen:      boolean
  /** Callback saat panel ditutup */
  onClose:     () => void
  /** Label item untuk ditampilkan di header panel */
  itemLabel?:  string
  className?:  string
}

// ─── Komponen ─────────────────────────────────────────────────────────────────

export default function UsageTrackingPanel({
  sourceTable,
  sourceId,
  isOpen,
  onClose,
  itemLabel,
  className = '',
}: UsageTrackingPanelProps) {

  const [data,    setData]    = useState<CheckUsageResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  // ── Fetch data saat panel dibuka ─────────────────────────────────────────────
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
  }, [isOpen, sourceTable, sourceId])

  // ── Tidak ditampilkan jika panel tertutup ─────────────────────────────────────
  if (!isOpen) return null

  // ── Resolve style berdasarkan verdict ─────────────────────────────────────────
  const verdict = data?.safety_verdict ?? '_default'
  const style   = VERDICT_STYLE[verdict] ?? VERDICT_STYLE._default

  return (
    <div className={`border rounded-lg p-4 ${style.container} ${className}`}>

      {/* ── Header Panel ──────────────────────────────────────────────────────── */}
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

        {/* Tombol tutup */}
        <button
          onClick={onClose}
          className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="Tutup panel"
        >
          <ICON_NAV.close size={16} />
        </button>
      </div>

      {/* ── State: Loading ────────────────────────────────────────────────────── */}
      {loading && (
        <div className="mt-3 flex items-center gap-2 text-slate-500">
          <ICON_STATUS.loading size={14} className="animate-spin" />
          <span className={TYPOGRAPHY.muted}>Memuat data pemakaian...</span>
        </div>
      )}

      {/* ── State: Error ──────────────────────────────────────────────────────── */}
      {!loading && error && (
        <div className="mt-3 flex items-center gap-2">
          <ICON_STATUS.error size={14} className="text-red-500" />
          <span className={TYPOGRAPHY.error}>{error}</span>
        </div>
      )}

      {/* ── State: Data tersedia ──────────────────────────────────────────────── */}
      {!loading && !error && data && (
        <>
          {/* Verdict utama */}
          <div className="mt-3">
            <VerdictLabel result={data} style={style} />
          </div>

          {/* Breakdown per status */}
          {data.total_dependency > 0 && (
            <BreakdownSection breakdown={data.breakdown} />
          )}

          {/* Daftar dependency */}
          {data.dependencies.length > 0 && (
            <DependencyList dependencies={data.dependencies} />
          )}

          {/* Footer penjelasan */}
          <FooterNote result={data} />
        </>
      )}
    </div>
  )
}

// ─── Sub-komponen: VerdictIcon ───────────────────────────────────────────────

function VerdictIcon({
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

// ─── Sub-komponen: VerdictLabel ──────────────────────────────────────────────

function VerdictLabel({
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

// ─── Sub-komponen: BreakdownSection ──────────────────────────────────────────

function BreakdownSection({
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

// ─── Sub-komponen: DependencyList ────────────────────────────────────────────

function DependencyList({ dependencies }: { dependencies: DependencyItem[] }) {
  return (
    <div className="mt-3 space-y-2">
      <p className={`${TYPOGRAPHY.label} mb-1`}>Daftar Modul Pemakai:</p>
      {dependencies.map((dep, idx) => (
        <div
          key={idx}
          className="bg-white/70 rounded-md px-3 py-2 flex items-start gap-2 text-xs"
        >
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
      ))}
    </div>
  )
}

// ─── Sub-komponen: FooterNote ─────────────────────────────────────────────────

function FooterNote({ result }: { result: CheckUsageResult }) {
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
