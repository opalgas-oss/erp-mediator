'use client'

// app/dashboard/superadmin/tenants/[id]/dialog-kelola-akses-at.parts.tsx
// Sub-render DialogKelolaAksesAdminTenant: BodySuksesAtur, BodySuksesInactive, AreaChecklist
// (BodyLoading ada di DialogKelolaAksesAdminTenant.tsx — ringkas, tidak perlu file terpisah)

import { DB4, ALASAN_OPTIONS, type AreaAkses, type AlasanCabut } from './dialog-kelola-akses-at.constants'
import type { AdminTenantKartu } from '@/lib/types/admin-tenant.types'

// Shared: satu baris di detail preview
function PRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={DB4.previewRow}>
      <span style={{ color: '#6b7280', fontSize: 12 }}>{label}</span>
      <span>{children}</span>
    </div>
  )
}

// ─── BodySuksesAtur ───────────────────────────────────────────────────────────

interface SuksesAturProps {
  tenantNama: string
  at:         AdminTenantKartu
  areas:      AreaAkses[]
  onSelesai:  () => void
}

export function BodySuksesAtur({ tenantNama, at, areas, onSelesai }: SuksesAturProps) {
  const checkedAreas   = areas.filter(a => a.checked)
  const uncheckedAreas = areas.filter(a => !a.checked)

  return (
    <div style={DB4.overlay}>
      <div style={DB4.modal}>
        <div style={DB4.hdr}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 500 }}>Akses Diperbarui</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{tenantNama}</div>
          </div>
          <button onClick={onSelesai} style={DB4.btnSm('0.5px solid rgba(0,0,0,0.22)', '#1a1a1a')}>
            <i className="ti ti-x" />
          </button>
        </div>
        <div style={{ padding: '16px 20px' }}>
          <div style={{ textAlign: 'center', paddingBottom: 12 }}>
            <div style={DB4.suksesDot('#EAF3DE', '#3B6D11')}><i className="ti ti-checkbox" /></div>
            <h3 style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>Akses Area Berhasil Diperbarui</h3>
            <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>
              {at.user_name} masih aktif di <strong>{tenantNama}</strong>.<br />
              Akses area telah diperbarui sesuai perubahan yang disimpan.
            </p>
          </div>
          <div style={DB4.detail}>
            <PRow label="Admin"><span style={{ fontWeight: 500 }}>{at.user_name}</span></PRow>
            <PRow label="Status akun">
              <span style={DB4.chip('#EAF3DE', '#3B6D11', '#97C459')}>
                <i className="ti ti-circle-filled" style={{ fontSize: 7 }} /> Masih aktif
              </span>
            </PRow>
            <PRow label="Akses aktif"><span style={{ fontWeight: 500 }}>{checkedAreas.length} area/kategori</span></PRow>
            {uncheckedAreas.length > 0 && (
              <div style={{ ...DB4.previewRow, borderBottom: 'none' }}>
                <span style={{ color: '#6b7280', fontSize: 12 }}>Akses dicabut</span>
                <span style={{ fontWeight: 500, color: '#6b7280' }}>{uncheckedAreas.length} area/kategori</span>
              </div>
            )}
          </div>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 10, textAlign: 'center' }}>
            Riwayat perubahan dapat dilihat di tab AdminTenant → Riwayat AdminTenant.
          </div>
        </div>
        <div style={DB4.ftr}>
          <span />
          <button onClick={onSelesai} style={DB4.btn('0.5px solid #97C459', '#3B6D11')}>
            <i className="ti ti-check" /> Selesai
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── AreaChecklist ────────────────────────────────────────────────────────────

interface AreaChecklistProps {
  areas:      AreaAkses[]
  inactiveOn: boolean
  onToggle:   (id: string) => void
  atName:     string
}

