'use client'

// app/dashboard/superadmin/tenants/[id]/TabKategori.tsx
// ARSIP PRA-REFACTOR S#316 B-03
// Original: Sesi #132 dibuat, Sesi #141 diupdate

import { useState, useEffect } from 'react'
import { toast }               from 'sonner'
import type { AssignmentTabData, AssignmentDenganKategori } from '@/lib/types/tenant-category-assignment.types'
import { DialogTambahKategori } from './DialogTambahKategori'

interface Props { tenantId: string }

const ASSIGNMENT_STATUS_STYLE: Record<string, { bg: string; text: string; border: string; icon: string; label: string }> = {
  active:           { bg: '#EAF3DE', text: '#3B6D11', border: '#97C459', icon: 'ti-circle-check',    label: 'Aktif' },
  suspended:        { bg: '#FAEEDA', text: '#854F0B', border: '#EF9F27', icon: 'ti-player-pause',    label: 'Ditangguhkan' },
  revoked:          { bg: '#FCEBEB', text: '#A32D2D', border: '#F09595', icon: 'ti-x',               label: 'Dicabut' },
  pending_handover: { bg: '#FAEEDA', text: '#854F0B', border: '#EF9F27', icon: 'ti-arrows-exchange', label: 'Proses Serah Terima' },
}

const S = {
  card: { background: '#fff', border: '0.5px solid rgba(0,0,0,0.12)', borderRadius: 12 } as React.CSSProperties,
  label: { fontSize: 12, color: '#6b7280' } as React.CSSProperties,
}

function StatusBadge({ status }: { status: string }) {
  const st = ASSIGNMENT_STATUS_STYLE[status] ?? ASSIGNMENT_STATUS_STYLE.active
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 100, fontSize: 11, fontWeight: 500, background: st.bg, color: st.text, borderWidth: '0.5px', borderStyle: 'solid', borderColor: st.border }}>
      <i className={`ti ${st.icon}`} style={{ fontSize: 11 }} />
      {st.label}
    </span>
  )
}

export function TabKategori({ tenantId }: Props) {
  const [data, setData] = useState<AssignmentTabData | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [openKebab, setOpenKebab] = useState<string | null>(null)
  const [openDialog, setOpenDialog] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/superadmin/tenants/${tenantId}/categories`)
      const json = await res.json()
      if (json.success) setData(json.data)
    } catch { toast.error('Gagal memuat data kategori') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [tenantId])

  const filtered = (data?.assignments ?? []).filter((a: AssignmentDenganKategori) => {
    const matchSearch = !search || a.kategori.display_name.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !filterStatus || a.status === filterStatus
    return matchSearch && matchStatus
  })

  return (
    <div>
      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: '1rem' }}>
          <div style={{ ...S.card, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 3 }}>Kategori aktif dipegang</div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{data.summary.total_aktif}</div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{data.summary.total_aktif} kategori ditugaskan</div>
          </div>
          <div style={{ ...S.card, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 3 }}>Komisi override aktif</div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{data.summary.total_override_komisi}</div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{data.summary.total_override_komisi > 0 ? `${data.summary.total_override_komisi} kategori pakai rate khusus` : 'Semua ikut rate kontrak'}</div>
          </div>
          {data.summary.coverage_summary === 'BELUM_SETTING' ? (
            <div style={{ ...S.card, padding: '12px 14px', background: '#FAEEDA', borderColor: '#EF9F27' }}>
              <div style={{ fontSize: 11, color: '#854F0B', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 4 }}><i className="ti ti-alert-triangle" style={{ fontSize: 11 }} />Coverage area</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#854F0B' }}>Belum disetting</div>
              <div style={{ fontSize: 11, color: '#854F0B', marginTop: 4, lineHeight: 1.5 }}>Lakukan:<br />1. Assign kategori ke tenant<br />2. Set area coverage tiap kategori</div>
            </div>
          ) : (
            <div style={{ ...S.card, padding: '12px 14px' }}>
              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 3 }}>Coverage area</div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{data.summary.coverage_summary}</div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Berlaku untuk semua kategori</div>
            </div>
          )}
        </div>
      )}
      {/* [sisa JSX identik dengan file aktif — arsip ini sebagai snapshot pra-B-03] */}
    </div>
  )
}
