'use client'

// app/dashboard/superadmin/tenants/[id]/tab-kategori.status.tsx
// Konstanta status assignment + komponen StatusBadge untuk TabKategori
//
// Dibuat: Sesi #325 — Pecah TabKategori.tsx (22 KB → 3 file)
// Dipakai oleh: TabKategori.tsx

// ─── Konstanta status assignment ─────────────────────────────────────────────

export const ASSIGNMENT_STATUS_STYLE: Record<string, {
  bg: string; text: string; border: string; icon: string; label: string
}> = {
  active:           { bg: '#EAF3DE', text: '#3B6D11', border: '#97C459', icon: 'ti-circle-check',    label: 'Aktif' },
  suspended:        { bg: '#FAEEDA', text: '#854F0B', border: '#EF9F27', icon: 'ti-player-pause',    label: 'Ditangguhkan' },
  revoked:          { bg: '#FCEBEB', text: '#A32D2D', border: '#F09595', icon: 'ti-x',               label: 'Dicabut' },
  pending_handover: { bg: '#FAEEDA', text: '#854F0B', border: '#EF9F27', icon: 'ti-arrows-exchange', label: 'Proses Serah Terima' },
}

// ─── Badge status assignment ──────────────────────────────────────────────────

export function StatusBadge({ status }: { status: string }) {
  const st = ASSIGNMENT_STATUS_STYLE[status] ?? ASSIGNMENT_STATUS_STYLE.active
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px',
      borderRadius: 100, fontSize: 11, fontWeight: 500,
      background: st.bg, color: st.text,
      borderWidth: '0.5px', borderStyle: 'solid', borderColor: st.border,
    }}>
      <i className={`ti ${st.icon}`} style={{ fontSize: 11 }} />
      {st.label}
    </span>
  )
}
