'use client'

// app/dashboard/superadmin/tenants/[id]/DialogHapusPICCadangan.tsx
// Dialog konfirmasi hapus PIC Cadangan
// API: DELETE /api/superadmin/tenants/${tenantId}/change-pic/cadangan
//
// Dibuat: Sesi #147 — HUTANG-02 (dipecah dari DialogTambahPICCadangan karena ATURAN 9)

import { useState }       from 'react'
import { toast }           from 'sonner'
import type { PICKartu }  from '@/lib/types/tenant-pic.types'

interface Props {
  tenantId:  string
  open:      boolean
  existing:  PICKartu | null
  onClose:   () => void
  onSuccess: () => void
}

const S = {
  overlay: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
  dialog:  { background: '#fff', borderRadius: 12, width: '100%', maxWidth: 420, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' },
  header:  { padding: '16px 20px', borderBottomWidth: '0.5px', borderBottomStyle: 'solid' as const, borderBottomColor: 'rgba(0,0,0,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  body:    { padding: '20px' },
  footer:  { padding: '12px 20px', borderTopWidth: '0.5px', borderTopStyle: 'solid' as const, borderTopColor: 'rgba(0,0,0,0.10)', display: 'flex', justifyContent: 'flex-end', gap: 8 },
  btn:     { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none', fontFamily: 'inherit' } as React.CSSProperties,
}

export function DialogHapusPICCadangan({ tenantId, open, existing, onClose, onSuccess }: Props) {
  const [submitting, setSubmitting] = useState(false)

  if (!open) return null

  async function handleHapus() {
    setSubmitting(true)
    try {
      const res  = await fetch(`/api/superadmin/tenants/${tenantId}/change-pic/cadangan`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.message ?? 'Gagal menghapus PIC cadangan')
      toast.success('PIC cadangan berhasil dihapus')
      onSuccess()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={S.overlay} onClick={() => !submitting && onClose()}>
      <div style={S.dialog} onClick={e => e.stopPropagation()}>

        <div style={S.header}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="ti ti-trash" style={{ color: '#A32D2D' }} />
            Hapus PIC Cadangan
          </div>
          <button onClick={onClose} disabled={submitting} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 18, padding: 0 }}>
            <i className="ti ti-x" />
          </button>
        </div>

        <div style={S.body}>
          <p style={{ fontSize: 13, color: '#374151', marginBottom: 12 }}>
            Hapus <strong>{existing?.user_name ?? 'PIC ini'}</strong> dari posisi PIC Cadangan?
          </p>
          <div style={{ background: '#FAEEDA', border: '0.5px solid #EF9F27', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#854F0B' }}>
            <i className="ti ti-alert-triangle" style={{ marginRight: 6 }} />
            Setelah dihapus, tenant tidak memiliki PIC cadangan. Tambahkan kembali jika diperlukan.
          </div>
        </div>

        <div style={S.footer}>
          <button onClick={onClose} disabled={submitting} style={{ ...S.btn, background: '#f3f4f6', color: '#374151' }}>
            Batal
          </button>
          <button onClick={handleHapus} disabled={submitting} style={{ ...S.btn, background: '#FCEBEB', color: '#A32D2D' }}>
            {submitting
              ? <><i className="ti ti-loader-2 ti-spin" style={{ fontSize: 13 }} /> Menghapus…</>
              : <><i className="ti ti-trash" style={{ fontSize: 13 }} /> Hapus</>}
          </button>
        </div>
      </div>
    </div>
  )
}
