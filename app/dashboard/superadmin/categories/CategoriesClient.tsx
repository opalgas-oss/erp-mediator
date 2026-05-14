'use client'

// app/dashboard/superadmin/categories/CategoriesClient.tsx
// Orchestrator halaman List Categories — toolbar + 8-kolom tabel + kebab kondisional
// Style: konsisten dengan Tab Info Umum (inline design tokens)
// Fix: G47 (2 tombol terpisah), G48 (8 kolom), G49 (tenant detail), G50 (level badge),
//      G51 (ikon root), G52 (kebab kondisional), G53 (4 filter), G54 (Expand semua)
//
// Dibuat: Sesi #132 — M6 FASE 3 Step 3.7
// Diupdate: Sesi #141 — M6 Fix Fase F

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { DialogBuatKategori } from './DialogBuatKategori'
import type { CategoryListItem, CategoryStats } from '@/lib/types/category.types'

interface Props {
  initialData:  CategoryListItem[]
  initialStats: CategoryStats
  initialTotal: number
}

// ─── Ikon + warna per root (cycling) ──────────────────────────────────────────

const ICON_COLORS = [
  { bg: '#E6F1FB', color: '#185FA5' }, // biru
  { bg: '#FBEAF0', color: '#993556' }, // pink
  { bg: '#EAF3DE', color: '#3B6D11' }, // hijau
  { bg: '#FAEEDA', color: '#854F0B' }, // amber
  { bg: '#EEEDFE', color: '#534AB7' }, // ungu
  { bg: '#F1EFE8', color: '#5F5E5A' }, // abu
]

// Default ikon per slug root kategori (fallback kalau icon_name di DB null/kosong).
// Slug yang tidak ada di mapping ini → default 'ti-tag' (ikon tag generic).
const DEFAULT_ICON_BY_SLUG: Record<string, string> = {
  otomotif:        'ti-car',
  'rumah-properti':'ti-home',
  rumah:           'ti-home',
  properti:        'ti-home',
  kecantikan:      'ti-sparkles',
  'kecantikan-perawatan': 'ti-sparkles',
  kuliner:         'ti-chef-hat',
  makanan:         'ti-chef-hat',
  konstruksi:      'ti-building-factory',
  bangunan:        'ti-building-factory',
  edukasi:         'ti-school',
  pendidikan:      'ti-school',
  teknologi:       'ti-device-laptop',
  digital:         'ti-device-laptop',
  kesehatan:       'ti-stethoscope',
  fashion:         'ti-shirt',
  transportasi:    'ti-truck',
  jasa:            'ti-tools',
}

function resolveIcon(iconName: string | null, slug: string): string {
  if (iconName && iconName.startsWith('ti-')) return iconName
  if (iconName)                                return `ti-${iconName}`
  // Cari berdasarkan slug — exact match dulu, lalu prefix match
  if (DEFAULT_ICON_BY_SLUG[slug])              return DEFAULT_ICON_BY_SLUG[slug]
  for (const [key, icon] of Object.entries(DEFAULT_ICON_BY_SLUG)) {
    if (slug.startsWith(key)) return icon
  }
  return 'ti-tag'
}

// ─── Style helpers ────────────────────────────────────────────────────────────

const S = {
  card:  { background: '#fff', borderWidth: '0.5px', borderStyle: 'solid' as const, borderColor: 'rgba(0,0,0,0.12)', borderRadius: 12 } as React.CSSProperties,
  input: { padding: '7px 10px 7px 28px', borderWidth: '0.5px', borderStyle: 'solid' as const, borderColor: 'rgba(0,0,0,0.12)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', background: '#fff' } as React.CSSProperties,
  select: { padding: '7px 10px', borderWidth: '0.5px', borderStyle: 'solid' as const, borderColor: 'rgba(0,0,0,0.12)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', background: '#fff' } as React.CSSProperties,
}

// ─── Komponen ─────────────────────────────────────────────────────────────────

