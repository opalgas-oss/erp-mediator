'use client'

// app/dashboard/superadmin/tenants/[id]/DialogTambahKategori.tsx
// Dialog Assign Kategori ke Tenant (G35 — HUTANG-01)
// API: GET  /api/superadmin/tenants/${tenantId}/categories?view=tree → CategoryTreeNode[]
//      GET  /api/superadmin/provinces?category_id=xxx&tenant_id=yyy → ProvinceOption[] + globallyTaken
//      GET  /api/superadmin/provinces/${id}/cities?excluded=id1,id2  → CityOption[]
//      POST /api/superadmin/tenants/${tenantId}/categories            → AssignKategoriPayload
//
// Dibuat: Sesi #143 — M6 Fix HUTANG-01
// Update: Sesi #143 — Coverage area combobox 2-level (Provinsi + Kota)

import { useState, useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import type { CategoryTreeNode } from '@/lib/types/category.types'
import type { AssignKategoriPayload } from '@/lib/types/tenant-category-assignment.types'
import type { ProvinceOption, CityOption, CoverageSelection } from '@/lib/types/province.types'

interface Props {
  tenantId:  string
  open:      boolean
  onClose:   () => void
  onSuccess: () => void
}

// ─── Status style per node kategori ──────────────────────────────────────────

const NODE_STATUS_STYLE: Record<CategoryTreeNode['status'], {
  bg: string; text: string; border: string; label: string; icon: string; selectable: boolean
}> = {
  tersedia:            { bg: '#EAF3DE', text: '#3B6D11', border: '#97C459', label: 'Tersedia',      icon: 'ti-circle-check', selectable: true  },
  dipegang_tenant_ini: { bg: '#E6F1FB', text: '#185FA5', border: '#85B7EB', label: 'Dipegang Anda', icon: 'ti-building',     selectable: false },
  dipegang_tenant_lain:{ bg: '#FCEBEB', text: '#A32D2D', border: '#F09595', label: 'Dipegang Lain', icon: 'ti-lock',         selectable: false },
}

// ─── Province availability style ─────────────────────────────────────────────

const PROV_AVAIL_STYLE = {
  tersedia: { color: '#3B6D11', icon: 'ti-circle-check', label: 'Tersedia' },
  sebagian: { color: '#854F0B', icon: 'ti-alert-triangle', label: 'Sebagian' },
  penuh:    { color: '#A32D2D', icon: 'ti-circle-x', label: 'Penuh' },
}

// ─── Dialog utama ─────────────────────────────────────────────────────────────

export function DialogTambahKategori({ tenantId, open, onClose, onSuccess }: Props) {
  // ── State kategori
  const [tree,         setTree]         = useState<CategoryTreeNode[]>([])
  const [treeLoading,  setTreeLoading]  = useState(false)
  const [catSearch,    setCatSearch]    = useState('')
  const [expanded,     setExpanded]     = useState<Set<string>>(new Set())
  const [selectedId,   setSelectedId]   = useState<string | null>(null)
  const [selectedName, setSelectedName] = useState('')

  // ── State coverage area
  const [provinces,      setProvinces]      = useState<ProvinceOption[]>([])
  const [provLoading,    setProvLoading]    = useState(false)
  const [globallyTaken,  setGloballyTaken]  = useState(false)
  const [provSearch,     setProvSearch]     = useState('')
  const [selectedProv,   setSelectedProv]   = useState<ProvinceOption | null>(null)
  const [cities,         setCities]         = useState<CityOption[]>([])
  const [cityLoading,    setCityLoading]    = useState(false)
  const [citySearch,     setCitySearch]     = useState('')
  const [coverageList,   setCoverageList]   = useState<CoverageSelection[]>([])

  // ── State lain
  const [slaMinutes,  setSlaMinutes]  = useState('')
  const [submitting,  setSubmitting]  = useState(false)
  const [step,        setStep]        = useState<'kategori' | 'coverage' | 'optional'>('kategori')

  const searchRef = useRef<HTMLInputElement>(null)

  // ── Reset saat open ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!open) return
    setTree([]); setTreeLoading(false); setCatSearch(''); setExpanded(new Set())
    setSelectedId(null); setSelectedName('')
    setProvinces([]); setGloballyTaken(false); setProvSearch(''); setSelectedProv(null)
    setCities([]); setCitySearch(''); setCoverageList([])
    setSlaMinutes(''); setStep('kategori')

    setTreeLoading(true)
    fetch(`/api/superadmin/tenants/${tenantId}/categories?view=tree`)
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setTree(json.data)
          if (json.data.length < 6) setExpanded(new Set(json.data.map((n: CategoryTreeNode) => n.id)))
        }
      })
      .catch(() => toast.error('Gagal memuat daftar kategori'))
      .finally(() => { setTreeLoading(false); setTimeout(() => searchRef.current?.focus(), 100) })
  }, [open, tenantId])

  // ── Fetch provinces saat kategori dipilih ──────────────────────────────────

  const fetchProvinces = useCallback(async (categoryId: string) => {
    setProvLoading(true)
    setProvinces([]); setGloballyTaken(false)
    try {
      const res  = await fetch(`/api/superadmin/provinces?category_id=${categoryId}&tenant_id=${tenantId}`)
      const json = await res.json()
      if (json.success) {
        setGloballyTaken(json.data.globallyTaken)
        setProvinces(json.data.provinces ?? [])
      }
    } catch { toast.error('Gagal memuat daftar provinsi') }
    finally { setProvLoading(false) }
  }, [tenantId])

  // ── Fetch cities saat provinsi dipilih ────────────────────────────────────

  const fetchCities = useCallback(async (prov: ProvinceOption) => {
    setCityLoading(true); setCities([]); setCitySearch('')
    const excluded = prov.excluded_city_ids.join(',')
    try {
      const res  = await fetch(`/api/superadmin/provinces/${prov.id}/cities?excluded=${excluded}`)
      const json = await res.json()
      if (json.success) setCities(json.data)
    } catch { toast.error('Gagal memuat daftar kota') }
    finally { setCityLoading(false) }
  }, [])

  // ── Pilih kategori → pindah ke step coverage ──────────────────────────────

  const handleSelectCategory = (id: string, name: string) => {
    setSelectedId(id); setSelectedName(name)
    setStep('coverage')
    fetchProvinces(id)
  }

  // ── Pilih provinsi ────────────────────────────────────────────────────────

  const handleSelectProvince = (prov: ProvinceOption) => {
    if (prov.all_cities_taken) return
    setSelectedProv(prov)
    fetchCities(prov)
  }

  // ── Tambah coverage: Semua Kota di provinsi ───────────────────────────────

  const addSemua = () => {
    if (!selectedProv) return
    const already = coverageList.find(c => c.province_id === selectedProv.id && c.city_id === null)
    if (already) { toast.info('Semua kota di provinsi ini sudah ditambahkan'); return }
    // Hapus entry kota spesifik di provinsi ini karena sudah diganti Semua Kota
    const filtered = coverageList.filter(c => c.province_id !== selectedProv.id)
    setCoverageList([...filtered, {
      province_id: selectedProv.id, province_name: selectedProv.name,
      city_id: null, city_name: null,
    }])
    setSelectedProv(null); setCities([])
  }

  // ── Tambah coverage: kota spesifik ────────────────────────────────────────

  const addCity = (city: CityOption) => {
    if (city.is_excluded) return
    if (!selectedProv) return
    // Cek sudah ada Semua Kota di provinsi ini
    if (coverageList.find(c => c.province_id === selectedProv.id && c.city_id === null)) {
      toast.info('Semua Kota sudah mencakup kota ini'); return
    }
    const already = coverageList.find(c => c.city_id === city.id)
    if (already) { toast.info('Kota ini sudah ditambahkan'); return }
    setCoverageList(prev => [...prev, {
      province_id: selectedProv.id, province_name: selectedProv.name,
      city_id: city.id, city_name: city.name,
    }])
  }

  // ── Hapus coverage ────────────────────────────────────────────────────────

  const removeCoverage = (idx: number) => {
    setCoverageList(prev => prev.filter((_, i) => i !== idx))
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!selectedId) { toast.error('Pilih kategori terlebih dahulu'); return }
    if (coverageList.length === 0) { toast.error('Tambahkan minimal satu area coverage'); return }
    setSubmitting(true)
    try {
      const payload: AssignKategoriPayload = {
        tenant_id:           tenantId,
        category_id:         selectedId,
        commission_override: null,
        coverage_areas:      null,  // legacy field
        sla_minutes:         slaMinutes ? parseInt(slaMinutes, 10) : null,
        coverage_area_entries: coverageList.map(c => ({
          province_id: c.province_id,
          city_id:     c.city_id,
        })),
      }
      const res  = await fetch(`/api/superadmin/tenants/${tenantId}/categories`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (json.success) { toast.success(`Kategori "${selectedName}" berhasil ditugaskan`); onSuccess(); onClose() }
      else { toast.error(json.message ?? 'Gagal assign kategori') }
    } catch { toast.error('Terjadi kesalahan saat assign kategori') }
    finally { setSubmitting(false) }
  }

  // ── Render node kategori ──────────────────────────────────────────────────

  const renderNode = (node: CategoryTreeNode, isRoot: boolean) => {
    const style   = NODE_STATUS_STYLE[node.status]
    const isSelected  = selectedId === node.id
    const hasChildren = node.sub_nodes.length > 0
    const isExpanded  = expanded.has(node.id)

    return (
      <div key={node.id}>
        <div
          onClick={() => style.selectable && node.is_active && handleSelectCategory(node.id, node.display_name)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: isRoot ? '9px 12px' : '7px 12px 7px 32px',
            cursor: style.selectable && node.is_active ? 'pointer' : 'default',
            background: isSelected ? '#EAF3DE' : 'transparent',
            borderLeftWidth: isSelected ? 3 : 0, borderLeftStyle: 'solid', borderLeftColor: '#97C459',
            opacity: !node.is_active ? 0.45 : 1,
          }}
          onMouseEnter={e => { if (style.selectable && node.is_active && !isSelected) e.currentTarget.style.background = '#f9f9f8' }}
          onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
        >
          {isRoot && hasChildren ? (
            <button onClick={e => { e.stopPropagation(); setExpanded(prev => { const n = new Set(prev); n.has(node.id) ? n.delete(node.id) : n.add(node.id); return n }) }}
              style={{ padding: 2, background: 'transparent', border: 'none', cursor: 'pointer', color: '#6b7280', lineHeight: 1 }}>
              <i className={`ti ${isExpanded ? 'ti-chevron-down' : 'ti-chevron-right'}`} style={{ fontSize: 12 }} />
            </button>
          ) : isRoot ? <span style={{ width: 18 }} /> : null}
          {node.icon_bg && node.icon_name
            ? <span style={{ width: 24, height: 24, borderRadius: 6, background: node.icon_bg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className={`ti ${node.icon_name}`} style={{ fontSize: 13, color: '#fff' }} />
              </span>
            : <span style={{ width: 24, height: 24, borderRadius: 6, background: '#f3f4f6', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className="ti ti-category" style={{ fontSize: 13, color: '#9ca3af' }} />
              </span>}
          <span style={{ flex: 1, fontSize: 13, fontWeight: isRoot ? 500 : 400, color: '#1a1a1a' }}>{node.display_name}</span>
          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 100,
            background: style.bg, color: style.text,
            borderWidth: '0.5px', borderStyle: 'solid', borderColor: style.border,
            display: 'inline-flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
            <i className={`ti ${style.icon}`} style={{ fontSize: 10 }} />
            {node.tenant_pemegang ? `${style.label}: ${node.tenant_pemegang}` : style.label}
          </span>
        </div>
        {isRoot && isExpanded && node.sub_nodes.map(s => renderNode(s, false))}
      </div>
    )
  }

  if (!open) return null

  // ── Filtered lists ────────────────────────────────────────────────────────

  const filteredTree  = catSearch.trim()
    ? tree.flatMap(root => {
        const rm = root.display_name.toLowerCase().includes(catSearch.toLowerCase())
        const sm = root.sub_nodes.filter(s => s.display_name.toLowerCase().includes(catSearch.toLowerCase()))
        if (rm) return [root]; if (sm.length) return [{ ...root, sub_nodes: sm }]; return []
      })
    : tree

  const filteredProvs = provSearch.trim()
    ? provinces.filter(p => p.name.toLowerCase().includes(provSearch.toLowerCase()))
    : provinces

  const filteredCities = citySearch.trim()
    ? cities.filter(c => c.name.toLowerCase().includes(citySearch.toLowerCase()))
    : cities

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 620, maxHeight: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>

        {/* Header + Step indicator */}
        <div style={{ padding: '14px 16px', borderBottomWidth: '0.5px', borderBottomStyle: 'solid', borderBottomColor: 'rgba(0,0,0,0.12)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>Tambah Kategori</div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                {step === 'kategori' ? 'Langkah 1: Pilih kategori' : step === 'coverage' ? `Langkah 2: Atur coverage area — ${selectedName}` : `Langkah 3: Pengaturan opsional`}
              </div>
            </div>
            <button onClick={onClose} style={{ padding: '4px 8px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 18 }}>
              <i className="ti ti-x" />
            </button>
          </div>
          {/* Step dots */}
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            {(['kategori','coverage','optional'] as const).map((s, i) => (
              <div key={s} style={{ height: 3, flex: 1, borderRadius: 2, background: step === s ? '#185FA5' : i < ['kategori','coverage','optional'].indexOf(step) ? '#97C459' : '#e5e7eb' }} />
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>

          {/* ── STEP 1: Pilih Kategori ─────────────────────────────────── */}
          {step === 'kategori' && (
            <>
              <div style={{ position: 'relative', marginBottom: 10 }}>
                <i className="ti ti-search" style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#9ca3af' }} />
                <input ref={searchRef} value={catSearch} onChange={e => setCatSearch(e.target.value)}
                  placeholder="Cari kategori..."
                  style={{ width: '100%', padding: '7px 10px 7px 30px', borderWidth: '0.5px', borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.12)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
              <div style={{ border: '0.5px solid rgba(0,0,0,0.12)', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ padding: '7px 12px', background: '#f9f9f8', fontSize: 10, color: '#6b7280', borderBottomWidth: '0.5px', borderBottomStyle: 'solid', borderBottomColor: 'rgba(0,0,0,0.08)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {Object.entries(NODE_STATUS_STYLE).map(([key, val]) => (
                    <span key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: '#6b7280' }}>
                      <span style={{ width: 8, height: 8, borderRadius: 50, background: val.bg, border: `1px solid ${val.border}`, display: 'inline-block' }} />
                      {val.label}
                    </span>
                  ))}
                </div>
                <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                  {treeLoading ? (
                    <div style={{ padding: '24px 0', textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
                      <i className="ti ti-loader-2 ti-spin" style={{ fontSize: 20, display: 'block', marginBottom: 6 }} />Memuat…
                    </div>
                  ) : filteredTree.length === 0 ? (
                    <div style={{ padding: '24px 0', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                      <i className="ti ti-search-off" style={{ fontSize: 24, display: 'block', marginBottom: 6 }} />Tidak ditemukan
                    </div>
                  ) : filteredTree.map(n => renderNode(n, true))}
                </div>
              </div>
            </>
          )}

          {/* ── STEP 2: Coverage Area ──────────────────────────────────── */}
          {step === 'coverage' && (
            <>
              {globallyTaken ? (
                <div style={{ padding: '16px 14px', background: '#FCEBEB', borderWidth: '0.5px', borderStyle: 'solid', borderColor: '#F09595', borderRadius: 10, fontSize: 13, color: '#A32D2D' }}>
                  <i className="ti ti-lock" style={{ marginRight: 6 }} />
                  Kategori ini sudah di-assign oleh tenant lain dengan cakupan <strong>Seluruh Indonesia</strong>. Tidak ada area yang bisa ditambahkan.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

                  {/* Panel kiri: pilih provinsi */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 500, color: '#6b7280', marginBottom: 6 }}>Pilih Provinsi</div>
                    <div style={{ position: 'relative', marginBottom: 8 }}>
                      <i className="ti ti-search" style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#9ca3af' }} />
                      <input value={provSearch} onChange={e => setProvSearch(e.target.value)}
                        placeholder="Cari provinsi..."
                        style={{ width: '100%', padding: '6px 8px 6px 26px', borderWidth: '0.5px', borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.12)', borderRadius: 8, fontSize: 12, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ border: '0.5px solid rgba(0,0,0,0.12)', borderRadius: 8, maxHeight: 260, overflowY: 'auto' }}>
                      {provLoading ? (
                        <div style={{ padding: '16px 0', textAlign: 'center', color: '#6b7280', fontSize: 12 }}>
                          <i className="ti ti-loader-2 ti-spin" style={{ fontSize: 16, display: 'block', marginBottom: 4 }} />Memuat…
                        </div>
                      ) : filteredProvs.length === 0 ? (
                        <div style={{ padding: '16px', textAlign: 'center', color: '#9ca3af', fontSize: 12 }}>Tidak ditemukan</div>
                      ) : filteredProvs.map(prov => {
                        const avail = PROV_AVAIL_STYLE[prov.availability]
                        const isSelected = selectedProv?.id === prov.id
                        return (
                          <div key={prov.id}
                            onClick={() => handleSelectProvince(prov)}
                            style={{
                              padding: '8px 10px', cursor: prov.all_cities_taken ? 'not-allowed' : 'pointer',
                              background: isSelected ? '#E6F1FB' : 'transparent',
                              opacity: prov.all_cities_taken ? 0.5 : 1,
                              borderBottomWidth: '0.5px', borderBottomStyle: 'solid', borderBottomColor: 'rgba(0,0,0,0.06)',
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6,
                            }}
                            onMouseEnter={e => { if (!prov.all_cities_taken && !isSelected) e.currentTarget.style.background = '#f9f9f8' }}
                            onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                          >
                            <span style={{ fontSize: 12, color: '#1a1a1a', fontWeight: isSelected ? 500 : 400 }}>{prov.name}</span>
                            <i className={`ti ${avail.icon}`} style={{ fontSize: 11, color: avail.color, flexShrink: 0 }} title={avail.label} />
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Panel kanan: pilih kota */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 500, color: '#6b7280', marginBottom: 6 }}>
                      {selectedProv ? `Pilih Kota — ${selectedProv.name}` : 'Pilih kota (pilih provinsi dulu)'}
                    </div>
                    {selectedProv && (
                      <div style={{ position: 'relative', marginBottom: 8 }}>
                        <i className="ti ti-search" style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#9ca3af' }} />
                        <input value={citySearch} onChange={e => setCitySearch(e.target.value)}
                          placeholder="Cari kota..."
                          style={{ width: '100%', padding: '6px 8px 6px 26px', borderWidth: '0.5px', borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.12)', borderRadius: 8, fontSize: 12, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                      </div>
                    )}
                    <div style={{ border: '0.5px solid rgba(0,0,0,0.12)', borderRadius: 8, maxHeight: selectedProv ? 232 : 260, overflowY: 'auto' }}>
                      {!selectedProv ? (
                        <div style={{ padding: '16px', textAlign: 'center', color: '#9ca3af', fontSize: 12 }}>
                          <i className="ti ti-arrow-left" style={{ marginRight: 4 }} />Pilih provinsi
                        </div>
                      ) : cityLoading ? (
                        <div style={{ padding: '16px 0', textAlign: 'center', color: '#6b7280', fontSize: 12 }}>
                          <i className="ti ti-loader-2 ti-spin" style={{ fontSize: 16, display: 'block', marginBottom: 4 }} />Memuat…
                        </div>
                      ) : (
                        <>
                          {/* Opsi: Semua Kota */}
                          <div onClick={addSemua}
                            style={{ padding: '8px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                              background: coverageList.find(c => c.province_id === selectedProv.id && c.city_id === null) ? '#EAF3DE' : 'transparent',
                              borderBottomWidth: '0.5px', borderBottomStyle: 'solid', borderBottomColor: 'rgba(0,0,0,0.06)' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f9f9f8'}
                            onMouseLeave={e => e.currentTarget.style.background = coverageList.find(c => c.province_id === selectedProv.id && c.city_id === null) ? '#EAF3DE' : 'transparent'}
                          >
                            <i className="ti ti-map-2" style={{ fontSize: 12, color: '#185FA5' }} />
                            <span style={{ fontSize: 12, fontWeight: 500, color: '#185FA5' }}>Semua Kota</span>
                          </div>
                          {/* Daftar kota */}
                          {filteredCities.map(city => (
                            <div key={city.id}
                              onClick={() => addCity(city)}
                              style={{
                                padding: '8px 10px', cursor: city.is_excluded ? 'not-allowed' : 'pointer',
                                opacity: city.is_excluded ? 0.45 : 1,
                                background: coverageList.find(c => c.city_id === city.id) ? '#EAF3DE' : 'transparent',
                                borderBottomWidth: '0.5px', borderBottomStyle: 'solid', borderBottomColor: 'rgba(0,0,0,0.06)',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              }}
                              onMouseEnter={e => { if (!city.is_excluded) e.currentTarget.style.background = '#f9f9f8' }}
                              onMouseLeave={e => e.currentTarget.style.background = coverageList.find(c => c.city_id === city.id) ? '#EAF3DE' : 'transparent'}
                            >
                              <span style={{ fontSize: 12, color: '#1a1a1a' }}>{city.name}</span>
                              <span style={{ fontSize: 10, color: '#9ca3af', textTransform: 'capitalize' }}>{city.type}</span>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Coverage list yang sudah dipilih */}
              {coverageList.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: '#6b7280', marginBottom: 6 }}>
                    Coverage yang dipilih ({coverageList.length}):
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {coverageList.map((c, idx) => (
                      <span key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px',
                        background: '#E6F1FB', borderWidth: '0.5px', borderStyle: 'solid', borderColor: '#85B7EB',
                        borderRadius: 100, fontSize: 11, color: '#185FA5' }}>
                        <i className="ti ti-map-pin" style={{ fontSize: 10 }} />
                        {c.province_name}{c.city_name ? ` — ${c.city_name}` : ' — Semua Kota'}
                        <button onClick={() => removeCoverage(idx)}
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#185FA5', padding: 0, lineHeight: 1, display: 'flex' }}>
                          <i className="ti ti-x" style={{ fontSize: 10 }} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── STEP 3: Opsional ──────────────────────────────────────── */}
          {step === 'optional' && (
            <div style={{ border: '0.5px solid rgba(0,0,0,0.12)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '9px 12px', background: '#f9f9f8', fontSize: 11, fontWeight: 500, color: '#6b7280',
                borderBottomWidth: '0.5px', borderBottomStyle: 'solid', borderBottomColor: 'rgba(0,0,0,0.08)' }}>
                Pengaturan Opsional
              </div>
              <div style={{ padding: '12px 14px' }}>
                <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 5 }}>
                  SLA Respon (menit) — opsional
                </label>
                <input type="number" min="1" value={slaMinutes} onChange={e => setSlaMinutes(e.target.value)}
                  placeholder="Contoh: 60"
                  style={{ width: 160, padding: '6px 10px', borderWidth: '0.5px', borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.12)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }} />
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Kosongkan = ikut SLA standar platform</div>

                {/* Summary sebelum submit */}
                <div style={{ marginTop: 16, padding: '12px 14px', background: '#f9f9f8', borderRadius: 8, fontSize: 12 }}>
                  <div style={{ fontWeight: 500, marginBottom: 6 }}>Ringkasan:</div>
                  <div style={{ color: '#6b7280' }}>Kategori: <span style={{ color: '#1a1a1a', fontWeight: 500 }}>{selectedName}</span></div>
                  <div style={{ color: '#6b7280', marginTop: 4 }}>Coverage: {coverageList.length} area dipilih</div>
                  {slaMinutes && <div style={{ color: '#6b7280', marginTop: 4 }}>SLA: {slaMinutes} menit</div>}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px',
          borderTopWidth: '0.5px', borderTopStyle: 'solid', borderTopColor: 'rgba(0,0,0,0.12)', flexShrink: 0 }}>
          <div>
            {step !== 'kategori' && (
              <button onClick={() => setStep(step === 'optional' ? 'coverage' : 'kategori')}
                style={{ padding: '6px 14px', borderWidth: '0.5px', borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.22)', borderRadius: 8, fontSize: 13, cursor: 'pointer', background: '#fff', color: '#6b7280' }}>
                <i className="ti ti-arrow-left" style={{ marginRight: 4 }} />Kembali
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} disabled={submitting}
              style={{ padding: '6px 14px', borderWidth: '0.5px', borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.22)', borderRadius: 8, fontSize: 13, cursor: 'pointer', background: '#fff', color: '#1a1a1a' }}>
              Batal
            </button>
            {step === 'kategori' && (
              <button onClick={() => { if (selectedId) setStep('coverage') }}
                disabled={!selectedId}
                style={{ padding: '6px 16px', borderWidth: '0.5px', borderStyle: 'solid', fontSize: 13, borderRadius: 8,
                  borderColor: !selectedId ? 'rgba(0,0,0,0.12)' : '#85B7EB',
                  background: !selectedId ? '#f3f4f6' : '#E6F1FB',
                  color: !selectedId ? '#9ca3af' : '#185FA5', cursor: !selectedId ? 'not-allowed' : 'pointer' }}>
                Lanjut <i className="ti ti-arrow-right" style={{ marginLeft: 4 }} />
              </button>
            )}
            {step === 'coverage' && (
              <button onClick={() => { if (coverageList.length > 0) setStep('optional') }}
                disabled={coverageList.length === 0 || globallyTaken}
                style={{ padding: '6px 16px', borderWidth: '0.5px', borderStyle: 'solid', fontSize: 13, borderRadius: 8,
                  borderColor: coverageList.length === 0 || globallyTaken ? 'rgba(0,0,0,0.12)' : '#85B7EB',
                  background: coverageList.length === 0 || globallyTaken ? '#f3f4f6' : '#E6F1FB',
                  color: coverageList.length === 0 || globallyTaken ? '#9ca3af' : '#185FA5',
                  cursor: coverageList.length === 0 || globallyTaken ? 'not-allowed' : 'pointer' }}>
                Lanjut <i className="ti ti-arrow-right" style={{ marginLeft: 4 }} />
              </button>
            )}
            {step === 'optional' && (
              <button onClick={handleSubmit} disabled={submitting}
                style={{ padding: '6px 18px', borderWidth: '0.5px', borderStyle: 'solid', fontSize: 13, borderRadius: 8, fontWeight: 500,
                  borderColor: submitting ? 'rgba(0,0,0,0.12)' : '#85B7EB',
                  background: submitting ? '#f3f4f6' : '#E6F1FB',
                  color: submitting ? '#9ca3af' : '#185FA5',
                  cursor: submitting ? 'not-allowed' : 'pointer' }}>
                {submitting ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <i className="ti ti-loader-2 ti-spin" style={{ fontSize: 13 }} />Menyimpan…
                </span> : 'Assign Kategori'}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
