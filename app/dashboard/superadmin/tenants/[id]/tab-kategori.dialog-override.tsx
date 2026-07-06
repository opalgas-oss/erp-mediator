'use client'

// app/dashboard/superadmin/tenants/[id]/tab-kategori.dialog-override.tsx
// DialogEditOverrideKomisi — PATCH action=update-override
// API: PATCH /api/superadmin/tenants/[id]/categories/[assignmentId]
//   body: { action: 'update-override', commission_override: number (0-1), sla_minutes: number|null }
//
// Dibuat: Sesi #325 — Pecah tab-kategori.dialogs.tsx (30 KB → 5 file)
// Dipakai oleh: tab-kategori.dialogs.tsx (re-export), TabKategori.tsx

import { useState } from 'react'
import { toast }    from 'sonner'
import {
  DialogOverlay, DialogCard, DialogHeader, DialogFooter, BtnBatal,
  type BaseDialogProps,
} from './tab-kategori.dialog-helpers'

// ─── Dialog Edit Override Komisi ──────────────────────────────────────────────

export function DialogEditOverrideKomisi({ tenantId, assignment, open, onClose, onSuccess }: BaseDialogProps) {
  const [komisi,     setKomisi]     = useState('')
  const [sla,        setSla]        = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!open || !assignment) return null

  const handleSubmit = async () => {
    const komisiNum = parseFloat(komisi)
    if (isNaN(komisiNum) || komisiNum < 0 || komisiNum > 100) {
      toast.error('Komisi harus angka antara 0 sampai 100')
      return
    }
    setSubmitting(true)
    try {
      const res  = await fetch(`/api/superadmin/tenants/${tenantId}/categories/${assignment.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          action:              'update-override',
          commission_override: komisiNum / 100,
          sla_minutes:         sla ? parseInt(sla, 10) : null,
        }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Override komisi berhasil disimpan')
        onSuccess(); onClose()
      } else {
        toast.error(json.message ?? 'Gagal menyimpan override komisi')
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
          title="Edit Override Komisi"
          subtitle={`Kategori: ${assignment.kategori.display_name}`}
          onClose={onClose}
        />

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {/* Info rate kontrak */}
          {assignment.rate_kontrak && (
            <div style={{ fontSize: 12, color: '#6b7280', background: '#f9f9f8', borderWidth: '0.5px', borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.12)', borderRadius: 8, padding: '8px 12px', marginBottom: 14 }}>
              <i className="ti ti-info-circle" style={{ marginRight: 5 }} />
              Rate kontrak tenant: <strong>{assignment.rate_kontrak}%</strong>. Override hanya berlaku untuk kategori ini.
            </div>
          )}

          {/* Input komisi */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5 }}>
              Komisi override (%) <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="number" min="0" max="100" step="0.1"
                value={komisi}
                onChange={e => setKomisi(e.target.value)}
                placeholder="Contoh: 8.5"
                style={{ width: 140, padding: '7px 10px', borderWidth: '0.5px', borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.18)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }}
              />
              <span style={{ fontSize: 12, color: '#6b7280' }}>% (0 – 100)</span>
            </div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Masukkan 0 jika ingin komisi nol</div>
          </div>

          {/* Input SLA */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5 }}>
              SLA respon (menit) — opsional
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="number" min="1"
                value={sla}
                onChange={e => setSla(e.target.value)}
                placeholder="Contoh: 60"
                style={{ width: 140, padding: '7px 10px', borderWidth: '0.5px', borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.18)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }}
              />
              <span style={{ fontSize: 12, color: '#6b7280' }}>menit</span>
            </div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Kosongkan = ikut SLA standar platform</div>
          </div>
        </div>

        <DialogFooter>
          <BtnBatal onClose={onClose} disabled={submitting} />
          <button onClick={handleSubmit} disabled={submitting || !komisi}
            style={{ padding: '6px 18px', borderWidth: '0.5px', borderStyle: 'solid', fontSize: 13, borderRadius: 8, fontWeight: 500,
              borderColor: submitting || !komisi ? 'rgba(0,0,0,0.12)' : '#85B7EB',
              background:  submitting || !komisi ? '#f3f4f6' : '#E6F1FB',
              color:       submitting || !komisi ? '#9ca3af' : '#185FA5',
              cursor:      submitting || !komisi ? 'not-allowed' : 'pointer' }}>
            {submitting
              ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><i className="ti ti-loader-2 ti-spin" style={{ fontSize: 13 }} />Menyimpan…</span>
              : 'Simpan Override'}
          </button>
        </DialogFooter>
      </DialogCard>
    </DialogOverlay>
  )
}