export function CategoriesClient({ initialData, initialStats, initialTotal }: Props) {
  const [data,       setData]       = useState<CategoryListItem[]>(initialData)
  const [stats,      setStats]      = useState<CategoryStats>(initialStats)
  const [total,      setTotal]      = useState(initialTotal)
  const [loading,    setLoading]    = useState(false)
  const [search,     setSearch]     = useState('')
  const [filterLvl,  setFilterLvl]  = useState('')
  const [filterStat, setFilterStat] = useState('')
  const [filterAsgn, setFilterAsgn] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'root' | 'sub'>('root')
  const [editTarget, setEditTarget] = useState<CategoryListItem | null>(null)
  const [expanded,   setExpanded]   = useState<Set<string>>(new Set())
  const [openKebab,  setOpenKebab]  = useState<string | null>(null)

  const fetchData = useCallback(async (q?: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '50' })
      if (q) params.set('search', q)
      const res  = await fetch(`/api/superadmin/categories?${params}`)
      const json = await res.json()
      if (json.success) { setData(json.data); setStats(json.stats); setTotal(json.total) }
    } catch { toast.error('Gagal memuat data kategori') }
    finally { setLoading(false) }
  }, [])

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const openDialog = (mode: 'root' | 'sub', edit?: CategoryListItem) => {
    setDialogMode(mode)
    setEditTarget(edit ?? null)
    setDialogOpen(true)
  }

  const filtered = data.filter(c => {
    if (search && !c.display_name.toLowerCase().includes(search.toLowerCase())) return false
    if (filterLvl && String(c.level) !== filterLvl) return false
    if (filterStat === 'active' && !c.is_active) return false
    if (filterStat === 'inactive' && c.is_active) return false
    if (filterAsgn === 'assigned' && (c.total_tenants ?? 0) === 0) return false
    if (filterAsgn === 'unassigned' && (c.total_tenants ?? 0) > 0) return false
    return true
  })

  const roots = filtered.filter(c => c.level === 1)
  const subs  = filtered.filter(c => c.level === 2)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 24 }}>

      {/* Header — 2 tombol terpisah (G47) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: '#1a1a1a' }}>Master Kategori</h1>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
            {stats.total_root} kategori root · {stats.total_sub} sub-kategori
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => openDialog('sub')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer', borderWidth: '0.5px', borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.22)', color: '#1a1a1a', background: 'transparent' }}
          >
            <i className="ti ti-plus" /> Tambah sub-kategori
          </button>
          <button
            onClick={() => openDialog('root')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer', borderWidth: '0.5px', borderStyle: 'solid', borderColor: '#85B7EB', color: '#185FA5', background: '#E6F1FB' }}
          >
            <i className="ti ti-folder-plus" /> Tambah kategori root
          </button>
        </div>
      </div>

      {/* Stats — 4 kartu */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
        {[
          { label: 'Total kategori root',      val: stats.total_root,        sub: 'Pilar utama platform' },
          { label: 'Total sub-kategori',       val: stats.total_sub,         sub: `Di bawah ${stats.total_root} root` },
          { label: 'Kategori aktif di-assign', val: stats.total_assigned,    sub: 'Dipegang minimal 1 tenant' },
          { label: 'Kategori belum di-assign', val: stats.total_unassigned,  sub: 'Tersedia di pool platform' },
        ].map(({ label, val, sub }) => (
          <div key={label} style={{ ...S.card, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 3 }}>{label}</div>
            <div style={{ fontSize: 18, fontWeight: 500 }}>{val}</div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Toolbar — 4 filter (G53) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative' }}>
          <i className="ti ti-search" style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#9ca3af' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama kategori..."
            style={{ ...S.input, width: 220 }}
          />
        </div>
        <select value={filterLvl} onChange={e => setFilterLvl(e.target.value)} style={S.select}>
          <option value="">Semua level</option>
          <option value="1">Root saja</option>
          <option value="2">Sub-kategori saja</option>
        </select>
        <select value={filterStat} onChange={e => setFilterStat(e.target.value)} style={S.select}>
          <option value="">Semua status</option>
          <option value="active">Aktif</option>
          <option value="inactive">Nonaktif</option>
        </select>
        <select value={filterAsgn} onChange={e => setFilterAsgn(e.target.value)} style={S.select}>
          <option value="">Semua assignment</option>
          <option value="assigned">Sudah di-assign</option>
          <option value="unassigned">Belum di-assign</option>
        </select>
      </div>

      {/* Tabel — 8 kolom (G48) */}
      <div style={{ ...S.card, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>Memuat data kategori…</div>
        ) : roots.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <i className="ti ti-category" style={{ fontSize: 32, color: '#9ca3af', display: 'block', marginBottom: 8 }} />
            <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 500 }}>Belum ada kategori</div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Klik &quot;Tambah kategori root&quot; untuk memulai</div>
          </div>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: 13 }}>
              <colgroup>
                <col style={{ width: '4%'  }} />
                <col style={{ width: '30%' }} />
                <col style={{ width: '9%'  }} />
                <col style={{ width: '17%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '8%'  }} />
                <col style={{ width: '6%'  }} />
              </colgroup>
              <thead>
                <tr style={{ background: '#f9f9f8' }}>
                  {['', 'Nama kategori', 'Level', 'Tenant yang memegang', 'Vendor aktif', 'Status', 'Dibuat', ''].map((h, i) => (
                    <th key={i} style={{ padding: '10px 14px', fontSize: 11, fontWeight: 500, color: '#6b7280', textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {roots.map((root, rootIdx) => {
                  const subList = subs.filter(s => s.parent_id === root.id)
                  const isOpen  = expanded.has(root.id)
                  const iconColor = ICON_COLORS[rootIdx % ICON_COLORS.length]

                  return [
                    /* Root row */
                    <tr key={root.id}
                      style={{ borderTopWidth: '0.5px', borderTopStyle: 'solid', borderTopColor: 'rgba(0,0,0,0.12)', background: '#fff', opacity: root.is_active ? 1 : 0.7 }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f9f9f8')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                    >
                      {/* Expand */}
                      <td style={{ textAlign: 'center', padding: '11px 0' }}>
                        {subList.length > 0 && (
                          <button onClick={() => toggleExpand(root.id)}
                            style={{ background: 'transparent', borderWidth: 0, cursor: 'pointer', padding: '3px 5px', color: '#6b7280', fontSize: 14, transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>
                            <i className="ti ti-chevron-right" />
                          </button>
                        )}
                      </td>

                      {/* Nama kategori dengan ikon (G51) */}
                      <td style={{ padding: '11px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, background: iconColor.bg, color: iconColor.color }}>
                            <i className={`ti ${resolveIcon(root.icon_name, root.slug)}`} />
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 500 }}>{root.display_name}</div>
                            <div style={{ fontSize: 11, color: '#6b7280', fontFamily: 'monospace', marginTop: 1 }}>{root.slug}</div>
                          </div>
                        </div>
                      </td>

                      {/* Level badge (G50) */}
                      <td style={{ padding: '11px 14px' }}>
                        <span style={{ display: 'inline-flex', padding: '2px 7px', borderRadius: 100, fontSize: 10, fontWeight: 500, borderWidth: '0.5px', borderStyle: 'solid', background: '#E6F1FB', color: '#185FA5', borderColor: '#85B7EB' }}>
                          Root
                        </span>
                      </td>

                      {/* Tenant (G49) */}
                      <td style={{ padding: '11px 14px' }}>
                        {(root.total_tenants ?? 0) === 0 ? (
                          <span style={{ color: '#9ca3af', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <i className="ti ti-minus" style={{ fontSize: 11 }} /> Belum di-assign
                          </span>
                        ) : (
                          <>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#97C459' }} />
                              {root.total_tenants} tenant
                            </div>
                            {root.tenant_names && root.tenant_names.length > 0 && (
                              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                                {root.tenant_names.slice(0, 2).join(', ')}
                                {root.tenant_names.length > 2 && ` +${root.tenant_names.length - 2}`}
                              </div>
                            )}
                          </>
                        )}
                      </td>

                      {/* Vendor aktif (G48) */}
                      <td style={{ padding: '11px 14px', fontSize: 13 }}>
                        {root.total_vendors ?? 0} vendor
                      </td>

                      {/* Status */}
                      <td style={{ padding: '11px 14px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px',
                          borderRadius: 100, fontSize: 11, fontWeight: 500,
                          borderWidth: '0.5px', borderStyle: 'solid',
                          background:  root.is_active ? '#EAF3DE' : '#f9f9f8',
                          color:       root.is_active ? '#3B6D11' : '#6b7280',
                          borderColor: root.is_active ? '#97C459' : 'rgba(0,0,0,0.12)',
                        }}>
                          <i className={`ti ${root.is_active ? 'ti-circle-check' : 'ti-eye-off'}`} style={{ fontSize: 10 }} />
                          {root.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>

                      {/* Dibuat (G48) */}
                      <td style={{ padding: '11px 14px', fontSize: 12, color: '#6b7280' }}>
                        {new Date(root.created_at).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}
                      </td>

                      {/* Kebab (G52) */}
                      <td style={{ padding: '11px 8px', position: 'relative' }}>
                        <button onClick={() => setOpenKebab(openKebab === root.id ? null : root.id)}
                          style={{ padding: '4px 8px', borderWidth: 0, background: 'transparent', cursor: 'pointer', borderRadius: 6, fontSize: 16, color: '#6b7280' }}>
                          <i className="ti ti-dots-vertical" />
                        </button>
                        {openKebab === root.id && (
                          <div style={{ position: 'absolute', right: 8, top: '100%', background: '#fff', borderWidth: '0.5px', borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.12)', borderRadius: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 50, minWidth: 200, overflow: 'hidden' }}
                            onMouseLeave={() => setOpenKebab(null)}>
                            <button onClick={() => { setOpenKebab(null); openDialog('root', root) }}
                              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', width: '100%', background: 'transparent', borderWidth: 0, cursor: 'pointer', fontSize: 13, color: '#1a1a1a', fontFamily: 'inherit', textAlign: 'left' }}>
                              <i className="ti ti-edit" /> Edit kategori
                            </button>
                            <button onClick={() => { setOpenKebab(null); openDialog('sub') }}
                              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', width: '100%', background: 'transparent', borderWidth: 0, cursor: 'pointer', fontSize: 13, color: '#1a1a1a', fontFamily: 'inherit', textAlign: 'left' }}>
                              <i className="ti ti-plus" /> Tambah sub-kategori
                            </button>
                            <div style={{ height: '0.5px', background: 'rgba(0,0,0,0.12)', margin: '2px 0' }} />
                            <button onClick={() => { setOpenKebab(null); toast.info('Segera tersedia') }}
                              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', width: '100%', background: 'transparent', borderWidth: 0, cursor: 'pointer', fontSize: 13, color: '#854F0B', fontFamily: 'inherit', textAlign: 'left' }}>
                              <i className="ti ti-eye-off" /> {root.is_active ? 'Nonaktifkan' : 'Aktifkan kembali'}
                            </button>
                            <button disabled={(root.total_tenants ?? 0) > 0}
                              onClick={() => { setOpenKebab(null); toast.info('Segera tersedia') }}
                              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', width: '100%', background: 'transparent', borderWidth: 0, cursor: (root.total_tenants ?? 0) > 0 ? 'not-allowed' : 'pointer', fontSize: 13, color: '#A32D2D', fontFamily: 'inherit', textAlign: 'left', opacity: (root.total_tenants ?? 0) > 0 ? 0.4 : 1 }}>
                              <i className="ti ti-trash" /> Hapus{(root.total_tenants ?? 0) > 0 ? ' (ada assignment)' : ''}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>,

                    /* Sub rows */
                    ...(isOpen ? subList.map(sub => (
                      <tr key={sub.id}
                        style={{ borderTopWidth: '0.5px', borderTopStyle: 'solid', borderTopColor: 'rgba(0,0,0,0.12)', background: '#f9f9f8' }}
                      >
                        <td />
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 28 }}>
                            <div style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, background: '#fff', color: '#6b7280', borderWidth: '0.5px', borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.12)' }}>
                              <i className={`ti ${sub.icon_name ? (sub.icon_name.startsWith('ti-') ? sub.icon_name : `ti-${sub.icon_name}`) : 'ti-tag'}`} />
                            </div>
                            <div>
                              <div style={{ fontSize: 13 }}>{sub.display_name}</div>
                              <div style={{ fontSize: 11, color: '#6b7280', fontFamily: 'monospace' }}>{sub.slug}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ display: 'inline-flex', padding: '2px 7px', borderRadius: 100, fontSize: 10, fontWeight: 500, borderWidth: '0.5px', borderStyle: 'solid', background: '#f9f9f8', color: '#6b7280', borderColor: 'rgba(0,0,0,0.12)' }}>
                            Sub
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 12 }}>
                          {(sub.total_tenants ?? 0) === 0
                            ? <span style={{ color: '#9ca3af' }}>—</span>
                            : `${sub.total_tenants} tenant`}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 13 }}>{sub.total_vendors ?? 0} vendor</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 100, fontSize: 11, fontWeight: 500, borderWidth: '0.5px', borderStyle: 'solid', background: sub.is_active ? '#EAF3DE' : '#f9f9f8', color: sub.is_active ? '#3B6D11' : '#6b7280', borderColor: sub.is_active ? '#97C459' : 'rgba(0,0,0,0.12)' }}>
                            <i className={`ti ${sub.is_active ? 'ti-circle-check' : 'ti-eye-off'}`} style={{ fontSize: 10 }} />
                            {sub.is_active ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: '#6b7280' }}>
                          {new Date(sub.created_at).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}
                        </td>
                        <td style={{ padding: '10px 8px' }}>
                          <button onClick={() => openDialog('sub', sub)} style={{ padding: '4px 8px', borderWidth: 0, background: 'transparent', cursor: 'pointer', borderRadius: 6, fontSize: 16, color: '#6b7280' }}>
                            <i className="ti ti-dots-vertical" />
                          </button>
                        </td>
                      </tr>
                    )) : []),
                  ]
                })}
              </tbody>
            </table>

            {/* Footer tabel (G54) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTopWidth: '0.5px', borderTopStyle: 'solid', borderTopColor: 'rgba(0,0,0,0.12)' }}>
              <span style={{ fontSize: 12, color: '#6b7280' }}>
                Menampilkan {roots.length} root · {subs.length} sub-kategori
              </span>
              <button
                onClick={() => setExpanded(new Set(roots.map(r => r.id)))}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 12px', fontSize: 12, borderRadius: 8, cursor: 'pointer', borderWidth: '0.5px', borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.22)', background: 'transparent', color: '#1a1a1a' }}
              >
                <i className="ti ti-arrows-maximize" /> Expand semua
              </button>
            </div>
          </>
        )}
      </div>

      <DialogBuatKategori
        open={dialogOpen}
        mode={dialogMode}
        editTarget={editTarget}
        onClose={() => { setDialogOpen(false); setEditTarget(null) }}
        onSuccess={() => { setDialogOpen(false); setEditTarget(null); fetchData(search) }}
        existingRoots={data.filter(c => c.level === 1)}
      />
    </div>
  )
}
