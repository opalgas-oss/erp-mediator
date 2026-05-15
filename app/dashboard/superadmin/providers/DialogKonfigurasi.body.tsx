'use client'
// app/dashboard/superadmin/providers/DialogKonfigurasi.body.tsx
// Body + Footer visual untuk DialogKonfigurasiKoneksi — dipecah ATURAN 9
// Update S#152: hapus panduan prop (sekarang inline per-field di fields.tsx)
// Dibuat: Sesi #151

import { ICON_ACTION, ICON_STATUS } from '@/lib/constants/icons.constant'
import { Input }       from '@/components/ui/input'
import { HealthBadge } from '@/components/superadmin/HealthBadge'
import { CredentialFields, SaveButtonInfo, groupFields } from './DialogKonfigurasi.fields'
import type { ServiceProvider, ProviderFieldDef } from '@/lib/types/provider.types'

// ─── TAG_ST (duplikasi dari dialog — agar body bisa berdiri sendiri) ──────────
const TAG_ST: Record<string, { bg: string; text: string; border: string }> = {
  wajib:      { bg: '#FCEBEB', text: '#A32D2D', border: '#F09595' },
  disarankan: { bg: '#FAEEDA', text: '#854F0B', border: '#EF9F27' },
  opsional:   { bg: '#F1EFE8', text: '#5F5E5A', border: '#B4B2A9' },
}
const WARN: Record<string, string> = {
  cloudinary: 'Upload media tidak akan bisa bekerja sebelum Cloudinary dikonfigurasi.',
  xendit:     'Pembayaran tidak bisa diproses sebelum Xendit dikonfigurasi.',
  fonnte:     'Notifikasi WhatsApp tidak akan terkirim sebelum Fonnte dikonfigurasi.',
  smtp:       'Email notifikasi tidak aktif sebelum SMTP dikonfigurasi.',
  supabase:   'Database tidak bisa diakses — ini credential utama platform.',
}

// ─── DialogKonfigHeader ───────────────────────────────────────────────────────

interface HeaderProps { provider: ServiceProvider | null; isMon: boolean }

