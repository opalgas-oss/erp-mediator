'use client'

// app/dashboard/superadmin/refunds/RefundActionDialogs.tsx
// Dialog konfirmasi untuk aksi SuperAdmin terhadap complaint:
//   - RefundApproveDialog — konfirmasi persetujuan refund
//   - RefundRejectDialog  — reject dengan alasan wajib
//
// Dibuat: Sesi #137 — M9 Approval Refund SuperAdmin
// Fix S#137: Ganti AlertDialog → Dialog (alert-dialog tidak ada di project)

import { useState }                             from 'react'
import { toast }                                from 'sonner'
import { Button }                               from '@/components/ui/button'
import { Textarea }                             from '@/components/ui/textarea'
import { Label }                                from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
}                                               from '@/components/ui/dialog'
import { ICON_STATUS }                          from '@/lib/constants/icons.constant'
import type { RefundListItem }                  from '@/lib/types/complaint.types'

// ─── Format rupiah ────────────────────────────────────────────────────────────

function formatRupiah(amount: number | null): string {
  if (amount === null) return 'belum ditentukan'
  return new Intl.NumberFormat('id-ID', {
    style:    'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount)
}

// ─── Dialog Approve ───────────────────────────────────────────────────────────

interface ApproveProps {
  target:    RefundListItem | null
  onClose:   () => void
  onSuccess: () => void
}

export function RefundApproveDialog({ target, onClose, onSuccess }: ApproveProps) {
  const [notes,   setNotes]   = useState('')
  const [loading, setLoading] = useState(false)

  async function handleApprove() {
    if (!target) return
    setLoading(true)
    try {
      const res = await fetch(`/api/superadmin/refunds/${target.id}/approve`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ resolution_notes: notes || undefined }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Gagal menyetujui refund')

      toast.success(`Refund komplain "${target.subject}" berhasil disetujui`)
      setNotes('')
      onSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    if (loading) return
    setNotes('')
    onClose()
  }

  return (
    <Dialog open={!!target} onOpenChange={open => !open && handleClose()}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ICON_STATUS.success size={18} className="text-emerald-600" />
            Setujui Refund
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2 text-sm text-slate-600 mt-2">
              <p>Anda akan menyetujui refund untuk komplain:</p>
              <div className="rounded bg-slate-50 border px-3 py-2 space-y-1">
                <p className="font-medium text-slate-800">{target?.subject}</p>
                <p className="text-xs text-slate-500">
                  Tenant: {target?.tenant_nama}
                </p>
                <p className="text-xs text-slate-500">
                  Customer: {target?.customer_nama || target?.customer_email}
                </p>
                <p className="text-xs font-medium text-emerald-700">
                  Nominal: {formatRupiah(target?.refund_amount ?? null)}
                </p>
              </div>
              <p className="text-xs text-slate-400">
                Setelah disetujui, refund akan diproses dan tidak dapat dibatalkan.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-1">
          <Label htmlFor="approve-notes" className="text-sm font-medium">
            Catatan (opsional)
          </Label>
          <Textarea
            id="approve-notes"
            placeholder="Catatan persetujuan untuk AdminTenant..."
            className="min-h-[80px] text-sm resize-none"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            disabled={loading}
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Batal
          </Button>
          <Button
            onClick={handleApprove}
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {loading
              ? <><ICON_STATUS.loading size={14} className="mr-2 animate-spin" />Memproses...</>
              : <><ICON_STATUS.success size={14} className="mr-2" />Setujui Refund</>
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Dialog Reject ────────────────────────────────────────────────────────────

interface RejectProps {
  target:    RefundListItem | null
  onClose:   () => void
  onSuccess: () => void
}

export function RefundRejectDialog({ target, onClose, onSuccess }: RejectProps) {
  const [notes,   setNotes]   = useState('')
  const [loading, setLoading] = useState(false)
  const [touched, setTouched] = useState(false)

  const notesEmpty = notes.trim() === ''
  const showError  = touched && notesEmpty

  async function handleReject() {
    setTouched(true)
    if (notesEmpty) return
    if (!target) return

    setLoading(true)
    try {
      const res = await fetch(`/api/superadmin/refunds/${target.id}/reject`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ resolution_notes: notes }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Gagal menolak refund')

      toast.success(`Refund komplain "${target.subject}" berhasil ditolak`)
      setNotes('')
      setTouched(false)
      onSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    if (loading) return
    setNotes('')
    setTouched(false)
    onClose()
  }

  return (
    <Dialog open={!!target} onOpenChange={open => !open && handleClose()}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ICON_STATUS.failed size={18} className="text-destructive" />
            Tolak Refund
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2 text-sm text-slate-600 mt-2">
              <p>Anda akan menolak refund untuk komplain:</p>
              <div className="rounded bg-slate-50 border px-3 py-2 space-y-1">
                <p className="font-medium text-slate-800">{target?.subject}</p>
                <p className="text-xs text-slate-500">
                  Tenant: {target?.tenant_nama}
                </p>
                <p className="text-xs text-slate-500">
                  Customer: {target?.customer_nama || target?.customer_email}
                </p>
              </div>
              <p className="text-xs text-slate-400">
                Penolakan akan dikembalikan ke AdminTenant untuk penanganan lebih lanjut.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-1">
          <Label htmlFor="reject-notes" className="text-sm font-medium">
            Alasan penolakan <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="reject-notes"
            placeholder="Jelaskan alasan penolakan refund ini..."
            className={`min-h-[96px] text-sm resize-none ${showError ? 'border-destructive ring-destructive' : ''}`}
            value={notes}
            onChange={e => { setNotes(e.target.value); setTouched(true) }}
            disabled={loading}
          />
          {showError && (
            <p className="text-xs text-destructive">Alasan penolakan wajib diisi</p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Batal
          </Button>
          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={loading}
          >
            {loading
              ? <><ICON_STATUS.loading size={14} className="mr-2 animate-spin" />Memproses...</>
              : <><ICON_STATUS.failed size={14} className="mr-2" />Tolak Refund</>
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
