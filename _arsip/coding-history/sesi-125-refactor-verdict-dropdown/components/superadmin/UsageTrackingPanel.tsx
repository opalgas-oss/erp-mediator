'use client'

// components/superadmin/UsageTrackingPanel.tsx
// Panel "Pemetaan Pemakaian" — komponen shared yang bisa dipanggil dari modul manapun.
// Tampil sebagai inline accordion (expand di bawah baris) — BUKAN modal, BUKAN sidebar.

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

interface UsageTrackingPanelProps {
  sourceTable: string
  sourceId:    string
  isOpen:      boolean
  onClose:     () => void
  itemLabel?:  string
  className?:  string
}

export default function UsageTrackingPanel({
  sourceTable,
  sourceId,
  isOpen,
  onClose,
  itemLabel,
  className = '',
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

  return (
    <div className={`border rounded-lg p-4 ${style.container} ${className}`}>
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
