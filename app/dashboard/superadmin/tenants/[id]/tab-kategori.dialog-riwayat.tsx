'use client'

// app/dashboard/superadmin/tenants/[id]/tab-kategori.dialog-riwayat.tsx
// DialogRiwayatAssignment — timeline readonly dari field assignment
//
// Dibuat: Sesi #325 — Pecah tab-kategori.dialogs.tsx (30 KB → 5 file)
// Dipakai oleh: tab-kategori.dialogs.tsx (re-export), TabKategori.tsx

import {
  DialogOverlay, DialogCard, DialogHeader, DialogFooter,
  type BaseDialogProps,
} from './tab-kategori.dialog-helpers'
import { formatDateIdShort } from '@/lib/utils-client'

// ─── Dialog Riwayat Assignment ────────────────────────────────────────────────

export function DialogRiwayatAssignment({
  assignment, open, onClose,
}: Omit<BaseDialogProps, 'tenantId' | 'onSuccess'>) {
  if (!open || !assignment) return null

  // Susun timeline dari field yang ada
  const events: { tanggal: string; label: string; icon: string; color: string }[] = []
  if (assignment.assigned_at)  events.push({ tanggal: assignment.assigned_at,  label: 'Kategori ditugaskan', icon: 'ti-circle-check', color: '#3B6D11' })
  if (assignment.suspended_at) events.push({ tanggal: assignment.suspended_at, label: `Ditangguhkan${assignment.suspend_reason ? ` — ${assignment.suspend_reason}` : ''}`, icon: 'ti-player-pause', color: '#854F0B' })
  if (assignment.deleted_at)   events.push({ tanggal: assignment.deleted_at,   label: `Dicabut${assignment.revoke_reason ? ` — ${assignment.revoke_reason}` : ''}`, icon: 'ti-x', color: '#A32D2D' })
  events.sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime())

  return (
    <DialogOverlay onClose={onClose}>
      <DialogCard>
        <DialogHeader
          title="Riwayat Assignment"
          subtitle={`Kategori: ${assignment.kategori.display_name}`}
          onClose={onClose}
        />

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {events.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af', fontSize: 13 }}>
              <i className="ti ti-history" style={{ fontSize: 28, display: 'block', marginBottom: 8 }} />
              Belum ada riwayat tersedia
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: 15, top: 0, bottom: 0, width: 1, background: 'rgba(0,0,0,0.1)' }} />
              {events.map((ev, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 14, marginBottom: idx < events.length - 1 ? 20 : 0, position: 'relative' }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#f9f9f8', borderWidth: '0.5px', borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1 }}>
                    <i className={`ti ${ev.icon}`} style={{ fontSize: 13, color: ev.color }} />
                  </div>
                  <div style={{ paddingTop: 4 }}>
                    <div style={{ fontSize: 13, color: '#1a1a1a', fontWeight: 500 }}>{ev.label}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{formatDateIdShort(ev.tanggal)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Info override komisi jika ada */}
          {assignment.commission_override && (
            <div style={{ marginTop: 16, padding: '10px 12px', background: '#EEEDFE', borderWidth: '0.5px', borderStyle: 'solid', borderColor: '#AFA9EC', borderRadius: 8, fontSize: 12, color: '#534AB7' }}>
              <i className="ti ti-percentage" style={{ marginRight: 5 }} />
              Override komisi aktif: <strong>{assignment.commission_override}%</strong>
              {assignment.sla_minutes ? ` · SLA ${assignment.sla_minutes} menit` : ''}
            </div>
          )}
        </div>

        <DialogFooter>
          <button onClick={onClose}
            style={{ padding: '6px 18px', borderWidth: '0.5px', borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.22)', borderRadius: 8, fontSize: 13, cursor: 'pointer', background: '#fff', color: '#1a1a1a' }}>
            Tutup
          </button>
        </DialogFooter>
      </DialogCard>
    </DialogOverlay>
  )
}
