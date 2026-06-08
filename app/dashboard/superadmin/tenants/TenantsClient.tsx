'use client'

// app/dashboard/superadmin/tenants/TenantsClient.tsx
// Orchestrator halaman List Tenants — filter, search, pagination
//
// Dibuat: Sesi #132 — M6 FASE 3 Step 3.7
// Diupdate: Sesi #141 — M6 Fix Fase F
// Diupdate: Sesi #159 — T-062: STATUS_TABS → terima dari page.tsx (M4)
// CASE SESI-14 (8 Juni 2026): update ke STANDAR_UI_UX_MOCKUP_RULES
//   - Tab aktif #185FA5 (biru), bukan hitam
//   - Table cell 13px, th 12px, input 13px h-9 py-2 px-3
//   - Page header: h1 20px semibold + sub 12px
//   - Tombol: CSS variable biru, font 13px
//   - Padding container p-6

import { useState, useCallback, useTransition } from 'react'
import { useRouter }                             from 'next/navigation'
import { toast }                                 from 'sonner'
import { Button }             from '@/components/ui/button'
import { TenantTable }        from './TenantTable'
import { DialogTambahTenant } from './DialogTambahTenant'
import type { TenantListItem, TenantLifecycleStatus, TenantTier } from '@/lib/types/tenant.types'

interface Props {
  initialData:  TenantListItem[]
  initialTotal: number
  statusTabs:   { value: TenantLifecycleStatus | 'all'; label: string }[]
  tierOpsi:     { value: TenantTier; label: string }[]
}

export function TenantsClient({ initialData, initialTotal, statusTabs, tierOpsi }: Props) {
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

  const limit      = 20
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
      if (json.success) { setData(json.data); setTotal(json.total) }
    } catch { toast.error('Gagal memuat data tenant') }
    finally { setLoading(false) }
  }, [])

  const handleTabChange  = (status: TenantLifecycleStatus | 'all') => { setActiveTab(status); setPage(1); fetchData({ status, search, page: 1 }) }
  const handleSearch     = (val: string) => { setSearch(val); setPage(1); fetchData({ status: activeTab, search: val, page: 1 }) }
  const handlePageChange = (p: number)   => { setPage(p); fetchData({ status: activeTab, search, page: p }) }
  const handleRowClick   = (id: string)  => { startTransition(() => router.push(`/dashboard/superadmin/tenants/${id}`)) }
  const handleSuccess    = () => { setDialogOpen(false); toast.success('Tenant berhasil dibuat'); fetchData({ status: activeTab, search, page: 1 }) }

  return (
    <div className="flex flex-col gap-4 p-6">

      {/* ── Page Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[20px] font-semibold text-[#1a1a1a]">Kelola Tenant</h1>
          <p className="text-[12px] text-[#6b7280] mt-1">{total} tenant terdaftar</p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          variant="outline"
          className="text-[13px] font-medium border-[color:var(--color-info-border)] text-[color:var(--color-info-text)] bg-[color:var(--color-info-bg)]"
        >
          <i className="ti ti-plus mr-1.5" /> Tambah Tenant
        </Button>
      </div>

      {/* ── Tab bar — aktif #185FA5 sesuai STANDAR BAB 6.9 ── */}
      <div style={{ display: 'flex', borderBottom: '0.5px solid rgba(0,0,0,0.12)' }}>
        {statusTabs.map(tab => (
          <button
            key={tab.value}
            onClick={() => handleTabChange(tab.value)}
            style={{
              padding: '10px 16px',
              fontSize: 13,
              cursor: 'pointer',
              background: 'transparent',
              border: 'none',
              borderBottom: `2px solid ${activeTab === tab.value ? '#185FA5' : 'transparent'}`,
              color: activeTab === tab.value ? '#185FA5' : '#6b7280',
              fontWeight: activeTab === tab.value ? 500 : 400,
              whiteSpace: 'nowrap',
              fontFamily: 'inherit',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <div style={{ position: 'relative' }}>
          <i className="ti ti-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#9ca3af' }} />
          <input
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Cari nama, kode, atau PIC..."
            style={{
              width: 260, height: 36,
              padding: '8px 12px 8px 32px',
              border: '1px solid rgba(0,0,0,0.15)',
              borderRadius: 8, fontSize: 13,
              fontFamily: 'inherit', color: '#1a1a1a',
            }}
          />
        </div>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          style={{
            height: 36, padding: '8px 12px',
            border: '1px solid rgba(0,0,0,0.15)',
            borderRadius: 8, fontSize: 13,
            fontFamily: 'inherit', background: '#fff', color: '#1a1a1a',
          }}
        >
          <option value="created_at">Urutkan: Terbaru</option>
          <option value="nama_brand">Urutkan: Nama A-Z</option>
        </select>
      </div>

      {/* ── Tabel ── */}
      <TenantTable data={data} loading={loading} onRowClick={handleRowClick} />

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-[#6b7280]">
            Menampilkan {(page - 1) * limit + 1}–{Math.min(page * limit, total)} dari {total} tenant
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
              className="text-[12px] px-3 py-1 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ border: '0.5px solid rgba(0,0,0,0.22)', background: 'transparent', color: '#6b7280', fontFamily: 'inherit' }}
            >
              ← Sebelumnya
            </button>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages}
              className="text-[12px] px-3 py-1 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ border: '0.5px solid rgba(0,0,0,0.22)', background: 'transparent', color: '#6b7280', fontFamily: 'inherit' }}
            >
              Berikutnya →
            </button>
          </div>
        </div>
      )}

      <DialogTambahTenant
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSuccess={handleSuccess}
        tierOpsi={tierOpsi}
      />
    </div>
  )
}
