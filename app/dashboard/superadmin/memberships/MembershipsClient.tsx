'use client'

// app/dashboard/superadmin/memberships/MembershipsClient.tsx
// Orchestrator halaman List Memberships.
// Menampilkan tabel user memberships + filter + pagination + link ke detail user.
//
// Dibuat: Sesi #136 — M8 User Membership Management

import { useState, useCallback }                from 'react'
import { useRouter }                            from 'next/navigation'
import { toast }                                from 'sonner'
import { Button }                               from '@/components/ui/button'
import { Badge }                                from '@/components/ui/badge'
import { Input }                                from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
}                                               from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
}                                               from '@/components/ui/table'
import { ICON_ACTION, ICON_STATUS }             from '@/lib/constants/icons.constant'
import type {
  MembershipListResponse,
  MembershipWithDetails,
}                                               from '@/lib/types/user-membership.types'

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  initialData: MembershipListResponse
}

// ─── Status badge helper ──────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  return status === 'active'
    ? <Badge variant="default"  className="text-xs">Aktif</Badge>
    : <Badge variant="secondary" className="text-xs">Nonaktif</Badge>
}

// ─── Komponen ─────────────────────────────────────────────────────────────────

export function MembershipsClient({ initialData }: Props) {
  const router = useRouter()

  const [data,    setData]    = useState<MembershipWithDetails[]>(initialData.data)
  const [total,   setTotal]   = useState(initialData.total)
  const [page,    setPage]    = useState(1)
  const [loading, setLoading] = useState(false)

  // Filter state
  const [search,   setSearch]   = useState('')
  const [statusF,  setStatusF]  = useState<string>('all')

  const PER_PAGE = 50

  const fetchData = useCallback(async (
    newPage: number,
    searchVal: string,
    statusVal: string,
  ) => {
    setLoading(true)
    try {
      const sp = new URLSearchParams({
        page:     String(newPage),
        per_page: String(PER_PAGE),
        status:   statusVal,
      })
      if (searchVal.trim()) sp.set('search', searchVal.trim())

      const res  = await fetch(`/api/superadmin/memberships?${sp}`)
      const json = await res.json() as MembershipListResponse & { error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Gagal memuat data')

      setData(json.data)
      setTotal(json.total)
      setPage(newPage)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }, [])

  function handleSearch() {
    fetchData(1, search, statusF)
  }

  function handleStatusChange(val: string) {
    setStatusF(val)
    fetchData(1, search, val)
  }

  function handleReset() {
    setSearch('')
    setStatusF('all')
    fetchData(1, '', 'all')
  }

  const totalPages = Math.ceil(total / PER_PAGE)

  return (
    <div className="p-6 space-y-4">

      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">User Memberships</h1>
        <p className="text-sm text-slate-500">
          Total: <span className="font-medium text-slate-700">{total}</span> membership
        </p>
      </div>

      {/* ── Filter Bar ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 items-center">
        <Input
          className="w-64 h-9 text-sm"
          placeholder="Cari nama atau email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
        />

        <Select value={statusF} onValueChange={handleStatusChange}>
          <SelectTrigger className="h-9 w-36 text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="active">Aktif</SelectItem>
            <SelectItem value="inactive">Nonaktif</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={handleSearch} disabled={loading}>
          <ICON_ACTION.search size={14} className="mr-1.5" />
          Cari
        </Button>

        <Button variant="ghost" size="sm" onClick={handleReset} disabled={loading}>
          <ICON_ACTION.reset size={14} className="mr-1.5" />
          Reset
        </Button>

        {loading && (
          <ICON_STATUS.loading size={16} className="animate-spin text-slate-400" />
        )}
      </div>

      {/* ── Tabel Memberships ────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wide">
            Daftar Membership
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead className="w-32">Role</TableHead>
                <TableHead className="w-28 text-center">Status</TableHead>
                <TableHead className="w-36 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-sm text-slate-400">
                    Tidak ada data membership
                  </TableCell>
                </TableRow>
              ) : (
                data.map(row => (
                  <TableRow key={row.id}>
                    <TableCell className="text-sm font-medium text-slate-800">
                      {row.user_nama}
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {row.user_email}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {row.tenant_nama}
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                        {row.role_code}
                      </code>
                    </TableCell>
                    <TableCell className="text-center">
                      <StatusBadge status={row.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/dashboard/superadmin/memberships/${row.user_id}`)}
                      >
                        Detail User →
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Pagination ───────────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>
            Halaman {page} dari {totalPages} ({total} total)
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => fetchData(page - 1, search, statusF)}
            >
              ← Sebelumnya
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => fetchData(page + 1, search, statusF)}
            >
              Berikutnya →
            </Button>
          </div>
        </div>
      )}

    </div>
  )
}
