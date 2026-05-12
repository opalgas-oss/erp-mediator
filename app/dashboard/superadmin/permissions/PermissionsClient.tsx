'use client'

// app/dashboard/superadmin/permissions/PermissionsClient.tsx
// Halaman list semua permissions + badge role yang memilikinya.
// Fitur: search, tambah permission (dialog), edit deskripsi (dialog).
//
// Dibuat: Sesi #134 — M7 Roles & Permissions Management

import { useState, useMemo }              from 'react'
import { useRouter }                      from 'next/navigation'
import { toast }                          from 'sonner'
import { Button }                         from '@/components/ui/button'
import { Badge }                          from '@/components/ui/badge'
import { Input }                          from '@/components/ui/input'
import { Label }                          from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
}                                         from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogFooter,
  DialogHeader, DialogTitle,
}                                         from '@/components/ui/dialog'
import { ICON_ACTION, ICON_STATUS }       from '@/lib/constants/icons.constant'
import type { PermissionWithRoles }       from '@/lib/types/roles-permissions.types'

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  initialData: PermissionWithRoles[]
}

// ─── Role badge warna ─────────────────────────────────────────────────────────

const ROLE_BADGE_CLASS: Record<string, string> = {
  customer:     'bg-slate-100 text-slate-700',
  vendor:       'bg-blue-100 text-blue-700',
  admin_tenant: 'bg-purple-100 text-purple-700',
  super_admin:  'bg-red-100 text-red-700',
}

// ─── Komponen ─────────────────────────────────────────────────────────────────

export function PermissionsClient({ initialData }: Props) {
  const router = useRouter()

  const [permissions, setPermissions] = useState<PermissionWithRoles[]>(initialData)
  const [search,      setSearch]      = useState('')

  // Dialog tambah
  const [addOpen,    setAddOpen]    = useState(false)
  const [addCode,    setAddCode]    = useState('')
  const [addDesc,    setAddDesc]    = useState('')
  const [addLoading, setAddLoading] = useState(false)

  // Dialog edit
  const [editTarget,  setEditTarget]  = useState<PermissionWithRoles | null>(null)
  const [editDesc,    setEditDesc]    = useState('')
  const [editLoading, setEditLoading] = useState(false)

  const filtered = useMemo(
    () => permissions.filter(p =>
      p.code.includes(search.toLowerCase()) ||
      (p.description ?? '').toLowerCase().includes(search.toLowerCase())
    ),
    [permissions, search]
  )

  // ── Tambah permission ──────────────────────────────────────────────────────

  async function handleAdd() {
    if (!addCode.trim() || !addDesc.trim()) return
    setAddLoading(true)
    try {
      const res  = await fetch('/api/superadmin/permissions', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ code: addCode.trim(), description: addDesc.trim() }),
      })
      const json = await res.json() as { data?: PermissionWithRoles; error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Gagal')

      const newPerm: PermissionWithRoles = { ...json.data!, roles: [] }
      setPermissions(prev =>
        [...prev, newPerm].sort((a, b) => a.code.localeCompare(b.code))
      )
      toast.success(`Permission "${addCode.trim()}" berhasil ditambahkan`)
      setAddOpen(false)
      setAddCode('')
      setAddDesc('')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setAddLoading(false)
    }
  }

  // ── Edit permission ────────────────────────────────────────────────────────

  function openEdit(p: PermissionWithRoles) {
    setEditTarget(p)
    setEditDesc(p.description ?? '')
  }

  async function handleEdit() {
    if (!editTarget || !editDesc.trim()) return
    setEditLoading(true)
    try {
      const res  = await fetch(`/api/superadmin/permissions/${editTarget.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ description: editDesc.trim() }),
      })
      const json = await res.json() as { error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Gagal')

      setPermissions(prev =>
        prev.map(p =>
          p.id === editTarget.id ? { ...p, description: editDesc.trim() } : p
        )
      )
      toast.success('Deskripsi permission berhasil diperbarui')
      setEditTarget(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setEditLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-4">

      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Permissions</h1>
        <Button onClick={() => setAddOpen(true)}>
          <ICON_ACTION.add size={15} className="mr-2" />
          Tambah Permission
        </Button>
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <ICON_ACTION.search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Cari permission..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <span className="text-sm text-slate-500">{filtered.length} permissions</span>
      </div>

      {/* ── Tabel Permissions ────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wide">
            Daftar Permission
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-48">Code</TableHead>
                <TableHead>Deskripsi</TableHead>
                <TableHead className="w-56">Dipakai Oleh</TableHead>
                <TableHead className="w-20 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-sm text-slate-400">
                    {permissions.length === 0 ? 'Belum ada permission.' : 'Tidak ada hasil pencarian.'}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(p => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <code className="text-xs font-medium text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
                        {p.code}
                      </code>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {p.description ?? <span className="text-slate-300 italic">—</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {p.roles.length === 0 ? (
                          <span className="text-xs text-slate-300 italic">Belum di-assign</span>
                        ) : (
                          p.roles.map(r => (
                            <span
                              key={r.id}
                              className={`text-xs px-1.5 py-0.5 rounded font-medium ${ROLE_BADGE_CLASS[r.code] ?? 'bg-slate-100 text-slate-600'}`}
                            >
                              {r.code}
                            </span>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => openEdit(p)}
                      >
                        <ICON_ACTION.edit size={13} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Dialog Tambah Permission ─────────────────────────────────────────── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Permission Baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="add-code">Code *</Label>
              <Input
                id="add-code"
                placeholder="contoh: order.refund"
                value={addCode}
                onChange={e => setAddCode(e.target.value)}
                className="font-mono"
              />
              <p className="text-xs text-slate-400">
                Format: {'{resource}.{action}'} — huruf kecil, titik sebagai pemisah.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-desc">Deskripsi *</Label>
              <Input
                id="add-desc"
                placeholder="contoh: Proses refund pesanan"
                value={addDesc}
                onChange={e => setAddDesc(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Batal</Button>
            <Button
              onClick={handleAdd}
              disabled={addLoading || !addCode.trim() || !addDesc.trim()}
            >
              {addLoading && <ICON_STATUS.loading size={14} className="mr-2 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Edit Deskripsi ─────────────────────────────────────────────── */}
      <Dialog open={editTarget !== null} onOpenChange={open => !open && setEditTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Permission</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Code</Label>
                <Input
                  value={editTarget.code}
                  readOnly
                  className="font-mono bg-slate-50 text-slate-400 cursor-not-allowed"
                />
                <p className="text-xs text-slate-400">Code permission tidak bisa diubah setelah dibuat.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-desc">Deskripsi *</Label>
                <Input
                  id="edit-desc"
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Batal</Button>
            <Button
              onClick={handleEdit}
              disabled={editLoading || !editDesc.trim()}
            >
              {editLoading && <ICON_STATUS.loading size={14} className="mr-2 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
