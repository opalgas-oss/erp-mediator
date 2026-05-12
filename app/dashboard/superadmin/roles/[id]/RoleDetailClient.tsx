'use client'

// app/dashboard/superadmin/roles/[id]/RoleDetailClient.tsx
// Halaman detail role — layout 2 panel: Permissions Aktif (kiri) + Tersedia (kanan).
// Assign: klik "+ Tambahkan" di panel kanan → dialog konfirmasi → POST API.
// Revoke: klik "× Cabut" di panel kiri → dialog konfirmasi → DELETE API.
//
// Dibuat: Sesi #134 — M7 Roles & Permissions Management

import { useState, useMemo }              from 'react'
import { useRouter }                      from 'next/navigation'
import { toast }                          from 'sonner'
import { Button }                         from '@/components/ui/button'
import { Input }                          from '@/components/ui/input'
import { Badge }                          from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogFooter,
  DialogHeader, DialogTitle,
}                                         from '@/components/ui/dialog'
import { ICON_STATUS, ICON_NAV }          from '@/lib/constants/icons.constant'
import type { RoleWithPermissions, Permission } from '@/lib/types/roles-permissions.types'

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  role: RoleWithPermissions
}

// ─── Confirm dialog state ─────────────────────────────────────────────────────

type ConfirmAction =
  | { type: 'assign';  permission: Permission }
  | { type: 'revoke';  permission: Permission }
  | null

// ─── Komponen ─────────────────────────────────────────────────────────────────