export function DialogKonfigHeader({ provider, isMon }: HeaderProps) {
  const tag = TAG_ST[provider?.tag ?? 'opsional']
  return (
    <div style={{ padding: '20px 24px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>{provider?.nama ?? '—'}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
            <span style={{ fontSize: 12, color: '#6b7280' }}>{provider?.kategori ?? ''}</span>
            {provider && (
              <span style={{ padding: '2px 10px', borderRadius: 100, fontSize: 11, fontWeight: 600, background: tag.bg, color: tag.text, border: `0.5px solid ${tag.border}` }}>
                {isMon ? 'MONITORING' : provider.tag.toUpperCase()}
              </span>
            )}
          </div>
        </div>
        {provider && <HealthBadge status={provider.health_overall} size="sm" />}
      </div>
    </div>
  )
}

// ─── DialogKonfigBody ─────────────────────────────────────────────────────────

interface BodyProps {
  provider:   ServiceProvider | null
  isQS:       boolean; isMon: boolean
  ns:         string; onNs: (v: string) => void
  fds:        ProviderFieldDef[]
  cred:       Record<string, string>; show: Record<string, boolean>
  onChange:   (id: string, v: string) => void
  onToggle:   (id: string) => void
  // panduan DIHAPUS S#152 — sekarang inline per-field di CredentialFields
  res:        { berhasil: boolean; pesan: string | null; latency_ms: number | null } | null
}

export function DialogKonfigBody({ provider, isQS, isMon, ns, onNs, fds, cred, show, onChange, onToggle, res }: BodyProps) {
  const warn  = provider ? (WARN[provider.kode] ?? '') : ''
  const rows  = groupFields(fds)

  return (
    <div style={{ padding: '20px 24px', maxHeight: '65vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Info/warning box */}
      {isQS ? (
        <div style={{ background: '#FEF3C7', border: '0.5px solid #FCD34D', borderRadius: 8, padding: '12px 14px', fontSize: 13, color: '#92400E' }}>
          <strong>Token QStash dikonfigurasi via Vercel Environment Variables.</strong><br />
          Tambahkan <code style={{ fontSize: 12 }}>QSTASH_TOKEN</code> dan <code style={{ fontSize: 12 }}>QSTASH_CURRENT_SIGNING_KEY</code> di Vercel Dashboard → Settings → Environment Variables.
        </div>
      ) : isMon ? (
        <div style={{ background: '#E6F1FB', border: '0.5px solid #85B7EB', borderRadius: 8, padding: '12px 14px', fontSize: 13, color: '#185FA5' }}>
          <strong>Credential ini dipakai sistem monitoring otomatis.</strong><br />
          Setelah disimpan, sistem membaca metrics setiap 1–15 menit di background.
        </div>
      ) : warn ? (
        <div style={{ background: '#FAEEDA', border: '0.5px solid #EF9F27', borderRadius: 8, padding: '12px 14px', fontSize: 13, color: '#854F0B' }}>
          <strong>{warn}</strong><br />Isi form di bawah untuk mengaktifkannya.
        </div>
      ) : null}

      {/* Form */}
      {!isQS && (
        <>
          {/* Instance Baru */}
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Instance Baru</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label htmlFor="ns" style={{ fontSize: 12, fontWeight: 500, color: '#1a1a1a' }}>Nama Instance <span style={{ color: '#A32D2D' }}>*</span></label>
              <Input id="ns" placeholder={`${provider?.nama ?? 'Provider'} Production`} value={ns} onChange={e => onNs(e.target.value)} style={{ height: 40, fontSize: 13 }} />
            </div>
          </div>

          {/* Credential fields — panduan kini inline per-field di dalam CredentialFields */}
          {rows.length > 0 && (
            <CredentialFields
              fieldRows={rows}
              formCred={cred}
              showFields={show}
              onChange={onChange}
              onToggle={onToggle}
            />
          )}

          {/* Test result */}
          {res && (
            <div style={{ borderRadius: 8, border: '0.5px solid', padding: '12px 14px', background: res.berhasil ? '#EAF3DE' : '#FCEBEB', borderColor: res.berhasil ? '#97C459' : '#F09595' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: res.berhasil ? '#3B6D11' : '#A32D2D' }}>
                {res.berhasil ? <ICON_STATUS.success size={15} /> : <ICON_STATUS.failed size={15} />}
                {res.berhasil ? `Koneksi berhasil${res.latency_ms ? ` (${res.latency_ms}ms)` : ''}` : 'Koneksi gagal'}
              </div>
              {res.pesan && <p style={{ fontSize: 12, color: '#6b7280', marginTop: 5 }}>{res.pesan}</p>}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── DialogKonfigFooter ───────────────────────────────────────────────────────

interface FooterProps {
  isQS:    boolean; saving: boolean
  link:    string | null
  providerNama: string
  onSave:  () => void
  onClose: () => void
}

export function DialogKonfigFooter({ isQS, saving, link, providerNama, onSave, onClose }: FooterProps) {
  return (
    <div style={{ padding: '14px 24px', borderTop: '0.5px solid rgba(0,0,0,0.08)', background: '#f9f9f8', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {!isQS && <SaveButtonInfo />}
      <div style={{ display: 'flex', gap: 10 }}>
        {link && !isQS && (
          <a href={link} target="_blank" rel="noopener noreferrer"
            style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, border: '0.5px solid rgba(0,0,0,0.22)', background: '#fff', color: '#1a1a1a', textDecoration: 'none', cursor: 'pointer' }}
          >
            <ICON_ACTION.show size={13} /> Buka {providerNama} Dashboard
          </a>
        )}
        {isQS ? (
          <button onClick={onClose} style={{ padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 500, border: '0.5px solid rgba(0,0,0,0.22)', background: '#fff', color: '#1a1a1a', cursor: 'pointer' }}>
            Tutup
          </button>
        ) : (
          <button onClick={onSave} disabled={saving}
            style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none', background: saving ? '#93c5fd' : '#1a1a1a', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer' }}
          >
            {saving
              ? <><ICON_STATUS.loading size={14} style={{ animation: 'spin 1s linear infinite' }} /> Menyimpan & Testing...</>
              : <><ICON_ACTION.save size={14} /> Simpan &amp; Test Koneksi</>
            }
          </button>
        )}
      </div>
    </div>
  )
}
