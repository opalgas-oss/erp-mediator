'use client'
// app/dashboard/superadmin/wilayah/WilayahClient.tsx
// Master Wilayah — 2 tab: Provinsi + Kab/Kota
// Dibuat: Sesi #144

import { useState, useEffect, useCallback } from 'react'
import type { Province, City } from '@/lib/types/province.types'

// ─── Tipe lokal ───────────────────────────────────────────────────────────────

interface ProvinceAdmin extends Province { city_count: number }

type ActiveTab = 'provinsi' | 'kabkota'

// ─── Helpers UI ───────────────────────────────────────────────────────────────

function StatusBadge({ isActive }: { isActive: boolean }) {
  if (isActive) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '2px 8px', borderRadius: 999, fontSize: 12, fontWeight: 500,
        background: '#EAF3DE', color: '#3B6D11', border: '0.5px solid #97C459',
      }}>
        <i className="ti ti-circle-check" style={{ fontSize: 13 }} /> Aktif
      </span>
    )
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 999, fontSize: 12, fontWeight: 500,
      background: '#F1EFE8', color: '#5F5E5A', border: '0.5px solid #B4B2A9',
    }}>
      <i className="ti ti-circle-x" style={{ fontSize: 13 }} /> Nonaktif
    </span>
  )
}

function TypeBadge({ type }: { type: string }) {
  const isKota = type === 'kota'
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 500,
      background: isKota ? '#E6F1FB' : '#EEEDFE',
      color: isKota ? '#185FA5' : '#534AB7',
      border: `0.5px solid ${isKota ? '#85B7EB' : '#AFA9EC'}`,
    }}>
      {isKota ? 'Kota' : 'Kabupaten'}
    </span>
  )
}

// ─── Dialog: Tambah / Edit Provinsi ──────────────────────────────────────────