export function AreaChecklist({ areas, inactiveOn, onToggle, atName }: AreaChecklistProps) {
  const byArea: Record<string, AreaAkses[]> = {}
  areas.forEach(a => {
    if (!byArea[a.area]) byArea[a.area] = []
    byArea[a.area].push(a)
  })

  return (
    <>
      <div style={{ ...DB4.secLbl, opacity: inactiveOn ? 0.45 : 1 }}>
        <div style={DB4.secIcon('#E6F1FB', '#185FA5')}><i className="ti ti-map-pin" /></div>
        Akses Area &amp; Kategori
        {inactiveOn && <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 4 }}>(dinonaktifkan semua otomatis)</span>}
      </div>
      {!inactiveOn && (
        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}>
          Status centang di bawah adalah setting aktif saat ini. Ubah sesuai kebutuhan.
        </div>
      )}
      {Object.entries(byArea).map(([areaName, items]) => (
        <div key={areaName}>
          <div style={{ ...DB4.grpLbl, opacity: inactiveOn ? 0.45 : 1 }}>
            <i className="ti ti-map-pin" style={{ fontSize: 12 }} /> Area {areaName}
          </div>
          {items.map(item => (
            <div key={item.id} style={DB4.areaItem(item.checked, inactiveOn)} onClick={() => onToggle(item.id)}>
              <div style={DB4.areaCb(item.checked)}>
                {item.checked && <i className="ti ti-check" style={{ fontSize: 10 }} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{item.kategori}</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{item.area}</div>
              </div>
              <span style={item.checked
                ? DB4.chip('#EAF3DE', '#3B6D11', '#97C459')
                : DB4.chip('#FAEEDA', '#854F0B', '#EF9F27')}>
                {item.checked ? 'Akses aktif' : 'Tidak ada akses'}
              </span>
            </div>
          ))}
        </div>
      ))}
      {!inactiveOn && (
        <div style={DB4.warnBox}>
          <i className="ti ti-alert-triangle" style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }} />
          <div>
            Perubahan akses hanya berlaku untuk <strong>{atName}</strong>.
            Admin lain di tenant ini tidak terpengaruh.
          </div>
        </div>
      )}
    </>
  )
}

// ─── BodySuksesInactive ───────────────────────────────────────────────────────

interface SuksesInactiveProps {
  tenantNama: string
  at:         AdminTenantKartu
  alasan:     AlasanCabut | ''
  onSelesai:  () => void
}

export function BodySuksesInactive({ tenantNama, at, alasan, onSelesai }: SuksesInactiveProps) {
  const alasanLabel = ALASAN_OPTIONS.find(o => o.value === alasan)?.label ?? alasan

  return (
    <div style={DB4.overlay}>
      <div style={DB4.modal}>
        <div style={DB4.hdr}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 500 }}>Admin Dinonaktifkan</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{tenantNama}</div>
          </div>
          <button onClick={onSelesai} style={DB4.btnSm('0.5px solid rgba(0,0,0,0.22)', '#1a1a1a')}>
            <i className="ti ti-x" />
          </button>
        </div>
        <div style={{ padding: '16px 20px' }}>
          <div style={{ textAlign: 'center', paddingBottom: 12 }}>
            <div style={DB4.suksesDot('#FCEBEB', '#A32D2D')}><i className="ti ti-user-off" /></div>
            <h3 style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>Admin Berhasil Dinonaktifkan</h3>
            <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>
              {at.user_name} tidak lagi dapat mengakses semua fitur <strong>{tenantNama}</strong>.
            </p>
          </div>
          <div style={DB4.detail}>
            <PRow label="Admin"><span style={{ fontWeight: 500 }}>{at.user_name}</span></PRow>
            <PRow label="Alasan"><span style={{ fontWeight: 500 }}>{alasanLabel}</span></PRow>
            <div style={{ ...DB4.previewRow, borderBottom: 'none' }}>
              <span style={{ color: '#6b7280', fontSize: 12 }}>Status akses</span>
              <span style={DB4.chip('#FCEBEB', '#A32D2D', '#F09595')}>
                <i className="ti ti-user-off" style={{ fontSize: 10 }} /> Nonaktif
              </span>
            </div>
          </div>
        </div>
        <div style={DB4.ftr}>
          <span />
          <button onClick={onSelesai} style={DB4.btn('0.5px solid #97C459', '#3B6D11')}>
            <i className="ti ti-check" /> Selesai
          </button>
        </div>
      </div>
    </div>
  )
}
