'use client'

// app/dashboard/superadmin/tenants/[id]/tab-kategori.summary.tsx
// 3 summary card (C1) — Blok D: chevron collapsible
//
// Dibuat: Sesi #325 — Pecah TabKategori.tsx (23 KB → 3 file)
// Dipakai oleh: TabKategori.tsx

import { S } from './_shared/tenant-tab-ui'
import type { AssignmentSummary } from '@/lib/types/tenant-category-assignment.types'

interface Props {
  summary:       AssignmentSummary
  openSummary1:  boolean
  openSummary2:  boolean
  openSummary3:  boolean
  setOpenSummary1: (v: boolean) => void
  setOpenSummary2: (v: boolean) => void
  setOpenSummary3: (v: boolean) => void
}

// ─── 3 Summary Card TabKategori ───────────────────────────────────────────────

export function TabKategoriSummary({
  summary, openSummary1, openSummary2, openSummary3,
  setOpenSummary1, setOpenSummary2, setOpenSummary3,
}: Props) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: '1rem' }}>

      {/* Card 1: Kategori aktif */}
      <div style={{ ...S.card }}>
        <div
          onClick={() => setOpenSummary1(!openSummary1)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#f9f9f8')}
          onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
        >
          <span style={{ fontSize: 11, color: '#6b7280' }}>Kategori aktif dipegang</span>
          <i className="ti ti-chevron-down" style={{ fontSize: 13, color: '#9ca3af', transform: openSummary1 ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </div>
        {openSummary1 && (
          <div style={{ padding: '0 12px 10px' }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{summary.total_aktif}</div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{summary.total_aktif} kategori ditugaskan</div>
          </div>
        )}
      </div>

      {/* Card 2: Komisi override */}
      <div style={{ ...S.card }}>
        <div
          onClick={() => setOpenSummary2(!openSummary2)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#f9f9f8')}
          onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
        >
          <span style={{ fontSize: 11, color: '#6b7280' }}>Komisi override aktif</span>
          <i className="ti ti-chevron-down" style={{ fontSize: 13, color: '#9ca3af', transform: openSummary2 ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </div>
        {openSummary2 && (
          <div style={{ padding: '0 12px 10px' }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{summary.total_override_komisi}</div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
              {summary.total_override_komisi > 0 ? `${summary.total_override_komisi} kategori pakai rate khusus` : 'Semua ikut rate kontrak'}
            </div>
          </div>
        )}
      </div>

      {/* Card 3: Coverage area */}
      {summary.coverage_summary === 'BELUM_SETTING' ? (
        <div style={{ ...S.card, borderColor: '#EF9F27' }}>
          <div
            onClick={() => setOpenSummary3(!openSummary3)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', cursor: 'pointer', userSelect: 'none', background: '#FAEEDA' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f5e4c8')}
            onMouseLeave={e => (e.currentTarget.style.background = '#FAEEDA')}
          >
            <span style={{ fontSize: 11, color: '#854F0B', display: 'flex', alignItems: 'center', gap: 4 }}>
              <i className="ti ti-alert-triangle" style={{ fontSize: 11 }} />
              Coverage area
            </span>
            <i className="ti ti-chevron-down" style={{ fontSize: 13, color: '#854F0B', transform: openSummary3 ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </div>
          {openSummary3 && (
            <div style={{ padding: '0 12px 10px', background: '#FAEEDA' }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#854F0B' }}>Belum disetting</div>
              <div style={{ fontSize: 11, color: '#854F0B', marginTop: 4, lineHeight: 1.5 }}>
                Lakukan:<br />
                1. Assign kategori ke tenant<br />
                2. Set area coverage tiap kategori
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ ...S.card }}>
          <div
            onClick={() => setOpenSummary3(!openSummary3)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f9f9f8')}
            onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
          >
            <span style={{ fontSize: 11, color: '#6b7280' }}>Coverage area</span>
            <i className="ti ti-chevron-down" style={{ fontSize: 13, color: '#9ca3af', transform: openSummary3 ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </div>
          {openSummary3 && (
            <div style={{ padding: '0 12px 10px' }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{summary.coverage_summary}</div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Berlaku untuk semua kategori</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
