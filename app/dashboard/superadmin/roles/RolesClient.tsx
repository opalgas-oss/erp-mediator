'use client'

// app/dashboard/superadmin/roles/RolesClient.tsx
// Orchestrator halaman List Roles.
// Menampilkan tabel 4 role + badge permission count + dialog tambah permission.
//
// Dibuat: Sesi #134 — M7 Roles & Permissions Management

import { useState }                      from 'react'
import { useRouter }                     from 'next/navigation'
import { toast }                         from 'sonner'
import { Button }                        from '@/components/ui/button'
import { Badge }                         from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
}                                        from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogFooter,
  DialogHeader, DialogTitle,
}                                        from '@/components/ui/dialog'
import { Alert, AlertDescription }       from '@/components/ui/alert'
import { Input }                         from '@/components/ui/input'
import { Label }                         from '@/components/ui/label'
import { ICON_STATUS, ICON_ACTION }      from '@/lib/constants/icons.constant'
import type { RoleWithCount }            from '@/lib/types/roles-permissions.types'

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  initialData: RoleWithCount[]
}

// ─── Label bahasa Indonesia per role code ─────────────────────────────────────

const ROLE_LABEL: Record<string, string> = {
  customer:    'Customer',
  vendor:      'Vendor',
  admin_tenant:'Admin Tenant',
  super_admin: 'Super Admin',
}

// ─── Komponen ─────────────────────────────────────────────────────────────────

export function RolesClient({ initialData }: Props) {
  const router = useRouter()

  // Dialog tambah permission
  const [dialogOpen, setDialogOpen]     = useState(false)
  const [codeInput,  setCodeInput]      = useState('')
  const [descInput,  setDescInput]      = useState('')
  const [submitting, setSubmitting]     = useState(false)

  async function handleAddPermission() {
    if (!codeInput.trim() || !descInput.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/superadmin/permissions', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ code: codeInput.trim(), description: descInput.trim() }),
      })
      const json = await res.json() as { error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Gagal menambahkan permission')

      toast.success('Permission berhasil ditambahkan')
      setDialogOpen(false)
      setCodeInput('')
      setDescInput('')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6 space-y-4">

      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Roles & Permissions</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <ICON_ACTION.add size={15} className="mr-2" />
          Tambah Permission
        </Button>
      </div>

      {/* ── Alert info ──────────────────────────────────────────────────────── */}
      <Alert>
        <ICON_STATUS.info size={15} className="text-blue-500" />
        <AlertDescription className="text-sm text-slate-600">
          Roles bersifat tetap (customer, vendor, admin_tenant, super_admin).
          Kelola permissions per role dengan klik tombol <strong>Kelola Permissions</strong>.
        </AlertDescription>
      </Alert>

      {/* ── Tabel Roles ─────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wide">
            Daftar Role
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">ID</TableHead>
                <TableHead className="w-36">Role Code</TableHead>
                <TableHead>Deskripsi</TableHead>
                <TableHead className="w-40 text-center">Jumlah Permissions</TableHead>
                <TableHead className="w-44 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialData.map(role => (
                <TableRow key={role.id}>
                  <TableCell className="text-xs text-slate-400">{role.id}</TableCell>
                  <TableCell>
                    <code className="text-sm font-medium bg-slate-100 px-1.5 py-0.5 rounded">
                      {role.code}
                    </code>
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
                    {ROLE_LABEL[role.code] ?? role.code}
                    {role.description && (
                      <span className="text-slate-400"> — {role.description}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">
                      {role.permission_count} permissions
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/dashboard/superadmin/roles/${role.id}`)}
                    >
                      Kelola Permissions →
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Dialog Tambah Permission ─────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Permission Baru</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="perm-code">Code *</Label>
              <Input
                id="perm-code"
                placeholder="contoh: order.refund"
                value={codeInput}
                onChange={e => setCodeInput(e.target.value)}
                className="font-mono"
              />
              <p className="text-xs text-slate-400">
                Format: {'{resource}.{action}'} — huruf kecil, titik sebagai pemisah.
                Contoh: order.refund, config.edit, vendor.approve
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="perm-desc">Deskripsi *</Label>
              <Input
                id="perm-desc"
                placeholder="contoh: Proses refund pesanan"
                value={descInput}
                onChange={e => setDescInput(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={handleAddPermission}
              disabled={submitting || !codeInput.trim() || !descInput.trim()}
            >
              {submitting && <ICON_STATUS.loading size={14} className="mr-2 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
