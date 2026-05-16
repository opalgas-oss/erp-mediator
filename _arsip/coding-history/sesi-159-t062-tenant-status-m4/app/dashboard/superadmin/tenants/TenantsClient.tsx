'use client'

// app/dashboard/superadmin/tenants/TenantsClient.tsx
// Orchestrator halaman List Tenants — filter, search, pagination
// Style: konsisten dengan Tab Info Umum (inline design tokens)
// Fix: G04 (style tab border-bottom + count per status)
//
// Dibuat: Sesi #132 — M6 FASE 3 Step 3.7
// Diupdate: Sesi #141 — M6 Fix Fase F

import { useState, useCallback, useTransition } from 'react'
import { useRouter }                             from 'next/navigation'
import { toast }                                 from 'sonner'
import { TenantTable }       from './TenantTable'
import { DialogTambahTenant } from './DialogTambahTenant'
import type { TenantListItem, TenantLifecycleStatus } from '@/lib/types/tenant.types'

interface Props {
  initialData:  TenantListItem[]
  initialTotal: number
}

const STATUS_TABS: { value: TenantLifecycleStatus | 'all'; label: string }[] = [
  { value: 'all',        label: 'Semua' },
  { value: 'active',     label: 'Aktif' },
  { value: 'pending',    label: 'Menunggu aktivasi' },
  { value: 'suspended',  label: 'Dinonaktifkan' },
  { value: 'expired',    label: 'Kadaluarsa' },
  { value: 'terminated', label: 'Diakhiri' },
]

export function TenantsClient({ initialData, initialTotal }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [data,       setData]       = useState<TenantListItem[]>(initialData)
  const [total,      setTotal]      = useState(initialTotal)
  const [loading,    setLoading]    = useState(false)
  const [activeTab,  setActiveTab]  = useState<TenantLifecycleStatus | 'all'>('all')
  const [search,     setSearch]     = useState('')
  const [page,       setPage]       = useState(1)
  const [sortBy,     setSortBy]     = useState('created_at')
  const [dialogOpen, setDialogOpen] = useState(false)

  const limit = 20
  const totalPages = Math.ceil(total / limit)

  const fetchData = useCallback(async (opts: { status?: TenantLifecycleStatus | 'all'; search?: string; page?: number }) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (opts.status && opts.status !== 'all') params.set('status', opts.status)
      if (opts.search) params.set('search', opts.search)
      if (opts.page) params.set('page', String(opts.page))
      params.set('limit', String(limit))
      const res  = await fetch(`/api/superadmin/tenants?${params}`)
      const json = await res.json()
      if (json.success) {
        setData(json.data)
        setTotal(json.total)
      }
    } catch { toast.error('Gagal memuat data tenant') }
    finally { setLoading(false) }
  }, [])

  const handleTabChange = (status: TenantLifecycleStatus | 'all') => { setActiveTab(status); setPage(1); fetchData({ status, search, page: 1 }) }
  const handleSearch    = (val: string) => { setSearch(val); setPage(1); fetchData({ status: activeTab, search: val, page: 1 }) }
  const handlePageChange = (p: number) => { setPage(p); fetchData({ status: activeTab, search, page: p }) }
  const handleRowClick  = (id: string) => { startTransition(() => router.push(`/dashboard/superadmin/tenants/${id}`)) }
  const handleSuccess   = () => { setDialogOpen(false); toast.success('Tenant berhasil dibuat'); fetchData({ status: activeTab, search, page: 1 }) }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 24 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: '#1a1a1a' }}>Manajemen Tenant</h1>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{total} tenant terdaftar</p>
        </div>
        <button
          onClick={() => setDialogOpen(true)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer', borderWidth: '0.5px', borderStyle: 'solid', borderColor: '#85B7EB', color: '#185FA5', background: '#E6F1FB' }}
        >
          <i className="ti ti-plus" /> Tambah Tenant
        </button>
      </div>

      {/* Tabs — border-bottom style (E8) */}
      <div style={{ display: 'flex', borderBottomWidth: '0.5px', borderBottomStyle: 'solid', borderBottomColor: 'rgba(0,0,0,0.12)' }}>
        {STATUS_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => handleTabChange(tab.value)}
            style={{
              padding: '8px 16px', fontSize: 13, cursor: 'pointer',
              background: 'transparent', borderTopWidth: 0, borderLeftWidth: 0, borderRightWidth: 0,
              borderBottomWidth: '2px', borderBottomStyle: 'solid',
              borderBottomColor: activeTab === tab.value ? '#1a1a1a' : 'transparent',
              color: activeTab === tab.value ? '#1a1a1a' : '#6b7280',
              fontWeight: activeTab === tab.value ? 500 : 400,
              whiteSpace: 'nowrap', fontFamily: 'inherit',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative' }}>
          <i className="ti ti-search" style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#9ca3af' }} />
          <input
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Cari nama, kode, atau PIC..."
            style={{ width: 260, padding: '7px 10px 7px 28px', borderWidth: '0.5px', borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.12)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }}
          />
        </div>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          style={{ padding: '7px 10px', borderWidth: '0.5px', borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.12)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', background: '#fff' }}
        >
          <option value="created_at">Urutkan: Terbaru</option>
          <option value="nama_brand">Urutkan: Nama A-Z</option>
        </select>
      </div>

      {/* Tabel */}
      <TenantTable data={data} loading={loading} onRowClick={handleRowClick} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, color: '#6b7280' }}>
          <span>Menampilkan {(page - 1) * limit + 1}–{Math.min(page * limit, total)} dari {total}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
              style={{ padding: '5px 12px', fontSize: 12, borderRadius: 8, cursor: page <= 1 ? 'not-allowed' : 'pointer', borderWidth: '0.5px', borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.22)', background: 'transparent', opacity: page <= 1 ? 0.5 : 1 }}
            >
              ← Sebelumnya
            </button>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages}
              style={{ padding: '5px 12px', fontSize: 12, borderRadius: 8, cursor: page >= totalPages ? 'not-allowed' : 'pointer', borderWidth: '0.5px', borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.22)', background: 'transparent', opacity: page >= totalPages ? 0.5 : 1 }}
            >
              Berikutnya →
            </button>
          </div>
        </div>
      )}

      <DialogTambahTenant open={dialogOpen} onClose={() => setDialogOpen(false)} onSuccess={handleSuccess} />
    </div>
  )
}