function DialogProvinsi({
  mode,
  initial,
  onClose,
  onSave,
}: {
  mode: 'tambah' | 'edit'
  initial?: ProvinceAdmin
  onClose: () => void
  onSave: () => void
}) {
  const [name, setName]       = useState(initial?.name ?? '')
  const [code, setCode]       = useState(initial?.code ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function handleSubmit() {
    if (!name.trim() || !code.trim()) { setError('Nama dan Kode BPS wajib diisi'); return }
    setLoading(true)
    setError('')
    try {
      if (mode === 'tambah') {
        await fetch('/api/superadmin/wilayah/provinces', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), code: code.trim().toUpperCase(), sort_order: 99 }),
        })
      } else {
        await fetch(`/api/superadmin/wilayah/provinces/${initial!.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), code: code.trim().toUpperCase() }),
        })
      }
      onSave()
    } catch {
      setError('Gagal menyimpan. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}>
      <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid rgba(0,0,0,0.12)', width: 420, padding: '24px', boxShadow: '0 4px 24px rgba(0,0,0,0.10)' }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>
          {mode === 'tambah' ? 'Tambah Provinsi' : 'Edit Provinsi'}
        </h3>
        {error && (
          <div style={{ background: '#FCEBEB', border: '0.5px solid #F09595', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#A32D2D', marginBottom: 12 }}>
            {error}
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Nama Provinsi *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="contoh: Jawa Barat"
              style={{ width: '100%', border: '0.5px solid rgba(0,0,0,0.20)', borderRadius: 8, padding: '7px 10px', fontSize: 13, boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Kode BPS *</label>
            <input
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="contoh: 32"
              maxLength={10}
              style={{ width: '100%', border: '0.5px solid rgba(0,0,0,0.20)', borderRadius: 8, padding: '7px 10px', fontSize: 13, boxSizing: 'border-box' }}
            />
            <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>Kode numerik dari Badan Pusat Statistik</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={onClose} disabled={loading}
            style={{ padding: '7px 16px', borderRadius: 8, border: '0.5px solid rgba(0,0,0,0.22)', background: '#fff', fontSize: 13, cursor: 'pointer' }}>
            Batal
          </button>
          <button onClick={handleSubmit} disabled={loading}
            style={{ padding: '7px 16px', borderRadius: 8, border: '0.5px solid #85B7EB', background: '#E6F1FB', color: '#185FA5', fontSize: 13, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Dialog: Tambah / Edit Kab/Kota ──────────────────────────────────────────

function DialogKota({
  mode,
  provinceId,
  provinces,
  initial,
  onClose,
  onSave,
}: {
  mode:       'tambah' | 'edit'
  provinceId: string
  provinces:  ProvinceAdmin[]
  initial?:   City
  onClose:    () => void
  onSave:     () => void
}) {
  const [selectedProvinceId, setSelectedProvinceId] = useState(initial?.province_id ?? provinceId)
  const [name, setName]   = useState(initial?.name ?? '')
  const [code, setCode]   = useState(initial?.code ?? '')
  const [type, setType]   = useState<'kota' | 'kabupaten'>(initial?.type ?? 'kabupaten')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function handleSubmit() {
    if (!name.trim()) { setError('Nama kab/kota wajib diisi'); return }
    setLoading(true)
    setError('')
    try {
      if (mode === 'tambah') {
        await fetch(`/api/superadmin/wilayah/provinces/${selectedProvinceId}/cities`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), code: code.trim() || null, type, sort_order: 999 }),
        })
      } else {
        await fetch(`/api/superadmin/wilayah/cities/${initial!.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), code: code.trim() || null, type }),
        })
      }
      onSave()
    } catch {
      setError('Gagal menyimpan. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}>
      <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid rgba(0,0,0,0.12)', width: 460, padding: '24px', boxShadow: '0 4px 24px rgba(0,0,0,0.10)' }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>
          {mode === 'tambah' ? 'Tambah Kab/Kota' : 'Edit Kab/Kota'}
        </h3>
        {error && (
          <div style={{ background: '#FCEBEB', border: '0.5px solid #F09595', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#A32D2D', marginBottom: 12 }}>
            {error}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px' }}>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Provinsi *</label>
            <select
              value={selectedProvinceId}
              onChange={e => setSelectedProvinceId(e.target.value)}
              disabled={mode === 'edit'}
              style={{ width: '100%', border: '0.5px solid rgba(0,0,0,0.20)', borderRadius: 8, padding: '7px 10px', fontSize: 13, background: mode === 'edit' ? '#f9f9f8' : '#fff' }}
            >
              {provinces.filter(p => p.is_active).map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Nama *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="contoh: Bandung"
              style={{ width: '100%', border: '0.5px solid rgba(0,0,0,0.20)', borderRadius: 8, padding: '7px 10px', fontSize: 13, boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Tipe *</label>
            <select
              value={type}
              onChange={e => setType(e.target.value as 'kota' | 'kabupaten')}
              style={{ width: '100%', border: '0.5px solid rgba(0,0,0,0.20)', borderRadius: 8, padding: '7px 10px', fontSize: 13 }}
            >
              <option value="kabupaten">Kabupaten</option>
              <option value="kota">Kota</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Kode BPS</label>
            <input
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="opsional"
              style={{ width: '100%', border: '0.5px solid rgba(0,0,0,0.20)', borderRadius: 8, padding: '7px 10px', fontSize: 13, boxSizing: 'border-box' }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={onClose} disabled={loading}
            style={{ padding: '7px 16px', borderRadius: 8, border: '0.5px solid rgba(0,0,0,0.22)', background: '#fff', fontSize: 13, cursor: 'pointer' }}>
            Batal
          </button>
          <button onClick={handleSubmit} disabled={loading}
            style={{ padding: '7px 16px', borderRadius: 8, border: '0.5px solid #85B7EB', background: '#E6F1FB', color: '#185FA5', fontSize: 13, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Komponen utama ───────────────────────────────────────────────────────────

export function WilayahClient() {
  const [activeTab, setActiveTab]         = useState<ActiveTab>('provinsi')
  const [provinces, setProvinces]         = useState<ProvinceAdmin[]>([])
  const [cities, setCities]               = useState<City[]>([])
  const [selectedProv, setSelectedProv]   = useState('')
  const [searchProv, setSearchProv]       = useState('')
  const [searchCity, setSearchCity]       = useState('')
  const [filterStatus, setFilterStatus]   = useState<'semua' | 'aktif' | 'nonaktif'>('semua')
  const [filterType, setFilterType]       = useState<'semua' | 'kota' | 'kabupaten'>('semua')
  const [loadingProv, setLoadingProv]     = useState(true)
  const [loadingCity, setLoadingCity]     = useState(false)

  // Dialog state
  const [dialogProv, setDialogProv]       = useState<{ mode: 'tambah' | 'edit'; data?: ProvinceAdmin } | null>(null)
  const [dialogCity, setDialogCity]       = useState<{ mode: 'tambah' | 'edit'; data?: City } | null>(null)
  const [openMenuId, setOpenMenuId]       = useState<string | null>(null)

  // ─── Fetch provinsi ─────────────────────────────────────────────────────────

  const fetchProvinces = useCallback(async () => {
    setLoadingProv(true)
    try {
      const res = await fetch('/api/superadmin/wilayah/provinces')
      const json = await res.json()
      const list: ProvinceAdmin[] = json.data ?? []
      setProvinces(list)
      if (!selectedProv && list.length > 0) setSelectedProv(list[0].id)
    } finally {
      setLoadingProv(false)
    }
  }, [selectedProv])

  useEffect(() => { fetchProvinces() }, [])

  // ─── Fetch kota per provinsi ────────────────────────────────────────────────

  const fetchCities = useCallback(async (provId: string) => {
    if (!provId) return
    setLoadingCity(true)
    try {
      const res = await fetch(`/api/superadmin/wilayah/provinces/${provId}/cities`)
      const json = await res.json()
      setCities(json.data ?? [])
    } finally {
      setLoadingCity(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'kabkota' && selectedProv) fetchCities(selectedProv)
  }, [activeTab, selectedProv, fetchCities])

  // ─── Toggle status provinsi ─────────────────────────────────────────────────

  async function toggleProvince(p: ProvinceAdmin) {
    await fetch(`/api/superadmin/wilayah/provinces/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !p.is_active }),
    })
    fetchProvinces()
    setOpenMenuId(null)
  }

  // ─── Toggle status kota ─────────────────────────────────────────────────────

  async function toggleCity(c: City) {
    await fetch(`/api/superadmin/wilayah/cities/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !c.is_active }),
    })
    fetchCities(selectedProv)
    setOpenMenuId(null)
  }

  // ─── Filter ─────────────────────────────────────────────────────────────────

  const filteredProvinces = provinces.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchProv.toLowerCase()) ||
                        p.code.toLowerCase().includes(searchProv.toLowerCase())
    const matchStatus = filterStatus === 'semua' ? true :
                        filterStatus === 'aktif' ? p.is_active : !p.is_active
    return matchSearch && matchStatus
  })

  const filteredCities = cities.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(searchCity.toLowerCase())
    const matchStatus = filterStatus === 'semua' ? true :
                        filterStatus === 'aktif' ? c.is_active : !c.is_active
    const matchType   = filterType === 'semua' ? true : c.type === filterType
    return matchSearch && matchStatus && matchType
  })

  // ─── Stat cards ─────────────────────────────────────────────────────────────

  const totalProv   = provinces.length
  const aktifProv   = provinces.filter(p => p.is_active).length
  const totalKota   = cities.length
  const aktifKota   = cities.filter(c => c.is_active).length

  const selectedProvName = provinces.find(p => p.id === selectedProv)?.name ?? '—'

  return (
    <div style={{ padding: '28px 32px', minHeight: '100vh', background: '#fafafa' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>Master Wilayah</h1>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 3 }}>
            {aktifProv} provinsi aktif · {provinces.reduce((s, p) => s + p.city_count, 0)} kab/kota terdaftar
          </p>
        </div>
        {activeTab === 'provinsi' ? (
          <button onClick={() => setDialogProv({ mode: 'tambah' })}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '0.5px solid #85B7EB', background: '#E6F1FB', color: '#185FA5', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            <i className="ti ti-plus" /> Tambah Provinsi
          </button>
        ) : (
          <button onClick={() => setDialogCity({ mode: 'tambah' })}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '0.5px solid #85B7EB', background: '#E6F1FB', color: '#185FA5', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            <i className="ti ti-plus" /> Tambah Kab/Kota
          </button>
        )}
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total provinsi', value: totalProv,  sub: 'Terdaftar di sistem' },
          { label: 'Provinsi aktif', value: aktifProv,  sub: 'Tersedia untuk assign' },
          { label: 'Total kab/kota', value: totalKota || provinces.reduce((s,p)=>s+p.city_count,0), sub: selectedProv && activeTab==='kabkota' ? `Di ${selectedProvName}` : 'Seluruh Indonesia' },
          { label: 'Kab/kota aktif', value: aktifKota || '—', sub: selectedProv && activeTab==='kabkota' ? `Aktif di ${selectedProvName}` : 'Pilih provinsi untuk detail' },
        ].map((s, i) => (
          <div key={i} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.10)', borderRadius: 10, padding: '14px 16px' }}>
            <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>{s.label}</p>
            <p style={{ fontSize: 24, fontWeight: 600, margin: '4px 0 2px' }}>{s.value}</p>
            <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Tab nav */}
      <div style={{ borderBottom: '0.5px solid rgba(0,0,0,0.12)', marginBottom: 16, display: 'flex', gap: 0 }}>
        {(['provinsi', 'kabkota'] as const).map(tab => (
          <button key={tab} onClick={() => { setActiveTab(tab); setFilterStatus('semua'); setFilterType('semua') }}
            style={{ padding: '10px 18px', fontSize: 13, fontWeight: 500, border: 'none', background: 'none', cursor: 'pointer', color: activeTab === tab ? '#1a1a1a' : '#6b7280', borderBottom: activeTab === tab ? '2px solid #1a1a1a' : '2px solid transparent', marginBottom: -1 }}>
            {tab === 'provinsi' ? 'Provinsi' : 'Kab/Kota'}
          </button>
        ))}
      </div>

      {/* Tab konten */}
      <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.10)', borderRadius: 10, overflow: 'hidden' }}>

        {/* ── TAB PROVINSI ────────────────────────────────────────────────── */}
        {activeTab === 'provinsi' && (
          <>
            {/* Toolbar */}
            <div style={{ display: 'flex', gap: 10, padding: '12px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>
              <input
                value={searchProv}
                onChange={e => setSearchProv(e.target.value)}
                placeholder="Cari nama atau kode provinsi..."
                style={{ flex: 1, border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 8, padding: '7px 10px', fontSize: 13 }}
              />
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as typeof filterStatus)}
                style={{ border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 8, padding: '7px 10px', fontSize: 13 }}>
                <option value="semua">Semua status</option>
                <option value="aktif">Aktif</option>
                <option value="nonaktif">Nonaktif</option>
              </select>
            </div>

            {/* Tabel provinsi */}
            {loadingProv ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Memuat data...</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: 40 }} />
                  <col />
                  <col style={{ width: 100 }} />
                  <col style={{ width: 120 }} />
                  <col style={{ width: 100 }} />
                  <col style={{ width: 120 }} />
                  <col style={{ width: 48 }} />
                </colgroup>
                <thead>
                  <tr style={{ borderBottom: '0.5px solid rgba(0,0,0,0.10)', background: '#fafafa' }}>
                    {['No', 'Nama Provinsi', 'Kode BPS', 'Jml Kab/Kota', 'Status', 'Dibuat', ''].map((h, i) => (
                      <th key={i} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 12, color: '#6b7280', fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredProvinces.length === 0 ? (
                    <tr><td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Tidak ada data provinsi</td></tr>
                  ) : filteredProvinces.map((p, idx) => (
                    <tr key={p.id} style={{ borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
                      <td style={{ padding: '10px 12px', fontSize: 13, color: '#9ca3af' }}>{idx + 1}</td>
                      <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 500 }}>{p.name}</td>
                      <td style={{ padding: '10px 12px', fontSize: 12, color: '#6b7280', fontFamily: 'monospace' }}>{p.code}</td>
                      <td style={{ padding: '10px 12px', fontSize: 13 }}>
                        <button onClick={() => { setSelectedProv(p.id); setActiveTab('kabkota') }}
                          style={{ fontSize: 13, color: '#185FA5', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                          {p.city_count} kab/kota
                        </button>
                      </td>
                      <td style={{ padding: '10px 12px' }}><StatusBadge isActive={p.is_active} /></td>
                      <td style={{ padding: '10px 12px', fontSize: 12, color: '#9ca3af' }}>
                        {new Date(p.created_at).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ padding: '10px 8px', position: 'relative' }}>
                        <button onClick={() => setOpenMenuId(openMenuId === p.id ? null : p.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 6, fontSize: 16 }}>⋮</button>
                        {openMenuId === p.id && (
                          <div style={{ position: 'absolute', right: 8, top: 36, zIndex: 20, background: '#fff', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.10)', minWidth: 160, padding: 4 }}>
                            <button onClick={() => { setDialogProv({ mode: 'edit', data: p }); setOpenMenuId(null) }}
                              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, textAlign: 'left', borderRadius: 6 }}>
                              <i className="ti ti-pencil" /> Edit
                            </button>
                            <button onClick={() => toggleProvince(p)}
                              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, textAlign: 'left', borderRadius: 6, color: p.is_active ? '#854F0B' : '#3B6D11' }}>
                              <i className={p.is_active ? 'ti ti-player-pause' : 'ti ti-player-play'} />
                              {p.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div style={{ padding: '10px 16px', borderTop: '0.5px solid rgba(0,0,0,0.08)', fontSize: 12, color: '#9ca3af' }}>
              Menampilkan {filteredProvinces.length} dari {totalProv} provinsi
            </div>
          </>
        )}

        {/* ── TAB KAB/KOTA ────────────────────────────────────────────────── */}
        {activeTab === 'kabkota' && (
          <>
            {/* Toolbar */}
            <div style={{ display: 'flex', gap: 10, padding: '12px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', flexWrap: 'wrap' }}>
              <select value={selectedProv} onChange={e => setSelectedProv(e.target.value)}
                style={{ border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 8, padding: '7px 10px', fontSize: 13, minWidth: 180 }}>
                {provinces.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <input
                value={searchCity}
                onChange={e => setSearchCity(e.target.value)}
                placeholder="Cari nama kab/kota..."
                style={{ flex: 1, minWidth: 160, border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 8, padding: '7px 10px', fontSize: 13 }}
              />
              <select value={filterType} onChange={e => setFilterType(e.target.value as typeof filterType)}
                style={{ border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 8, padding: '7px 10px', fontSize: 13 }}>
                <option value="semua">Semua tipe</option>
                <option value="kota">Kota</option>
                <option value="kabupaten">Kabupaten</option>
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as typeof filterStatus)}
                style={{ border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 8, padding: '7px 10px', fontSize: 13 }}>
                <option value="semua">Semua status</option>
                <option value="aktif">Aktif</option>
                <option value="nonaktif">Nonaktif</option>
              </select>
            </div>

            {/* Tabel kab/kota */}
            {loadingCity ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Memuat data kab/kota...</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: 40 }} />
                  <col />
                  <col style={{ width: 110 }} />
                  <col style={{ width: 100 }} />
                  <col style={{ width: 100 }} />
                  <col style={{ width: 120 }} />
                  <col style={{ width: 48 }} />
                </colgroup>
                <thead>
                  <tr style={{ borderBottom: '0.5px solid rgba(0,0,0,0.10)', background: '#fafafa' }}>
                    {['No', 'Nama', 'Tipe', 'Kode BPS', 'Status', 'Dibuat', ''].map((h, i) => (
                      <th key={i} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 12, color: '#6b7280', fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredCities.length === 0 ? (
                    <tr><td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Pilih provinsi atau tidak ada data</td></tr>
                  ) : filteredCities.map((c, idx) => (
                    <tr key={c.id} style={{ borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
                      <td style={{ padding: '10px 12px', fontSize: 13, color: '#9ca3af' }}>{idx + 1}</td>
                      <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 500 }}>{c.name}</td>
                      <td style={{ padding: '10px 12px' }}><TypeBadge type={c.type} /></td>
                      <td style={{ padding: '10px 12px', fontSize: 12, color: '#6b7280', fontFamily: 'monospace' }}>{c.code ?? '—'}</td>
                      <td style={{ padding: '10px 12px' }}><StatusBadge isActive={c.is_active} /></td>
                      <td style={{ padding: '10px 12px', fontSize: 12, color: '#9ca3af' }}>
                        {new Date(c.created_at).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ padding: '10px 8px', position: 'relative' }}>
                        <button onClick={() => setOpenMenuId(openMenuId === c.id ? null : c.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 6, fontSize: 16 }}>⋮</button>
                        {openMenuId === c.id && (
                          <div style={{ position: 'absolute', right: 8, top: 36, zIndex: 20, background: '#fff', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.10)', minWidth: 160, padding: 4 }}>
                            <button onClick={() => { setDialogCity({ mode: 'edit', data: c }); setOpenMenuId(null) }}
                              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, textAlign: 'left', borderRadius: 6 }}>
                              <i className="ti ti-pencil" /> Edit
                            </button>
                            <button onClick={() => toggleCity(c)}
                              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, textAlign: 'left', borderRadius: 6, color: c.is_active ? '#854F0B' : '#3B6D11' }}>
                              <i className={c.is_active ? 'ti ti-player-pause' : 'ti ti-player-play'} />
                              {c.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div style={{ padding: '10px 16px', borderTop: '0.5px solid rgba(0,0,0,0.08)', fontSize: 12, color: '#9ca3af' }}>
              Menampilkan {filteredCities.length} dari {totalKota} kab/kota di {selectedProvName}
            </div>
          </>
        )}
      </div>

      {/* Overlay klik tutup menu */}
      {openMenuId && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setOpenMenuId(null)} />
      )}

      {/* Dialog Provinsi */}
      {dialogProv && (
        <DialogProvinsi
          mode={dialogProv.mode}
          initial={dialogProv.data}
          onClose={() => setDialogProv(null)}
          onSave={() => { setDialogProv(null); fetchProvinces() }}
        />
      )}

      {/* Dialog Kab/Kota */}
      {dialogCity && (
        <DialogKota
          mode={dialogCity.mode}
          provinceId={selectedProv}
          provinces={provinces}
          initial={dialogCity.data}
          onClose={() => setDialogCity(null)}
          onSave={() => { setDialogCity(null); fetchCities(selectedProv) }}
        />
      )}
    </div>
  )
}
