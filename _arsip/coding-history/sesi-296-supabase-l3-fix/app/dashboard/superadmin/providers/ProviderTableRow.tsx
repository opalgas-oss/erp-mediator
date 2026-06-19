'use client'
// app/dashboard/superadmin/providers/ProviderTableRow.tsx
// Satu baris tabel provider — dipecah dari ProvidersClient.tsx S#151 (ATURAN 9)
// Dibuat: Sesi #151
// Update: Sesi #249 — HUTANG-PROVIDER-INACTIVE:
//   - Tambah badge NONAKTIF + opacity redup untuk provider nonaktif
//   - Tambah tombol ButtonToggleAktifProvider (power merah/hijau)
//   - Tombol Setup/Kelola disabled saat provider nonaktif
//   - Fix #9ca3af → var(--color-text-secondary) [STANDAR INKONSISTENSI 2]
//   - Fix border baris 0.07 → 0.08 [STANDAR INKONSISTENSI 3]
//   - Hapus kolom Instance + Terakhir Dites [sesuai STANDAR_UI_PENAMAAN Bagian 3]
// Update: S#288 — tambah kolom Use Case (chip warna dari resolveUseCaseStyle)

import { HealthBadge }                  from '@/components/superadmin/HealthBadge'
import { ButtonToggleAktifProvider }    from './ButtonToggleAktifProvider'
import { resolveUseCaseStyle }          from '@/lib/constants/ui-tokens.constant'
import type { ServiceProvider }         from '@/lib/types/provider.types'

const TAG_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  wajib:            { bg: 'var(--color-danger-bg)',   text: 'var(--color-danger-text)',   border: 'var(--color-danger-border)'   },
  disarankan:       { bg: 'var(--color-warning-bg)',  text: 'var(--color-warning-text)',  border: 'var(--color-warning-border)'  },
  opsional:         { bg: 'var(--color-neutral-bg)',  text: 'var(--color-neutral-text)',  border: 'var(--color-neutral-border)'  },
  belum_dibutuhkan: { bg: 'var(--color-neutral-bg)',  text: 'var(--color-neutral-text)',  border: 'var(--color-neutral-border)'  },
}

const KATEGORI_LABEL: Record<string, string> = {
  database:'Database', cache:'Cache', media:'Media & Storage',
  payment:'Payment Gateway', messaging:'Notifikasi WA', email:'Email',
  search:'Pencarian', cdn:'CDN & WAF', management:'API Management', queue:'Cron Scheduler',
}

interface Props {
  provider:   ServiceProvider
  onOpen:     (p: ServiceProvider) => void
  onToggle:   (p: ServiceProvider) => void
  toggling:   boolean
}

export function ProviderTableRow({ provider: p, onOpen, onToggle, toggling }: Props) {
  const isConfigured = p.health_overall !== 'belum_dites'
  const isEnv        = p.kode === 'qstash'
  const isNonaktif   = !p.is_aktif
  const tagSt        = TAG_STYLE[p.tag] ?? TAG_STYLE.opsional

  return (
    <tr
      style={{
        borderTop: '0.5px solid rgba(0,0,0,0.08)',
        cursor: isNonaktif ? 'default' : 'pointer',
        opacity: isNonaktif ? 0.75 : 1,
      }}
      onClick={() => !isNonaktif && onOpen(p)}
      onMouseEnter={e => { if (!isNonaktif) e.currentTarget.style.background = '#f9f9f8' }}
      onMouseLeave={e => (e.currentTarget.style.background = '')}
    >
      {/* Kolom 1: Provider + badge NONAKTIF */}
      <td style={{ padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>{p.nama}</span>
          {isNonaktif && (
            <span style={{
              fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 100,
              background: '#1a1a1a', color: '#fff', letterSpacing: '0.03em',
              flexShrink: 0,
            }}>
              NONAKTIF
            </span>
          )}
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 2 }}>
          {p.deskripsi ?? KATEGORI_LABEL[p.kategori]}
        </div>
      </td>

      {/* Kolom 2: Prioritas */}
      <td style={{ padding: '12px 14px' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', padding: '2px 8px',
          borderRadius: 100, fontSize: 10, fontWeight: 500,
          background: tagSt.bg, color: tagSt.text, border: `0.5px solid ${tagSt.border}`,
        }}>
          {isEnv ? 'via .env' : p.tag === 'belum_dibutuhkan' ? 'BELUM DIBUTUHKAN' : p.tag.toUpperCase()}
        </span>
      </td>

      {/* Kolom 3: Status */}
      <td style={{ padding: '12px 14px' }}>
        {isNonaktif
          ? (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '3px 8px', borderRadius: 100, fontSize: 11, fontWeight: 500,
              background: 'var(--color-neutral-bg)', color: 'var(--color-neutral-text)',
              border: '0.5px solid var(--color-neutral-border)',
            }}>
              Nonaktif
            </span>
          )
          : <HealthBadge status={p.health_overall} size="sm" />
        }
      </td>

      {/* Kolom 4: Use Case */}
      <td style={{ padding: '12px 14px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {(p.use_cases ?? []).length === 0
            ? <span style={{ fontSize: 11, color: '#9ca3af' }}>—</span>
            : (p.use_cases ?? []).map(uc => {
                const s = resolveUseCaseStyle(uc)
                return (
                  <span key={uc} style={{
                    fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 100,
                    background: s.bg, color: s.color, border: `0.5px solid ${s.border}`,
                    whiteSpace: 'nowrap',
                  }}>
                    {s.label}
                  </span>
                )
              })
          }
        </div>
      </td>

      {/* Kolom 5: Aksi — Setup/Kelola + Power */}
      <td style={{ padding: '12px 14px', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={() => !isNonaktif && onOpen(p)}
            disabled={isNonaktif}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '5px 12px', borderRadius: 8, fontSize: 12,
              cursor: isNonaktif ? 'not-allowed' : 'pointer',
              borderWidth: '0.5px', borderStyle: 'solid', fontFamily: 'inherit',
              opacity: isNonaktif ? 0.5 : 1,
              background: isNonaktif ? '#f3f4f6' : (isConfigured ? '#fff' : 'var(--color-info-bg)'),
              color:      isNonaktif ? '#9ca3af'  : (isConfigured ? '#1a1a1a' : 'var(--color-info-text)'),
              borderColor: isNonaktif ? 'rgba(0,0,0,0.12)' : (isConfigured ? 'rgba(0,0,0,0.22)' : 'var(--color-info-border)'),
            }}
          >
            {isConfigured ? '⚙ Kelola' : '+ Setup'}
          </button>
          <ButtonToggleAktifProvider
            isAktif={p.is_aktif}
            loading={toggling}
            onClick={() => onToggle(p)}
          />
        </div>
      </td>
    </tr>
  )
}
