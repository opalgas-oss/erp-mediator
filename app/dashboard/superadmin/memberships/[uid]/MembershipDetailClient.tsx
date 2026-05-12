'use client'

// app/dashboard/superadmin/memberships/[uid]/MembershipDetailClient.tsx
// Orchestrator halaman Detail User Membership.
// Menampilkan card info user + tabel membership + dialog assign + dialog revoke.
//
// Dibuat: Sesi #136 — M8 User Membership Management
// Updated: Sesi #136 — Fix dialog assign: Tenant & Role pakai Select (bukan input manual UUID)

import { useState, useEffect }                  from 'react'
import { useRouter }                            from 'next/navigation'
import { toast }                                from 'sonner'
import { Button }                               from '@/components/ui/button'
import { Badge }                                from '@/components/ui/badge'
import {
  Card, CardContent, CardHeader, CardTitle,
}                                               from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
}                                               from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogFooter,
  DialogHeader, DialogTitle, DialogDescription,
}                                               from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
}                                               from '@/components/ui/select'
import { Label }                                from '@/components/ui/label'
import { Alert, AlertDescription }             from '@/components/ui/alert'
import { ICON_ACTION, ICON_STATUS, ICON_NAV }   from '@/lib/constants/icons.constant'
import type {
  UserWithMemberships,
  MembershipRow,
}                                               from '@/lib/types/user-membership.types'

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  initialData: UserWithMemberships
  userId:      string
}

// ─── Tipe lokal ───────────────────────────────────────────────────────────────

interface TenantOption {
  id:         string
  nama_brand: string
}

// Role adalah data statis — 4 role tetap, tidak berubah
const ROLE_OPTIONS = [
  { id: 1, label: 'Customer'     },
  { id: 2, label: 'Vendor'       },
  { id: 3, label: 'Admin Tenant' },
  { id: 4, label: 'Super Admin'  },
]

// ─── Status badge helper ──────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  return status === 'active'
    ? <Badge variant="default"  className="text-xs">Aktif</Badge>
    : <Badge variant="secondary" className="text-xs">Nonaktif</Badge>
}

// ─── Format tanggal singkat ───────────────────────────────────────────────────

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

// ─── Komponen ─────────────────────────────────────────────────────────────────

