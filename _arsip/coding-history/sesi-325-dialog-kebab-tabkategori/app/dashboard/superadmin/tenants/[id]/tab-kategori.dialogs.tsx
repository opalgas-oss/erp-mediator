'use client'

// app/dashboard/superadmin/tenants/[id]/tab-kategori.dialogs.tsx
// 4 dialog kebab untuk TabKategori:
//   DialogEditOverrideKomisi  — PATCH action=update-override
//   DialogRiwayatAssignment   — timeline readonly dari data assignment
//   DialogHentikanKategori    — PATCH action=suspend / aktifkan-kembali
//   DialogLepasKategori       — DELETE 2-step (alasan + konfirmasi nama)
//
// Dibuat: Sesi #325 — Pecah TabKategori.tsx (22 KB → 3 file)
// Dipakai oleh: TabKategori.tsx
// ARSIP SESI #325 — sebelum dipecah lebih lanjut menjadi 5 file per dialog

import { useState }  from 'react'
import { toast }     from 'sonner'
import type { AssignmentDenganKategori } from '@/lib/types/tenant-category-assignment.types'
import { formatDateIdShort }             from '@/lib/utils-client'

interface BaseDialogProps {
  tenantId:     string
  assignment:   AssignmentDenganKategori | null
  open:         boolean
  onClose:      () => void
  onSuccess:    () => void
}

function DialogOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      {children}
    </div>
  )
}

function DialogCard({ children, maxWidth = 480 }: { children: React.ReactNode; maxWidth?: number }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth, maxHeight: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
      {children}
    </div>
  )
}

