'use client'

// app/dashboard/superadmin/tenants/[id]/tab-kategori.dialog-hentikan.tsx
// DialogHentikanKategori — PATCH action=suspend atau aktifkan-kembali
// API: PATCH /api/superadmin/tenants/[id]/categories/[assignmentId]
//   body suspend:           { action: 'suspend', suspend_reason: string }
//   body aktifkan-kembali:  { action: 'aktifkan-kembali' }
//
// Dibuat: Sesi #325 — Pecah tab-kategori.dialogs.tsx (30 KB → 5 file)
// Dipakai oleh: tab-kategori.dialogs.tsx (re-export), TabKategori.tsx

import { useState } from 'react'
import { toast }    from 'sonner'
import {
  DialogOverlay, DialogCard, DialogHeader, DialogFooter, BtnBatal,
  type BaseDialogProps,
} from './tab-kategori.dialog-helpers'

// ─── Dialog Hentikan / Aktifkan Kembali Kategori ─────────────────────────────

export function DialogHentikanKategori({ tenantId, assignment, open, onClose, onSuccess }: BaseDialogProps) {
  const [alasan,     setAlasan]     = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!open || !assignment) return null

  const isSuspended = assignment.status === 'suspended'

  const handleSuspend = async () => {
    if (!alasan.trim()) { toast.error('Alasan wajib diisi'); return }
    setSubmitting(true)
    try {
      const res  = await fetch(`/api/superadmin/tenants/${tenantId}/categories/${assignment.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'suspend', suspend_reason: alasan.trim() }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Kategori berhasil dihentikan sementara')
        onSuccess(); onClose()
      } else {
        toast.error(json.message ?? 'Gagal menghentikan kategori')
      }
    } catch {
      toast.error('Terjadi kesalahan jaringan')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAktifkan = async () => {
    setSubmitting(true)
    try {
      const res  = await fetch(`/api/superadmin/tenants/${tenantId}/categories/${assignment.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'aktifkan-kembali' }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Kategori berhasil diaktifkan kembali')
        onSuccess(); onClose()
      } else {
        toast.error(json.message ?? 'Gagal mengaktifkan kembali')
      }
    } catch {
      toast.error('Terjadi kesalahan jaringan')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <DialogOverlay onClose={onClose}>
      <DialogCard>
        <DialogHeader
          title={isSuspended ? 'Aktifkan Kembali Kategori' : 'Hentikan Kategori Sementara'}
          subtitle={`Kategori: ${assignment.kategori.display_name}`}
          onClose={onClose}
        />

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {isSuspended ? (
            <div>
              <div style={{ fontSize: 13, color: '#1a1a1a', marginBottom: 12 }}>
                Kategori ini sedang ditangguhkan. Mengaktifkan kembali akan membuat kategori ini aktif dan bisa melayani pesanan.
              </div>
              {assignment.suspend_reason && (
                <div style={{ fontSize: 12, color: '#854F0B', background: '#FAEEDA', borderWidth: '0.5px', borderStyle: 'solid', borderColor: '#EF9F27', borderRadius: 8, padding: '8px 12px' }}>
                  <i className="ti ti-player-pause" style={{ marginRight: 5 }} />
                  Alasan penghentian sebelumnya: <em>{assignment.suspend_reason}</em>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 13, color: '#1a1a1a', marginBottom: 12 }}>
                Menghentikan sementara kategori ini. Tenant tetap memegang kategori ini, namun tidak bisa menerima pesanan baru. Bisa diaktifkan kembali kapan saja.
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5 }}>
                  Alasan penghentian <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <textarea
                  value={alasan}
                  onChange={e => setAlasan(e.target.value)}
                  placeholder="Jelaskan alasan penghentian sementara..."
                  rows={3}
                  style={{ width: '100%', padding: '8px 10px', borderWidth: '0.5px', borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.18)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <BtnBatal onClose={onClose} disabled={submitting} />
          {isSuspended ? (
            <button onClick={handleAktifkan} disabled={submitting}
              style={{ padding: '6px 18px', borderWidth: '0.5px', borderStyle: 'solid', fontSize: 13, borderRadius: 8, fontWeight: 500,
                borderColor: submitting ? 'rgba(0,0,0,0.12)' : '#97C459',
                background:  submitting ? '#f3f4f6' : '#EAF3DE',
                color:       submitting ? '#9ca3af' : '#3B6D11',
                cursor:      submitting ? 'not-allowed' : 'pointer' }}>
              {submitting
                ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><i className="ti ti-loader-2 ti-spin" style={{ fontSize: 13 }} />Memproses…</span>
                : <span><i className="ti ti-player-play" style={{ marginRight: 5 }} />Aktifkan Kembali</span>}
            </button>
          ) : (
            <button onClick={handleSuspend} disabled={submitting || !alasan.trim()}
              style={{ padding: '6px 18px', borderWidth: '0.5px', borderStyle: 'solid', fontSize: 13, borderRadius: 8, fontWeight: 500,
                borderColor: submitting || !alasan.trim() ? 'rgba(0,0,0,0.12)' : '#EF9F27',
                background:  submitting || !alasan.trim() ? '#f3f4f6' : '#FAEEDA',
                color:       submitting || !alasan.trim() ? '#9ca3af' : '#854F0B',
                cursor:      submitting || !alasan.trim() ? 'not-allowed' : 'pointer' }}>
              {submitting
                ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><i className="ti ti-loader-2 ti-spin" style={{ fontSize: 13 }} />Memproses…</span>
                : <span><i className="ti ti-player-pause" style={{ marginRight: 5 }} />Hentikan Kategori</span>}
            </button>
          )}
        </DialogFooter>
      </DialogCard>
    </DialogOverlay>
  )
}