export function MembershipDetailClient({ initialData, userId }: Props) {
  const router = useRouter()

  const [memberships, setMemberships] = useState<MembershipRow[]>(initialData.memberships)
  const user                          = initialData.user

  // Dialog assign
  const [assignOpen,    setAssignOpen]    = useState(false)
  const [tenantId,      setTenantId]      = useState('')
  const [roleId,        setRoleId]        = useState('')
  const [assigning,     setAssigning]     = useState(false)
  const [tenantOptions, setTenantOptions] = useState<TenantOption[]>([])
  const [tenantsLoading, setTenantsLoading] = useState(false)

  // Dialog revoke
  const [revokeTarget, setRevokeTarget] = useState<MembershipRow | null>(null)
  const [revoking,     setRevoking]     = useState(false)

  // ── Load tenants saat dialog assign dibuka ───────────────────────────────────

  useEffect(() => {
    if (!assignOpen) return
    if (tenantOptions.length > 0) return   // sudah pernah load

    setTenantsLoading(true)
    fetch('/api/superadmin/tenants?limit=100')
      .then(r => r.json())
      .then((json: { data?: TenantOption[]; error?: string }) => {
        setTenantOptions(json.data ?? [])
      })
      .catch(() => toast.error('Gagal memuat daftar tenant'))
      .finally(() => setTenantsLoading(false))
  }, [assignOpen, tenantOptions.length])

  // ── Assign ──────────────────────────────────────────────────────────────────

  async function handleAssign() {
    const roleIdNum = parseInt(roleId, 10)
    if (!tenantId || !roleId || isNaN(roleIdNum)) return

    setAssigning(true)
    try {
      const res  = await fetch(`/api/superadmin/memberships/${userId}/assign`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ tenant_id: tenantId, role_id: roleIdNum }),
      })
      const json = await res.json() as { error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Gagal assign role')

      toast.success('Role berhasil di-assign')
      setAssignOpen(false)
      setTenantId('')
      setRoleId('')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setAssigning(false)
    }
  }

  function handleAssignOpen() {
    setTenantId('')
    setRoleId('')
    setAssignOpen(true)
  }

  // ── Revoke ──────────────────────────────────────────────────────────────────

  async function handleRevoke() {
    if (!revokeTarget) return

    setRevoking(true)
    try {
      const res  = await fetch(
        `/api/superadmin/memberships/${userId}/revoke/${revokeTarget.id}`,
        { method: 'PATCH' }
      )
      const json = await res.json() as {
        success?: boolean;
        is_last_membership?: boolean;
        error?: string
      }
      if (!res.ok) throw new Error(json.error ?? 'Gagal revoke')

      if (json.is_last_membership) {
        toast.warning('Membership terakhir di-revoke. User tidak bisa login ke tenant manapun.')
      } else {
        toast.success('Membership berhasil di-revoke')
      }

      setMemberships(prev =>
        prev.map(m => m.id === revokeTarget.id ? { ...m, status: 'inactive' } : m)
      )
      setRevokeTarget(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setRevoking(false)
    }
  }

  const activeMemberships = memberships.filter(m => m.status === 'active')

  return (
    <div className="p-6 space-y-6">

      {/* ── Back + Header ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/dashboard/superadmin/memberships')}
        >
          <ICON_NAV.chevronLeft size={14} className="mr-1" />
          Kembali
        </Button>
        <h1 className="text-xl font-semibold text-slate-900">
          Detail User — {user.nama}
        </h1>
      </div>

      {/* ── Card Info User ──────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wide">
            Informasi User
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
            <div>
              <dt className="text-xs text-slate-400 mb-0.5">Nama</dt>
              <dd className="text-sm font-medium text-slate-800">{user.nama}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400 mb-0.5">Email</dt>
              <dd className="text-sm text-slate-700">{user.email}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400 mb-0.5">Nomor WA</dt>
              <dd className="text-sm text-slate-700">{user.nomor_wa ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400 mb-0.5">Terdaftar</dt>
              <dd className="text-sm text-slate-700">{fmtDate(user.created_at)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* ── Tabel Memberships ────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wide">
            Daftar Membership ({memberships.length})
          </CardTitle>
          <Button size="sm" onClick={handleAssignOpen}>
            <ICON_ACTION.add size={14} className="mr-1.5" />
            Assign Role
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead className="w-36">Role</TableHead>
                <TableHead className="w-28 text-center">Status</TableHead>
                <TableHead className="w-36">Dibuat</TableHead>
                <TableHead className="w-28 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {memberships.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-sm text-slate-400">
                    User belum memiliki membership
                  </TableCell>
                </TableRow>
              ) : (
                memberships.map(row => (
                  <TableRow key={row.id}>
                    <TableCell className="text-sm text-slate-700">{row.tenant_nama}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                        {row.role_code}
                      </code>
                    </TableCell>
                    <TableCell className="text-center">
                      <StatusBadge status={row.status} />
                    </TableCell>
                    <TableCell className="text-xs text-slate-400">
                      {fmtDate(row.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.status === 'active' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setRevokeTarget(row)}
                        >
                          Revoke
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Dialog Assign Role ───────────────────────────────────────────────── */}
      <Dialog open={assignOpen} onOpenChange={open => { if (!open) { setAssignOpen(false); setTenantId(''); setRoleId('') } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Role ke {user.nama}</DialogTitle>
            <DialogDescription>
              Tambahkan akses user ke tenant tertentu dengan role yang dipilih.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* ── Pilih Tenant ──────────────────────────────────────────────── */}
            <div className="space-y-1.5">
              <Label>Tenant *</Label>
              {tenantsLoading ? (
                <div className="flex items-center gap-2 text-sm text-slate-400 h-9">
                  <ICON_STATUS.loading size={14} className="animate-spin" />
                  Memuat daftar tenant...
                </div>
              ) : (
                <Select value={tenantId} onValueChange={setTenantId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih tenant..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tenantOptions.map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.nama_brand}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* ── Pilih Role ────────────────────────────────────────────────── */}
            <div className="space-y-1.5">
              <Label>Role *</Label>
              <Select value={roleId} onValueChange={setRoleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih role..." />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map(r => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setAssignOpen(false); setTenantId(''); setRoleId('') }}>
              Batal
            </Button>
            <Button
              onClick={handleAssign}
              disabled={assigning || !tenantId || !roleId}
            >
              {assigning && <ICON_STATUS.loading size={14} className="mr-2 animate-spin" />}
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Konfirmasi Revoke ─────────────────────────────────────────── */}
      <Dialog open={revokeTarget !== null} onOpenChange={open => !open && setRevokeTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Konfirmasi Revoke Membership</DialogTitle>
            <DialogDescription>
              Tindakan ini akan menonaktifkan akses user ke tenant ini.
            </DialogDescription>
          </DialogHeader>

          {revokeTarget && (
            <div className="space-y-3 py-2">
              <dl className="text-sm space-y-2">
                <div>
                  <dt className="text-xs text-slate-400">Tenant</dt>
                  <dd className="font-medium">{revokeTarget.tenant_nama}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-400">Role</dt>
                  <dd>
                    <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                      {revokeTarget.role_code}
                    </code>
                  </dd>
                </div>
              </dl>

              {activeMemberships.length <= 1 && (
                <Alert variant="destructive">
                  <ICON_STATUS.warning size={14} />
                  <AlertDescription className="text-xs">
                    Ini adalah satu-satunya membership aktif user ini.
                    Setelah di-revoke, user tidak bisa login ke tenant manapun.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeTarget(null)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevoke}
              disabled={revoking}
            >
              {revoking && <ICON_STATUS.loading size={14} className="mr-2 animate-spin" />}
              Ya, Revoke
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
