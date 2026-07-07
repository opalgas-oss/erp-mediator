'use client'

// app/dashboard/superadmin/tenants/[id]/TabKategori.tsx
// Tab Kategori — komponen utama (state + toolbar + wiring + infobox)
// Fix: G31 (toolbar), G32 (7 kolom), G33 (breadcrumb), G34 (kebab), G35-G37 (modal), G38 (konstanta)
//
// Dibuat: Sesi #132 — M6 FASE 3 Step 3.7
// Diupdate: Sesi #141 — M6 Fix Fase C
// Diupdate: Sesi #325 — Pecah file (22 KB → 8 file):
//   tab-kategori.status.tsx        — StatusBadge + ASSIGNMENT_STATUS_STYLE
//   tab-kategori.summary.tsx       — TabKategoriSummary (3 summary card C1)
//   tab-kategori.tabel.tsx         — TabKategoriTabel (tabel 7 kolom + kebab)
//   tab-kategori.dialog-helpers.tsx — helper shared semua dialog
//   tab-kategori.dialog-override.tsx — DialogEditOverrideKomisi
//   tab-kategori.dialog-riwayat.tsx  — DialogRiwayatAssignment
//   tab-kategori.dialog-hentikan.tsx — DialogHentikanKategori
//   tab-kategori.dialog-lepas.tsx    — DialogLepasKategori
//   tab-kategori.dialogs.tsx        — barrel re-export semua dialog

import { useState, useEffect }   from 'react'
import { toast }                  from 'sonner'
import type { AssignmentTabData, AssignmentDenganKategori } from '@/lib/types/tenant-category-assignment.types'
import { DialogTambahKategori }   from './DialogTambahKategori'
import { TabKategoriSummary }     from './tab-kategori.summary'
import { TabKategoriTabel }       from './tab-kategori.tabel'
import type { KebabAction }       from './tab-kategori.tabel'
import {
  DialogEditOverrideKomisi,
  DialogRiwayatAssignment,
  DialogHentikanKategori,
  DialogLepasKategori,
}                                 from './tab-kategori.dialogs'

interface Props { tenantId: string }

// ─── Komponen utama ───────────────────────────────────────────────────────────

export function TabKategori({ tenantId }: Props) {
  const [data,         setData]         = useState<AssignmentTabData | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [openKebab,    setOpenKebab]    = useState<string | null>(null)
  const [kebabPos,     setKebabPos]     = useState<{ top: number; right: number } | null>(null)
  const [openDialog,   setOpenDialog]   = useState(false)

  // Blok D — chevron collapsible
  // S#327 F-04: hapus openSummary3 (card Coverage Area dihapus)
  const [openSummary1, setOpenSummary1] = useState(true)
  const [openSummary2, setOpenSummary2] = useState(true)
  const [openTabel,    setOpenTabel]    = useState(true)

  // State dialog kebab
  const [activeAssignment, setActiveAssignment] = useState<AssignmentDenganKategori | null>(null)
  const [dialogKebab,      setDialogKebab]      = useState<KebabAction | null>(null)

  const openKebabDialog = (a: AssignmentDenganKategori, action: KebabAction) => {
    setOpenKebab(null); setKebabPos(null)
    setActiveAssignment(a); setDialogKebab(action)
  }
  const closeKebabDialog = () => { setDialogKebab(null); setActiveAssignment(null) }

  // ─── Fetch data ─────────────────────────────────────────────────────────────

  const fetchData = async () => {
    setLoading(true)
    try {
      const res  = await fetch(`/api/superadmin/tenants/${tenantId}/categories`)
      const json = await res.json()
      if (json.success) setData(json.data)
    } catch {
      toast.error('Gagal memuat data kategori')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [tenantId])

  const filtered = (data?.assignments ?? []).filter((a: AssignmentDenganKategori) => {
    const matchSearch = !search || a.kategori.display_name.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !filterStatus || a.status === filterStatus
    return matchSearch && matchStatus
  })

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>

      {/* Summary cards (C1) — S#327 F-04: 2 kartu (hapus card Coverage Area) */}
      {data && (
        <TabKategoriSummary
          summary={data.summary}
          openSummary1={openSummary1} openSummary2={openSummary2}
          setOpenSummary1={setOpenSummary1} setOpenSummary2={setOpenSummary2}
        />
      )}

      {/* Toolbar (C2 — G31) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ position: 'relative' }}>
            <i className="ti ti-search" style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#9ca3af' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari kategori..."
              style={{ width: 220, padding: '7px 10px 7px 28px', borderWidth: '0.5px', borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.12)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }}
            />
          </div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            style={{ padding: '6px 10px', borderWidth: '0.5px', borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.12)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', background: '#fff' }}
          >
            <option value="">Semua status</option>
            <option value="active">Aktif</option>
            <option value="suspended">Ditangguhkan</option>
            <option value="revoked">Dicabut</option>
          </select>
        </div>
        <button
          onClick={() => setOpenDialog(true)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer', borderWidth: '0.5px', borderStyle: 'solid', borderColor: '#85B7EB', color: '#185FA5', background: '#E6F1FB' }}
        >
          <i className="ti ti-plus" /> Tambah Kategori
        </button>
      </div>

      {/* Tabel 7 kolom + kebab dropdown (C3) */}
      <TabKategoriTabel
        loading={loading}
        filtered={filtered}
        openTabel={openTabel}
        setOpenTabel={setOpenTabel}
        openKebab={openKebab}
        kebabPos={kebabPos}
        setOpenKebab={setOpenKebab}
        setKebabPos={setKebabPos}
        onKebabAction={openKebabDialog}
      />

      {/* Dialog kebab */}
      <DialogEditOverrideKomisi
        tenantId={tenantId} assignment={activeAssignment}
        open={dialogKebab === 'override'} onClose={closeKebabDialog} onSuccess={fetchData}
      />
      <DialogRiwayatAssignment
        assignment={activeAssignment}
        open={dialogKebab === 'riwayat'} onClose={closeKebabDialog}
      />
      <DialogHentikanKategori
        tenantId={tenantId} assignment={activeAssignment}
        open={dialogKebab === 'hentikan'} onClose={closeKebabDialog} onSuccess={fetchData}
      />
      <DialogLepasKategori
        tenantId={tenantId} assignment={activeAssignment}
        open={dialogKebab === 'lepas'} onClose={closeKebabDialog} onSuccess={fetchData}
      />

      {/* Dialog Tambah Kategori (G35 — HUTANG-01) */}
      <DialogTambahKategori
        tenantId={tenantId}
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        onSuccess={fetchData}
      />

      {/* Info box (C5) */}
      <div style={{ fontSize: 12, color: '#6b7280', background: '#f9f9f8', borderWidth: '0.5px', borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.12)', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <i className="ti ti-info-circle" style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div><strong>Aturan penugasan:</strong></div>
          <div>1. Satu kategori per area hanya bisa dipegang satu tenant aktif pada satu waktu. Sebelum menugaskan kategori yang sudah dipegang tenant lain, sistem akan meminta SA untuk melakukan cabut penugasan dari tenant lama dahulu, di mana proses ini memerlukan konfirmasi 2 langkah karena tidak bisa dibatalkan.</div>
          <div>2. <strong>Hentikan kategori ini</strong> — nonaktifkan sementara tanpa melepas penugasan, tenant masih pegang kategori ini</div>
          <div>3. <strong>Lepas kategori dari tenant ini</strong> — cabut permanen, area ini bisa dipegang tenant lain setelah konfirmasi 2 langkah</div>
        </div>
      </div>
    </div>
  )
}
