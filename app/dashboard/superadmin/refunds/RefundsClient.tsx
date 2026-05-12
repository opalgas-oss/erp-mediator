'use client'

// app/dashboard/superadmin/refunds/RefundsClient.tsx
// Orchestrator halaman Approval Refund SuperAdmin (M9).
// Menampilkan tabel complaints awaiting_super_admin + filter + dialog approve/reject.
//
// Dibuat: Sesi #137 — M9 Approval Refund SuperAdmin

import { useState, useCallback }                from 'react'
import { toast }                                from 'sonner'
import { Button }                               from '@/components/ui/button'
import { Input }                                from '@/components/ui/input'
import { Badge }                                from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
}                                               from '@/components/ui/table'
import { ICON_ACTION, ICON_STATUS, ICON_FINANCE } from '@/lib/constants/icons.constant'
import type {
  RefundListResponse,
  RefundListItem,
}                                               from '@/lib/types/complaint.types'
import { RefundApproveDialog, RefundRejectDialog } from './RefundActionDialogs'

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  initialData: RefundListResponse
}

// ─── Complaint type label ─────────────────────────────────────────────────────

const COMPLAINT_TYPE_LABEL: Record<string, string> = {
  quality:         'Kualitas buruk',
  no_show:         'Vendor tidak datang',
  incomplete_work: 'Pekerjaan tidak selesai',
  overcharge:      'Tagihan berlebih',
  behavior:        'Perilaku tidak profesional',
  damage:          'Kerusakan properti',
  late:            'Sangat terlambat',
  other:           'Lainnya',
}

// ─── Format rupiah ────────────────────────────────────────────────────────────

function formatRupiah(amount: number | null): string {
  if (amount === null) return '—'
  return new Intl.NumberFormat('id-ID', {
    style:    'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount)
}

// ─── Format tanggal relatif ───────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('id-ID', {
    day:   'numeric',
    month: 'short',
    year:  'numeric',
  })
}

// ─── Deadline badge ───────────────────────────────────────────────────────────

function DeadlineBadge({ deadline }: { deadline: string | null }) {
  if (!deadline) return <span className="text-slate-400 text-xs">—</span>

  const now     = new Date()
  const dueDate = new Date(deadline)
  const diffMs  = dueDate.getTime() - now.getTime()
  const diffH   = Math.floor(diffMs / (1000 * 60 * 60))

  if (diffMs < 0) {
    return (
      <Badge variant="destructive" className="text-xs">
        Melewati batas
      </Badge>
    )
  }
  if (diffH < 24) {
    return (
      <Badge className="text-xs bg-amber-100 text-amber-800 border border-amber-300">
        {diffH}j lagi
      </Badge>
    )
  }
  return (
    <span className="text-xs text-slate-500">
      {formatDate(deadline)}
    </span>
  )
}

// ─── Komponen utama ───────────────────────────────────────────────────────────

