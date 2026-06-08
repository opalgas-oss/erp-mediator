'use client'
// ARSIP — pra-sesi-17-ui-standar — WilayahClient.tsx
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

  const [dialogProv, setDialogProv]       = useState<{ mode: 'tambah' | 'edit'; data?: ProvinceAdmin } | null>(null)
  const [dialogCity, setDialogCity]       = useState<{ mode: 'tambah' | 'edit'; data?: City } | null>(null)
  const [openMenuId, setOpenMenuId]       = useState<string | null>(null)

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

  async function toggleProvince(p: ProvinceAdmin) {
    await fetch(`/api/superadmin/wilayah/provinces/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !p.is_active }),
    })
    fetchProvinces()
    setOpenMenuId(null)
  }

  async function toggleCity(c: City) {
    await fetch(`/api/superadmin/wilayah/cities/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !c.is_active }),
    })
    fetchCities(selectedProv)
    setOpenMenuId(null)
  }

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

  const totalProv   = provinces.length
  const aktifProv   = provinces.filter(p => p.is_active).length
  const totalKota   = cities.length
  const aktifKota   = cities.filter(c => c.is_active).length
  const selectedProvName = provinces.find(p => p.id === selectedProv)?.name ?? '—'

  return (
    <div style={{ padding: '28px 32px', minHeight: '100vh', background: '#fafafa' }}>
      {/* [ARSIP — tab aktif masih #1a1a1a, belum diperbaiki] */}
      <div style={{ borderBottom: '0.5px solid rgba(0,0,0,0.12)', marginBottom: 16, display: 'flex', gap: 0 }}>
        {(['provinsi', 'kabkota'] as const).map(tab => (
          <button key={tab} onClick={() => { setActiveTab(tab); setFilterStatus('semua'); setFilterType('semua') }}
            style={{ padding: '10px 18px', fontSize: 13, fontWeight: 500, border: 'none', background: 'none', cursor: 'pointer', color: activeTab === tab ? '#1a1a1a' : '#6b7280', borderBottom: activeTab === tab ? '2px solid #1a1a1a' : '2px solid transparent', marginBottom: -1 }}>
            {tab === 'provinsi' ? 'Provinsi' : 'Kab/Kota'}
          </button>
        ))}
      </div>
    </div>
  )
}