function DialogHeader({ title, subtitle, onClose }: { title: string; subtitle?: string; onClose: () => void }) {
  return (
    <div style={{ padding: '14px 16px', borderBottomWidth: '0.5px', borderBottomStyle: 'solid', borderBottomColor: 'rgba(0,0,0,0.12)', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>{title}</div>
          {subtitle && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{subtitle}</div>}
        </div>
        <button onClick={onClose} style={{ padding: '4px 8px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 18 }}>
          <i className="ti ti-x" />
        </button>
      </div>
    </div>
  )
}

function DialogFooter({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, padding: '12px 16px', borderTopWidth: '0.5px', borderTopStyle: 'solid', borderTopColor: 'rgba(0,0,0,0.12)', flexShrink: 0 }}>
      {children}
    </div>
  )
}

function BtnBatal({ onClose, disabled }: { onClose: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClose} disabled={disabled}
      style={{ padding: '6px 14px', borderWidth: '0.5px', borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.22)', borderRadius: 8, fontSize: 13, cursor: 'pointer', background: '#fff', color: '#1a1a1a' }}>
      Batal
    </button>
  )
}

export function DialogEditOverrideKomisi({ tenantId, assignment, open, onClose, onSuccess }: BaseDialogProps) {
  const [komisi, setKomisi] = useState('')
  const [sla, setSla] = useState('')
  const [submitting, setSubmitting] = useState(false)
  if (!open || !assignment) return null
  const handleSubmit = async () => {
    const komisiNum = parseFloat(komisi)
    if (isNaN(komisiNum) || komisiNum < 0 || komisiNum > 100) { toast.error('Komisi harus angka antara 0 sampai 100'); return }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/superadmin/tenants/${tenantId}/categories/${assignment.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update-override', commission_override: komisiNum / 100, sla_minutes: sla ? parseInt(sla, 10) : null }) })
      const json = await res.json()
      if (json.success) { toast.success('Override komisi berhasil disimpan'); onSuccess(); onClose() } else { toast.error(json.message ?? 'Gagal menyimpan override komisi') }
    } catch { toast.error('Terjadi kesalahan jaringan') } finally { setSubmitting(false) }
  }
  return (<DialogOverlay onClose={onClose}><DialogCard><DialogHeader title="Edit Override Komisi" subtitle={`Kategori: ${assignment.kategori.display_name}`} onClose={onClose} /><div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>{assignment.rate_kontrak && (<div style={{ fontSize: 12, color: '#6b7280', background: '#f9f9f8', borderWidth: '0.5px', borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.12)', borderRadius: 8, padding: '8px 12px', marginBottom: 14 }}><i className="ti ti-info-circle" style={{ marginRight: 5 }} />Rate kontrak tenant: <strong>{assignment.rate_kontrak}%</strong>.</div>)}<div style={{ marginBottom: 14 }}><label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5 }}>Komisi override (%) <span style={{ color: '#ef4444' }}>*</span></label><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><input type="number" min="0" max="100" step="0.1" value={komisi} onChange={e => setKomisi(e.target.value)} placeholder="Contoh: 8.5" style={{ width: 140, padding: '7px 10px', borderWidth: '0.5px', borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.18)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }} /><span style={{ fontSize: 12, color: '#6b7280' }}>% (0–100)</span></div></div><div><label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5 }}>SLA respon (menit) — opsional</label><input type="number" min="1" value={sla} onChange={e => setSla(e.target.value)} placeholder="Contoh: 60" style={{ width: 140, padding: '7px 10px', borderWidth: '0.5px', borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.18)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }} /></div></div><DialogFooter><BtnBatal onClose={onClose} disabled={submitting} /><button onClick={handleSubmit} disabled={submitting || !komisi} style={{ padding: '6px 18px', borderWidth: '0.5px', borderStyle: 'solid', fontSize: 13, borderRadius: 8, fontWeight: 500, borderColor: submitting || !komisi ? 'rgba(0,0,0,0.12)' : '#85B7EB', background: submitting || !komisi ? '#f3f4f6' : '#E6F1FB', color: submitting || !komisi ? '#9ca3af' : '#185FA5', cursor: submitting || !komisi ? 'not-allowed' : 'pointer' }}>{submitting ? 'Menyimpan…' : 'Simpan Override'}</button></DialogFooter></DialogCard></DialogOverlay>)
}

export function DialogRiwayatAssignment({ assignment, open, onClose }: Omit<BaseDialogProps, 'tenantId' | 'onSuccess'>) {
  if (!open || !assignment) return null
  const events: { tanggal: string; label: string; icon: string; color: string }[] = []
  if (assignment.assigned_at) events.push({ tanggal: assignment.assigned_at, label: 'Kategori ditugaskan', icon: 'ti-circle-check', color: '#3B6D11' })
  if (assignment.suspended_at) events.push({ tanggal: assignment.suspended_at, label: `Ditangguhkan${assignment.suspend_reason ? ` — ${assignment.suspend_reason}` : ''}`, icon: 'ti-player-pause', color: '#854F0B' })
  if (assignment.deleted_at) events.push({ tanggal: assignment.deleted_at, label: `Dicabut${assignment.revoke_reason ? ` — ${assignment.revoke_reason}` : ''}`, icon: 'ti-x', color: '#A32D2D' })
  events.sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime())
  return (<DialogOverlay onClose={onClose}><DialogCard><DialogHeader title="Riwayat Assignment" subtitle={`Kategori: ${assignment.kategori.display_name}`} onClose={onClose} /><div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>{events.map((ev, idx) => (<div key={idx} style={{ display: 'flex', gap: 14, marginBottom: 20 }}><div style={{ width: 30, height: 30, borderRadius: '50%', background: '#f9f9f8', borderWidth: '0.5px', borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><i className={`ti ${ev.icon}`} style={{ fontSize: 13, color: ev.color }} /></div><div style={{ paddingTop: 4 }}><div style={{ fontSize: 13, color: '#1a1a1a', fontWeight: 500 }}>{ev.label}</div><div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{formatDateIdShort(ev.tanggal)}</div></div></div>))}</div><DialogFooter><button onClick={onClose} style={{ padding: '6px 18px', borderWidth: '0.5px', borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.22)', borderRadius: 8, fontSize: 13, cursor: 'pointer', background: '#fff', color: '#1a1a1a' }}>Tutup</button></DialogFooter></DialogCard></DialogOverlay>)
}

export function DialogHentikanKategori({ tenantId, assignment, open, onClose, onSuccess }: BaseDialogProps) {
  const [alasan, setAlasan] = useState('')
  const [submitting, setSubmitting] = useState(false)
  if (!open || !assignment) return null
  const isSuspended = assignment.status === 'suspended'
  const handleSuspend = async () => {
    if (!alasan.trim()) { toast.error('Alasan wajib diisi'); return }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/superadmin/tenants/${tenantId}/categories/${assignment.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'suspend', suspend_reason: alasan.trim() }) })
      const json = await res.json()
      if (json.success) { toast.success('Kategori berhasil dihentikan sementara'); onSuccess(); onClose() } else { toast.error(json.message ?? 'Gagal') }
    } catch { toast.error('Terjadi kesalahan jaringan') } finally { setSubmitting(false) }
  }
  const handleAktifkan = async () => {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/superadmin/tenants/${tenantId}/categories/${assignment.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'aktifkan-kembali' }) })
      const json = await res.json()
      if (json.success) { toast.success('Kategori berhasil diaktifkan kembali'); onSuccess(); onClose() } else { toast.error(json.message ?? 'Gagal') }
    } catch { toast.error('Terjadi kesalahan jaringan') } finally { setSubmitting(false) }
  }
  return null // placeholder arsip — lihat versi aktif di file per-dialog
}

export function DialogLepasKategori({ tenantId, assignment, open, onClose, onSuccess }: BaseDialogProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [alasan, setAlasan] = useState('')
  const [konfirmasi, setKonfirmasi] = useState('')
  const [submitting, setSubmitting] = useState(false)
  if (!open || !assignment) return null
  return null // placeholder arsip — lihat versi aktif di file per-dialog
}