export function RoleDetailClient({ role }: Props) {
  const router = useRouter()

  const [assigned,  setAssigned]  = useState<Permission[]>(role.assigned)
  const [available, setAvailable] = useState<Permission[]>(role.available)
  const [searchLeft,  setSearchLeft]  = useState('')
  const [searchRight, setSearchRight] = useState('')
  const [confirm,     setConfirm]     = useState<ConfirmAction>(null)
  const [submitting,  setSubmitting]  = useState(false)

  // Filter dengan search
  const filteredAssigned  = useMemo(
    () => assigned.filter(p =>
      p.code.includes(searchLeft.toLowerCase()) ||
      (p.description ?? '').toLowerCase().includes(searchLeft.toLowerCase())
    ),
    [assigned, searchLeft]
  )
  const filteredAvailable = useMemo(
    () => available.filter(p =>
      p.code.includes(searchRight.toLowerCase()) ||
      (p.description ?? '').toLowerCase().includes(searchRight.toLowerCase())
    ),
    [available, searchRight]
  )

  async function executeAction() {
    if (!confirm) return
    setSubmitting(true)
    try {
      let res: Response
      if (confirm.type === 'assign') {
        res = await fetch(`/api/superadmin/roles/${role.id}/permissions`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ permission_id: confirm.permission.id }),
        })
      } else {
        res = await fetch(
          `/api/superadmin/roles/${role.id}/permissions/${confirm.permission.id}`,
          { method: 'DELETE' }
        )
      }

      const json = await res.json() as { error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Gagal')

      // Update state lokal — tidak perlu router.refresh()
      if (confirm.type === 'assign') {
        setAssigned(prev  => [...prev,  confirm.permission].sort((a, b) => a.code.localeCompare(b.code)))
        setAvailable(prev => prev.filter(p => p.id !== confirm.permission.id))
        toast.success(`Permission "${confirm.permission.code}" berhasil ditambahkan ke role ${role.code}`)
      } else {
        setAvailable(prev => [...prev, confirm.permission].sort((a, b) => a.code.localeCompare(b.code)))
        setAssigned(prev  => prev.filter(p => p.id !== confirm.permission.id))
        toast.success(`Permission "${confirm.permission.code}" berhasil dicabut dari role ${role.code}`)
      }
      setConfirm(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6 space-y-4">

      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/superadmin/roles')}>
          <ICON_NAV.chevronLeft size={15} className="mr-1" />
          Kembali
        </Button>
        <h1 className="text-xl font-semibold text-slate-900">
          Role:{' '}
          <code className="font-mono bg-slate-100 px-2 py-0.5 rounded text-lg">{role.code}</code>
        </h1>
      </div>

      {/* ── Info Role ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 px-4 py-3 rounded-md border bg-slate-50 text-sm">
        <span className="text-slate-500">ID: <strong>{role.id}</strong></span>
        <span className="text-slate-400">|</span>
        <span className="text-slate-500">Code: <code className="font-mono">{role.code}</code></span>
        {role.description && (
          <>
            <span className="text-slate-400">|</span>
            <span className="text-slate-500">{role.description}</span>
          </>
        )}
      </div>

      {/* ── Dua Panel ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">

        {/* Panel Kiri — Permissions Aktif */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Permissions Aktif ({assigned.length})</CardTitle>
            <CardDescription className="text-xs">
              Permissions yang sudah dimiliki role ini
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Input
              placeholder="Cari permission..."
              value={searchLeft}
              onChange={e => setSearchLeft(e.target.value)}
              className="h-8 text-sm"
            />
            <div className="space-y-1 max-h-[420px] overflow-y-auto pr-1">
              {filteredAssigned.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">
                  {assigned.length === 0 ? 'Role ini belum memiliki permission.' : 'Tidak ada hasil pencarian.'}
                </p>
              ) : (
                filteredAssigned.map(p => (
                  <div key={p.id} className="flex items-center justify-between gap-2 py-1.5 px-2 rounded hover:bg-slate-50">
                    <div className="min-w-0">
                      <code className="text-xs font-medium text-slate-800">{p.code}</code>
                      {p.description && (
                        <p className="text-xs text-slate-400 truncate">{p.description}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                      onClick={() => setConfirm({ type: 'revoke', permission: p })}
                    >
                      × Cabut
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Panel Kanan — Permissions Tersedia */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Tersedia ({available.length})</CardTitle>
            <CardDescription className="text-xs">
              Permissions yang bisa ditambahkan ke role ini
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Input
              placeholder="Cari permission..."
              value={searchRight}
              onChange={e => setSearchRight(e.target.value)}
              className="h-8 text-sm"
            />
            <div className="space-y-1 max-h-[420px] overflow-y-auto pr-1">
              {filteredAvailable.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">
                  {available.length === 0 ? 'Semua permission sudah di-assign ke role ini.' : 'Tidak ada hasil pencarian.'}
                </p>
              ) : (
                filteredAvailable.map(p => (
                  <div key={p.id} className="flex items-center justify-between gap-2 py-1.5 px-2 rounded hover:bg-slate-50">
                    <div className="min-w-0">
                      <code className="text-xs font-medium text-slate-800">{p.code}</code>
                      {p.description && (
                        <p className="text-xs text-slate-400 truncate">{p.description}</p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs shrink-0"
                      onClick={() => setConfirm({ type: 'assign', permission: p })}
                    >
                      + Tambahkan
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

      </div>

      {/* ── Dialog Konfirmasi ────────────────────────────────────────────────── */}
      <Dialog open={confirm !== null} onOpenChange={open => !open && setConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {confirm?.type === 'assign' ? 'Tambahkan Permission' : 'Cabut Permission'}
            </DialogTitle>
          </DialogHeader>

          {confirm && (
            <div className="py-2 text-sm text-slate-600">
              {confirm.type === 'assign' ? (
                <p>
                  Tambahkan permission{' '}
                  <Badge variant="secondary" className="font-mono">{confirm.permission.code}</Badge>
                  {' '}ke role <strong>{role.code}</strong>?
                </p>
              ) : (
                <p>
                  Hapus permission{' '}
                  <Badge variant="secondary" className="font-mono">{confirm.permission.code}</Badge>
                  {' '}dari role <strong>{role.code}</strong>?
                  <br />
                  <span className="text-slate-400 text-xs mt-1 block">
                    Semua user dengan role ini akan kehilangan akses ini.
                  </span>
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)}>Batal</Button>
            <Button
              variant={confirm?.type === 'revoke' ? 'destructive' : 'default'}
              onClick={executeAction}
              disabled={submitting}
            >
              {submitting && <ICON_STATUS.loading size={14} className="mr-2 animate-spin" />}
              {confirm?.type === 'assign' ? 'Ya, Tambahkan' : 'Ya, Cabut'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
