'use client'

// app/dashboard/superadmin/tenants/[id]/tab-kategori.dialog-lepas.tsx
// DialogLepasKategori — DELETE 2-step: alasan + konfirmasi nama kategori
// API: DELETE /api/superadmin/tenants/[id]/categories/[assignmentId]
//   body: { revoke_reason: string, konfirmasi_nama_kategori: string }
//
// Dibuat: Sesi #325 — Pecah tab-kategori.dialogs.tsx (30 KB → 5 file)
// Dipakai oleh: tab-kategori.dialogs.tsx (re-export), TabKategori.tsx

import { useState } from 'react'
import { toast }    from 'sonner'
import {
  DialogOverlay, DialogCard, DialogHeader, DialogFooter, BtnBatal,
  type BaseDialogProps,
} from './tab-kategori.dialog-helpers'

// ─── Dialog Lepas Kategori (2-step) ──────────────────────────────────────────

export function DialogLepasKategori({ tenantId, assignment, open, onClose, onSuccess }: BaseDialogProps) {
  const [step,       setStep]       = useState<1 | 2>(1)
  const [alasan,     setAlasan]     = useState('')
  const [konfirmasi, setKonfirmasi] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!open || !assignment) return null

  const namaKategori    = assignment.kategori.display_name
  const konfirmasiValid = konfirmasi === namaKategori

  const handleNext = () => {
    if (!alasan.trim()) { toast.error('Alasan wajib diisi'); return }
    setStep(2)
  }

  const handleSubmit = async () => {
    if (!konfirmasiValid) { toast.error('Nama kategori tidak sesuai'); return }
    setSubmitting(true)
    try {
      const res  = await fetch(`/api/superadmin/tenants/${tenantId}/categories/${assignment.id}`, {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          revoke_reason:            alasan.trim(),
          konfirmasi_nama_kategori: konfirmasi,
        }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(`Kategori "${namaKategori}" berhasil dilepas dari tenant ini`)
        onSuccess(); onClose()
      } else {
        toast.error(json.message ?? 'Gagal melepas kategori')
      }
    } catch {
      toast.error('Terjadi kesalahan jaringan')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setStep(1); setAlasan(''); setKonfirmasi('')
    onClose()
  }

  return (
    <DialogOverlay onClose={handleClose}>
      <DialogCard>
        <DialogHeader
          title="Lepas Kategori dari Tenant"
          subtitle={step === 1 ? 'Langkah 1: Isi alasan' : 'Langkah 2: Konfirmasi nama kategori'}
          onClose={handleClose}
        />

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 6, padding: '0 16px 12px', borderBottomWidth: '0.5px', borderBottomStyle: 'solid', borderBottomColor: 'rgba(0,0,0,0.08)' }}>
          {([1, 2] as const).map(s => (
            <div key={s} style={{ height: 3, flex: 1, borderRadius: 2, background: step >= s ? '#A32D2D' : '#e5e7eb' }} />
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {step === 1 ? (
            <div>
              {/* Peringatan */}
              <div style={{ fontSize: 12, color: '#A32D2D', background: '#FCEBEB', borderWidth: '0.5px', borderStyle: 'solid', borderColor: '#F09595', borderRadius: 8, padding: '10px 12px', marginBottom: 14, display: 'flex', gap: 8 }}>
                <i className="ti ti-alert-triangle" style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }} />
                <div>
                  <strong>Tindakan ini tidak bisa dibatalkan.</strong> Setelah dilepas, area yang sebelumnya dikuasai kategori ini bisa dipegang oleh tenant lain. Riwayat assignment tetap tersimpan.
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5 }}>
                  Alasan pencabutan <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <textarea
                  value={alasan}
                  onChange={e => setAlasan(e.target.value)}
                  placeholder="Jelaskan alasan melepas kategori ini dari tenant..."
                  rows={3}
                  style={{ width: '100%', padding: '8px 10px', borderWidth: '0.5px', borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.18)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 12, color: '#6b7280', background: '#f9f9f8', borderWidth: '0.5px', borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.12)', borderRadius: 8, padding: '8px 12px', marginBottom: 14 }}>
                Alasan: <em>{alasan}</em>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5 }}>
                  Ketik nama kategori untuk konfirmasi <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
                  Ketik persis: <strong style={{ color: '#1a1a1a' }}>{namaKategori}</strong>
                </div>
                <input
                  type="text"
                  value={konfirmasi}
                  onChange={e => setKonfirmasi(e.target.value)}
                  placeholder={namaKategori}
                  style={{ width: '100%', padding: '8px 10px', borderWidth: '0.5px', borderStyle: 'solid', borderColor: konfirmasi && !konfirmasiValid ? '#F09595' : 'rgba(0,0,0,0.18)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
                {konfirmasi && !konfirmasiValid && (
                  <div style={{ fontSize: 11, color: '#A32D2D', marginTop: 4 }}>
                    <i className="ti ti-x" style={{ marginRight: 3 }} />Nama tidak sesuai
                  </div>
                )}
                {konfirmasiValid && (
                  <div style={{ fontSize: 11, color: '#3B6D11', marginTop: 4 }}>
                    <i className="ti ti-check" style={{ marginRight: 3 }} />Nama sesuai
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {step === 2 && (
            <button onClick={() => setStep(1)} disabled={submitting}
              style={{ padding: '6px 14px', borderWidth: '0.5px', borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.22)', borderRadius: 8, fontSize: 13, cursor: 'pointer', background: '#fff', color: '#6b7280', marginRight: 'auto' }}>
              <i className="ti ti-arrow-left" style={{ marginRight: 4 }} />Kembali
            </button>
          )}
          <BtnBatal onClose={handleClose} disabled={submitting} />
          {step === 1 ? (
            <button onClick={handleNext} disabled={!alasan.trim()}
              style={{ padding: '6px 18px', borderWidth: '0.5px', borderStyle: 'solid', fontSize: 13, borderRadius: 8, fontWeight: 500,
                borderColor: !alasan.trim() ? 'rgba(0,0,0,0.12)' : '#F09595',
                background:  !alasan.trim() ? '#f3f4f6' : '#FCEBEB',
                color:       !alasan.trim() ? '#9ca3af' : '#A32D2D',
                cursor:      !alasan.trim() ? 'not-allowed' : 'pointer' }}>
              Lanjut <i className="ti ti-arrow-right" style={{ marginLeft: 4 }} />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={submitting || !konfirmasiValid}
              style={{ padding: '6px 18px', borderWidth: '0.5px', borderStyle: 'solid', fontSize: 13, borderRadius: 8, fontWeight: 500,
                borderColor: submitting || !konfirmasiValid ? 'rgba(0,0,0,0.12)' : '#F09595',
                background:  submitting || !konfirmasiValid ? '#f3f4f6' : '#FCEBEB',
                color:       submitting || !konfirmasiValid ? '#9ca3af' : '#A32D2D',
                cursor:      submitting || !konfirmasiValid ? 'not-allowed' : 'pointer' }}>
              {submitting
                ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><i className="ti ti-loader-2 ti-spin" style={{ fontSize: 13 }} />Memproses…</span>
                : <span><i className="ti ti-x" style={{ marginRight: 5 }} />Lepas Kategori</span>}
            </button>
          )}
        </DialogFooter>
      </DialogCard>
    </DialogOverlay>
  )
}
