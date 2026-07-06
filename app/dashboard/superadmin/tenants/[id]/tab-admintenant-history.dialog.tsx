'use client'

// app/dashboard/superadmin/tenants/[id]/tab-admintenant-history.dialog.tsx
// DialogKirimUlang — dipecah dari tab-admintenant-history.parts.tsx (S#324, file size > 10KB)
// Dibuat: Sesi #243 (K-30 Jalur 1) — dipindah ke file ini Sesi #324

import { useState } from 'react'
import type { AdminTenantKartu } from '@/lib/types/admin-tenant.types'
import { cs } from './tab-admintenant-history.styles'

interface DialogKirimUlangProps {
  at:         AdminTenantKartu
  tenantId:   string
  tenantNama: string
  onClose:    () => void
  onSuccess:  () => void
}

export function DialogKirimUlang({ at, tenantId, tenantNama, onClose, onSuccess }: DialogKirimUlangProps) {
  const [state, setState] = useState<'idle' | 'loading' | 'sukses' | 'error'>('idle')
  const [errMsg, setErrMsg] = useState('')

  const handleKirim = async () => {
    setState('loading')
    try {
      const res  = await fetch(`/api/superadmin/tenants/${tenantId}/admin-tenant`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          action:      'kirim_ulang_aktivasi',
          user_id:     at.user_id,
          tenant_nama: tenantNama,
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error ?? 'Gagal kirim ulang')
      if (!json.data?.emailTerkirim) throw new Error('Email gagal terkirim — cek credential Resend di dashboard SA Providers')
      setState('sukses')
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : 'Terjadi kesalahan')
      setState('error')
    }
  }

  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
  }
  const modal: React.CSSProperties = {
    background: '#fff', borderRadius: 12, padding: '24px 28px', width: 380,
    boxShadow: '0 8px 32px rgba(0,0,0,0.18)', maxWidth: '90vw',
  }

  if (state === 'sukses') return (
    <div style={overlay}>
      <div style={modal}>
        <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
          <div style={{ fontSize: 36, marginBottom: 10, color: '#3B6D11' }}>✓</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Email Aktivasi Terkirim</div>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
            Tautan aktivasi baru dikirim ke <strong>{at.user_email}</strong>.
          </div>
          <button
            onClick={() => { onSuccess(); onClose() }}
            style={{ ...cs.btn('0.5px solid #85B7EB', '#185FA5'), width: '100%', justifyContent: 'center' }}
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div style={overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={modal}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Kirim Ulang Email Aktivasi</div>
        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 16 }}>{tenantNama}</div>

        <div style={{ background: '#f9f9f8', borderRadius: 8, padding: '12px 14px', marginBottom: 16, fontSize: 13 }}>
          <div style={{ fontWeight: 500, marginBottom: 2 }}>{at.user_name}</div>
          <div style={{ color: '#6b7280', fontSize: 12 }}>{at.user_email}</div>
          <div style={{ marginTop: 8, fontSize: 12, color: '#854F0B' }}>
            <i className="ti ti-clock" style={{ fontSize: 11, marginRight: 4 }} />
            Status: Menunggu Aktivasi
          </div>
        </div>

        <div style={{ fontSize: 13, color: '#1a1a1a', marginBottom: 20 }}>
          Sistem akan membuat tautan aktivasi baru dan mengirimkannya ke email di atas.
          Tautan aktivasi lama akan kadaluarsa.
        </div>

        {state === 'error' && (
          <div style={{ fontSize: 12, color: '#A32D2D', background: '#FCEBEB', borderRadius: 6, padding: '8px 12px', marginBottom: 14 }}>
            {errMsg}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            disabled={state === 'loading'}
            style={cs.btn('0.5px solid rgba(0,0,0,0.22)', '#1a1a1a')}
          >
            Batal
          </button>
          <button
            onClick={handleKirim}
            disabled={state === 'loading'}
            style={cs.btn('0.5px solid #85B7EB', '#185FA5')}
          >
            {state === 'loading'
              ? <><i className="ti ti-loader-2" /> Mengirim...</>
              : <><i className="ti ti-send" /> Kirim Ulang</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}
