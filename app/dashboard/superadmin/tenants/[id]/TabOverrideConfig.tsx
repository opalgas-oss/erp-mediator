'use client'

// app/dashboard/superadmin/tenants/[id]/TabOverrideConfig.tsx
// Tab Override Config — placeholder
// CATATAN: Implementasi penuh terintegrasi dengan M1 ConfigService — Mockup_08.
// Sesi #141: placeholder dengan style konsisten dengan mockup design token.
//
// Dibuat: Sesi #132 — M6 FASE 3 Step 3.7
// Diupdate: Sesi #141 — style konsistensi mockup

interface Props { tenantId: string }

const S = {
  card: { background: '#fff', borderWidth: '0.5px', borderStyle: 'solid' as const, borderColor: 'rgba(0,0,0,0.12)', borderRadius: 12 } as React.CSSProperties,
}

export function TabOverrideConfig({ tenantId: _tenantId }: Props) {
  return (
    <div>

      {/* Card penjelasan */}
      <div style={{ ...S.card, padding: 18, marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: '#FAEEDA', color: '#854F0B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
            <i className="ti ti-adjustments" />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a', marginBottom: 6 }}>
              Override Konfigurasi Tenant
            </div>
            <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>
              SuperAdmin dapat memberi izin tenant untuk meng-override nilai konfigurasi
              platform tertentu (misal: pengaturan OTP, pengaturan pembayaran, retensi data, dll).
              Setiap kunci konfigurasi memiliki status <strong style={{ color: '#1a1a1a' }}>INHERITED</strong>,
              <strong style={{ color: '#1a1a1a' }}> OVERRIDDEN</strong>, atau
              <strong style={{ color: '#1a1a1a' }}> LOCKED</strong>.
            </div>
          </div>
        </div>
      </div>

      {/* Info status badges (preview) */}
      <div style={{ ...S.card, padding: 14, marginBottom: '1rem' }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 10 }}>
          Jenis status konfigurasi:
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {[
            { label: 'INHERITED',  desc: 'Ikut nilai platform default', bg: '#f9f9f8', text: '#5F5E5A', border: '#B4B2A9', icon: 'ti-arrows-down-up' },
            { label: 'OVERRIDDEN', desc: 'Tenant pakai nilai sendiri',   bg: '#EEEDFE', text: '#534AB7', border: '#AFA9EC', icon: 'ti-edit' },
            { label: 'LOCKED',     desc: 'Terkunci, tidak bisa diubah', bg: '#FCEBEB', text: '#A32D2D', border: '#F09595', icon: 'ti-lock' },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, background: '#f9f9f8' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '2px 8px', borderRadius: 100, fontSize: 11, fontWeight: 500,
                background: item.bg, color: item.text,
                borderWidth: '0.5px', borderStyle: 'solid', borderColor: item.border,
              }}>
                <i className={`ti ${item.icon}`} style={{ fontSize: 11 }} />
                {item.label}
              </span>
              <span style={{ fontSize: 11, color: '#6b7280' }}>{item.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Placeholder */}
      <div style={{
        background: '#fff',
        borderWidth: '0.5px', borderStyle: 'dashed', borderColor: 'rgba(0,0,0,0.22)',
        borderRadius: 12,
        padding: 32,
        textAlign: 'center',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#f9f9f8', color: '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
            <i className="ti ti-settings" />
          </div>
        </div>
        <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a', marginBottom: 6 }}>
          Fitur Override Config
        </div>
        <div style={{ fontSize: 12, color: '#6b7280', maxWidth: 460, margin: '0 auto', lineHeight: 1.5 }}>
          Grid konfigurasi per kunci dengan status INHERITED/OVERRIDDEN/LOCKED dan kemampuan ubah
          per tenant akan tersedia setelah integrasi penuh dengan M1 Config Registry selesai.
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: '#6b7280' }}>
          Saat ini semua konfigurasi tenant ini menggunakan nilai platform default
          (<strong style={{ color: '#5F5E5A' }}>INHERITED</strong>).
        </div>
        <div style={{ marginTop: 14, fontSize: 11, color: '#9ca3af', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <i className="ti ti-info-circle" />
          Referensi Mockup_08_Tab_Override_Config
        </div>
      </div>
    </div>
  )
}
