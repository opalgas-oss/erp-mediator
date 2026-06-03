'use client'
// app/dashboard/superadmin/providers/ButtonToggleAktifProvider.tsx
// Tombol Power per baris — merah (Nonaktifkan) atau hijau (Aktifkan Kembali).
// Dibuat: Sesi #249 — HUTANG-PROVIDER-INACTIVE
// Standar: STANDAR_UI_PENAMAAN_v1.md Bagian 2 + STANDAR_UI_UX_PLATFORM_v1.md Layer 2.1

interface Props {
  isAktif:   boolean
  loading:   boolean
  onClick:   () => void
}

export function ButtonToggleAktifProvider({ isAktif, loading, onClick }: Props) {
  const style = isAktif
    ? { bg: 'var(--color-danger-bg)',   text: 'var(--color-danger-text)',   border: 'var(--color-danger-border)',   title: 'Nonaktifkan provider' }
    : { bg: 'var(--color-success-bg)',  text: 'var(--color-success-text)',  border: 'var(--color-success-border)', title: 'Aktifkan kembali provider' }

  return (
    <button
      onClick={onClick}
      disabled={loading}
      title={style.title}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 30, height: 30, borderRadius: 8,
        borderWidth: '0.5px', borderStyle: 'solid',
        background: style.bg, color: style.text, borderColor: style.border,
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.6 : 1,
        fontFamily: 'inherit', flexShrink: 0,
      }}
    >
      <i className="ti ti-power" style={{ fontSize: 14 }} />
    </button>
  )
}