export function RefundsClient({ initialData }: Props) {
  const [data,    setData]    = useState<RefundListItem[]>(initialData.data)
  const [total,   setTotal]   = useState(initialData.total)
  const [page,    setPage]    = useState(1)
  const [loading, setLoading] = useState(false)

  // Filter state
  const [search, setSearch] = useState('')

  // Dialog state
  const [approveTarget, setApproveTarget] = useState<RefundListItem | null>(null)
  const [rejectTarget,  setRejectTarget]  = useState<RefundListItem | null>(null)

  const PER_PAGE = 20

  const fetchData = useCallback(async (
    newPage:   number,
    searchVal: string,
  ) => {
    setLoading(true)
    try {
      const sp = new URLSearchParams({
        page:     String(newPage),
        per_page: String(PER_PAGE),
      })
      if (searchVal.trim()) sp.set('search', searchVal.trim())

      const res  = await fetch(`/api/superadmin/refunds?${sp}`)
      const json = await res.json() as RefundListResponse & { error?: string }
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
    fetchData(1, search)
  }

  function handleReset() {
    setSearch('')
    fetchData(1, '')
  }

  // Setelah approve / reject berhasil — refresh list dan tutup dialog
  async function handleResolved() {
    setApproveTarget(null)
    setRejectTarget(null)
    await fetchData(page, search)
  }

  const totalPages = Math.ceil(total / PER_PAGE)

  return (
    <div className="p-6 space-y-4">

      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ICON_FINANCE.refund size={20} className="text-amber-600" />
            <h1 className="text-xl font-semibold text-slate-900">Approval Refund</h1>
          </div>
          <p className="text-sm text-slate-500">
            Komplain yang diteruskan AdminTenant dan memerlukan keputusan SuperAdmin
          </p>
        </div>
        <Badge
          variant="outline"
          className="text-amber-700 border-amber-300 bg-amber-50 font-medium"
        >
          {total} menunggu
        </Badge>
      </div>

      {/* ── Filter Bar ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 items-center">
        <Input
          className="w-72 h-9 text-sm"
          placeholder="Cari subjek atau nama customer..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
        />

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

      {/* ── Empty state khusus ───────────────────────────────────────────────── */}
      {!loading && data.length === 0 && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-6 text-center">
          <ICON_STATUS.success size={32} className="mx-auto mb-2 text-emerald-500" />
          <p className="text-sm font-medium text-emerald-800">
            Tidak ada refund yang menunggu approval
          </p>
          <p className="text-xs text-emerald-600 mt-1">
            Semua komplain sudah ditangani oleh AdminTenant
          </p>
        </div>
      )}

      {/* ── Tabel Refunds ────────────────────────────────────────────────────── */}
      {data.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wide">
              Daftar Komplain Menunggu Keputusan
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Komplain</TableHead>
                  <TableHead className="w-36">Tenant</TableHead>
                  <TableHead className="w-36">Customer</TableHead>
                  <TableHead className="w-28 text-right">Nominal</TableHead>
                  <TableHead className="w-32">Batas Waktu SA</TableHead>
                  <TableHead className="w-36 text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map(row => (
                  <TableRow key={row.id}>
                    {/* Kolom Komplain */}
                    <TableCell>
                      <p className="text-sm font-medium text-slate-800 line-clamp-1">
                        {row.subject}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {COMPLAINT_TYPE_LABEL[row.complaint_type] ?? row.complaint_type}
                        {' · '}
                        Eskalasi: {formatDate(row.escalated_at)}
                      </p>
                      {row.escalation_reason && (
                        <p className="text-xs text-amber-700 mt-0.5 italic line-clamp-1">
                          "{row.escalation_reason}"
                        </p>
                      )}
                    </TableCell>

                    {/* Kolom Tenant */}
                    <TableCell className="text-sm text-slate-600">
                      {row.tenant_nama}
                    </TableCell>

                    {/* Kolom Customer */}
                    <TableCell>
                      <p className="text-sm text-slate-700">{row.customer_nama || '—'}</p>
                      <p className="text-xs text-slate-400">{row.customer_email || '—'}</p>
                    </TableCell>

                    {/* Kolom Nominal */}
                    <TableCell className="text-sm font-medium text-slate-800 text-right">
                      {formatRupiah(row.refund_amount)}
                    </TableCell>

                    {/* Kolom Batas Waktu */}
                    <TableCell>
                      <DeadlineBadge deadline={row.super_admin_deadline_at} />
                    </TableCell>

                    {/* Kolom Aksi */}
                    <TableCell>
                      <div className="flex gap-1.5 justify-center">
                        <Button
                          variant="default"
                          size="sm"
                          className="h-7 px-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => setApproveTarget(row)}
                        >
                          <ICON_STATUS.success size={12} className="mr-1" />
                          Setujui
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs border-destructive text-destructive hover:bg-destructive/10"
                          onClick={() => setRejectTarget(row)}
                        >
                          <ICON_STATUS.failed size={12} className="mr-1" />
                          Tolak
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

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
              onClick={() => fetchData(page - 1, search)}
            >
              ← Sebelumnya
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => fetchData(page + 1, search)}
            >
              Berikutnya →
            </Button>
          </div>
        </div>
      )}

      {/* ── Dialogs ──────────────────────────────────────────────────────────── */}
      <RefundApproveDialog
        target={approveTarget}
        onClose={() => setApproveTarget(null)}
        onSuccess={handleResolved}
      />
      <RefundRejectDialog
        target={rejectTarget}
        onClose={() => setRejectTarget(null)}
        onSuccess={handleResolved}
      />

    </div>
  )
}
