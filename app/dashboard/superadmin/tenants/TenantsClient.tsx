'use client'

// app/dashboard/superadmin/tenants/TenantsClient.tsx
// Orchestrator halaman List Tenants — filter, search, pagination, dialog state.
// UI tabel    → TenantTable.tsx
// UI dialog   → DialogTambahTenant.tsx
//
// Dibuat: Sesi #132 — M6 FASE 3 Step 3.7

import { useState, useCallback, useTransition } from 'react'
import { useRouter }                             from 'next/navigation'
import { toast }                                 from 'sonner'
import { Button }                                from '@/components/ui/button'
import { Input }                                 from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TenantTable }       from './TenantTable'
import { DialogTambahTenant } from './DialogTambahTenant'
import type { TenantListItem, TenantLifecycleStatus, BuatTenantPayload } from '@/lib/types/tenant.types'
import { TENANT_LIFECYCLE_LABEL } from '@/lib/constants/tenant.constant'

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  initialData:  TenantListItem[]
  initialTotal: number
}

// ─── Tab filter konfigurasi ───────────────────────────────────────────────────

const STATUS_TABS: { value: TenantLifecycleStatus | 'all'; label: string }[] = [
  { value: 'all',        label: 'Semua' },
  { value: 'active',     label: TENANT_LIFECYCLE_LABEL.active },
  { value: 'pending',    label: TENANT_LIFECYCLE_LABEL.pending },
  { value: 'suspended',  label: TENANT_LIFECYCLE_LABEL.suspended },
  { value: 'expired',    label: TENANT_LIFECYCLE_LABEL.expired },
  { value: 'terminated', label: TENANT_LIFECYCLE_LABEL.terminated },
]

// ─── Komponen ─────────────────────────────────────────────────────────────────

export function TenantsClient({ initialData, initialTotal }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  // ── State ──────────────────────────────────────────────────────────────────
  const [data,         setData]         = useState<TenantListItem[]>(initialData)
  const [total,        setTotal]        = useState(initialTotal)
  const [loading,      setLoading]      = useState(false)
  const [activeTab,    setActiveTab]    = useState<TenantLifecycleStatus | 'all'>('all')
  const [search,       setSearch]       = useState('')
  const [page,         setPage]         = useState(1)
  const [sortBy,       setSortBy]       = useState('created_at')
  const [dialogOpen,   setDialogOpen]   = useState(false)

  const limit = 20
  const totalPages = Math.ceil(total / limit)

  // ── Fetch data ─────────────────────────────────────────────────────────────
  const fetchData = useCallback(async (opts: {
    status?: TenantLifecycleStatus | 'all'
    search?: string
    page?: number
  }) => {
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
    } catch {
      toast.error('Gagal memuat data tenant')
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleTabChange = (status: TenantLifecycleStatus | 'all') => {
    setActiveTab(status)
    setPage(1)
    fetchData({ status, search, page: 1 })
  }

  const handleSearch = (val: string) => {
    setSearch(val)
    setPage(1)
    fetchData({ status: activeTab, search: val, page: 1 })
  }

  const handlePageChange = (p: number) => {
    setPage(p)
    fetchData({ status: activeTab, search, page: p })
  }

  const handleRowClick = (id: string) => {
    startTransition(() => router.push(`/dashboard/superadmin/tenants/${id}`))
  }

  const handleCreateSuccess = () => {
    setDialogOpen(false)
    toast.success('Tenant berhasil dibuat')
    fetchData({ status: activeTab, search, page: 1 })
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 p-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Manajemen Tenant</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {total} tenant terdaftar
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          + Tambah Tenant
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Tab status */}
        <div className="flex gap-1 border rounded-md p-1 bg-muted/30">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => handleTabChange(tab.value)}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                activeTab === tab.value
                  ? 'bg-background shadow-sm font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <Input
          placeholder="Cari nama, kode, atau PIC..."
          value={search}
          onChange={e => handleSearch(e.target.value)}
          className="max-w-xs"
        />

        {/* Sort */}
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at">Terbaru</SelectItem>
            <SelectItem value="nama_brand">Nama A-Z</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabel */}
      <TenantTable
        data={data}
        loading={loading}
        onRowClick={handleRowClick}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Menampilkan {(page - 1) * limit + 1}–{Math.min(page * limit, total)} dari {total}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline" size="sm"
              disabled={page <= 1}
              onClick={() => handlePageChange(page - 1)}
            >
              ← Sebelumnya
            </Button>
            <Button
              variant="outline" size="sm"
              disabled={page >= totalPages}
              onClick={() => handlePageChange(page + 1)}
            >
              Berikutnya →
            </Button>
          </div>
        </div>
      )}

      {/* Dialog Tambah Tenant */}
      <DialogTambahTenant
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSuccess={handleCreateSuccess}
      />
    </div>
  )
}
