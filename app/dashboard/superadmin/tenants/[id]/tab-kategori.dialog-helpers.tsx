'use client'

// app/dashboard/superadmin/tenants/[id]/tab-kategori.dialog-helpers.tsx
// Komponen helper shared untuk semua dialog kebab TabKategori:
//   DialogOverlay, DialogCard, DialogHeader, DialogFooter, BtnBatal
//   BaseDialogProps (tipe shared)
//
// Dibuat: Sesi #325 — Pecah tab-kategori.dialogs.tsx (30 KB → 5 file)
// Dipakai oleh: tab-kategori.dialog-override.tsx, tab-kategori.dialog-riwayat.tsx,
//               tab-kategori.dialog-hentikan.tsx, tab-kategori.dialog-lepas.tsx

import type { AssignmentDenganKategori } from '@/lib/types/tenant-category-assignment.types'

// ─── Tipe props shared ────────────────────────────────────────────────────────

export interface BaseDialogProps {
  tenantId:   string
  assignment: AssignmentDenganKategori | null
  open:       boolean
  onClose:    () => void
  onSuccess:  () => void
}

// ─── Overlay wrapper ──────────────────────────────────────────────────────────

export function DialogOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      {children}
    </div>
  )
}

// ─── Dialog card ─────────────────────────────────────────────────────────────

export function DialogCard({ children, maxWidth = 480 }: { children: React.ReactNode; maxWidth?: number }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth, maxHeight: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
      {children}
    </div>
  )
}

// ─── Dialog header ────────────────────────────────────────────────────────────

export function DialogHeader({ title, subtitle, onClose }: { title: string; subtitle?: string; onClose: () => void }) {
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

// ─── Dialog footer ────────────────────────────────────────────────────────────

export function DialogFooter({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, padding: '12px 16px', borderTopWidth: '0.5px', borderTopStyle: 'solid', borderTopColor: 'rgba(0,0,0,0.12)', flexShrink: 0 }}>
      {children}
    </div>
  )
}

// ─── Tombol batal ─────────────────────────────────────────────────────────────

export function BtnBatal({ onClose, disabled }: { onClose: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClose} disabled={disabled}
      style={{ padding: '6px 14px', borderWidth: '0.5px', borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.22)', borderRadius: 8, fontSize: 13, cursor: 'pointer', background: '#fff', color: '#1a1a1a' }}>
      Batal
    </button>
  )
}
