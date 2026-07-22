'use client'

// app/dashboard/superadmin/tenants/[id]/TenantDetailClient.tsx
// Orchestrator Detail Tenant — TenantDetailHeader persisten + 7 tab
//
// Dibuat: Sesi #132 — M6 FASE 3 Step 3.7
// Diupdate: Sesi #141 — M6 Fix Fase A (G14)
// Diupdate: Sesi #303 — UNIFIKASI STATUS: hanya active / non_active
//   - DialogNonaktifkan: konfirmasi 2-langkah saat nonaktifkan tenant
//   - DialogAktifkanKembali: tampil info riwayat Non-Active + pilihan Pending / Aktifkan

import { useState, useEffect } from 'react'
import { toast }       from 'sonner'
import { TenantDetailHeader, type TenantTabId } from '@/components/superadmin/tenants/TenantDetailHeader'
import { TabInfoUmum }           from './TabInfoUmum'
import { TabKontrakSewa }        from './TabKontrakSewa'
import { TabKategori }           from './TabKategori'
import { TabAdminTenantHistory } from './TabAdminTenantHistory'
import { TabUserTenant }         from './TabUserTenant'
import { TabOverrideConfig }     from './TabOverrideConfig'
import { TabAksesMenuAT }        from './TabAksesMenuAT'
import type { Tenant } from '@/lib/types/tenant.types'

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props { tenant: Tenant }

// ─── Tipe dialog ──────────────────────────────────────────────────────────────

type DialogMode = 'nonaktifkan' | 'aktifkan_kembali' | null

// ─── Dialog Nonaktifkan Tenant ───────────────────────────────────────────────
// Konfirmasi 2-langkah: baca konsekuensi → ketik nama tenant

function DialogNonaktifkan({
  tenantNama,
  onClose,
  onConfirm,
  saving,
}: {
  tenantNama: string
  onClose:    () => void
  onConfirm:  (alasan: string, konfirmasiNama: string) => void
  saving:     boolean
}) {
  const [step,           setStep]           = useState<1 | 2>(1)
  const [alasan,         setAlasan]         = useState('')
  const [konfirmasiNama, setKonfirmasiNama] = useState('')

  useEffect(() => { setStep(1); setAlasan(''); setKonfirmasiNama('') }, [])

  const namaMatch = konfirmasiNama.trim().toLowerCase() === tenantNama.trim().toLowerCase()
  const bisaConfirm = step === 2 && namaMatch

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 14, width: 480, maxWidth: '90vw', border: '1.5px solid #F09595', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '0.5px solid rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a' }}>Nonaktifkan Tenant</div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 18, color: '#6b7280', padding: '2px 6px' }}>x</button>
        </div>

        <div style={{ padding: '16px 20px' }}>
          {step === 1 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 8 }}>Langkah 1 — Baca konsekuensi:</div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: '#1a1a1a', lineHeight: 1.7 }}>
                <li>AdminTenant tidak bisa login ke dashboard tenant ini.</li>
                <li>Semua operasi bisnis tenant dihentikan.</li>
                <li>Data dan konfigurasi tetap tersimpan.</li>
                <li>Tenant bisa diaktifkan kembali kapan saja.</li>
              </ul>
              <div style={{ marginTop: 14 }}>
                <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Alasan (opsional)</label>
                <input
                  value={alasan}
                  onChange={e => setAlasan(e.target.value)}
                  placeholder="Contoh: pelanggaran ketentuan layanan"
                  style={{ width: '100%', fontSize: 13, padding: '7px 10px', border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 8, fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 8 }}>Langkah 2 — Konfirmasi dengan mengetik nama tenant:</div>
              <div style={{ background: '#f9f9f8', border: '0.5px solid rgba(0,0,0,0.12)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#6b7280', marginBottom: 10 }}>
                Ketik: <span style={{ fontWeight: 600, color: '#1a1a1a' }}>{tenantNama}</span>
              </div>
              <input
                value={konfirmasiNama}
                onChange={e => setKonfirmasiNama(e.target.value)}
                placeholder={`Ketik "${tenantNama}" untuk konfirmasi`}
                style={{
                  width: '100%', fontSize: 13, padding: '7px 10px', fontFamily: 'inherit', boxSizing: 'border-box',
                  border: `0.5px solid ${konfirmasiNama.length > 0 ? (namaMatch ? '#97C459' : '#F09595') : 'rgba(0,0,0,0.2)'}`,
                  borderRadius: 8,
                }}
              />
              {konfirmasiNama.length > 0 && !namaMatch && (
                <div style={{ fontSize: 11, color: '#A32D2D', marginTop: 4 }}>Nama tidak cocok — ketik persis seperti nama brand tenant</div>
              )}
            </div>
          )}
        </div>

        <div style={{ padding: '12px 20px', borderTop: '0.5px solid rgba(0,0,0,0.12)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} disabled={saving} style={{ padding: '6px 14px', fontSize: 13, borderRadius: 8, border: '0.5px solid rgba(0,0,0,0.22)', background: 'transparent', color: '#1a1a1a', cursor: 'pointer', fontFamily: 'inherit' }}>
            Batal
          </button>
          {step === 1 && (
            <button onClick={() => setStep(2)} style={{ padding: '6px 14px', fontSize: 13, borderRadius: 8, border: '0.5px solid #F09595', background: 'transparent', color: '#A32D2D', cursor: 'pointer', fontFamily: 'inherit' }}>
              Lanjut →
            </button>
          )}
          {step === 2 && (
            <button
              onClick={() => onConfirm(alasan, konfirmasiNama)}
              disabled={saving || !bisaConfirm}
              style={{ padding: '6px 14px', fontSize: 13, borderRadius: 8, border: '0.5px solid #F09595', background: '#FCEBEB', color: bisaConfirm ? '#A32D2D' : '#9ca3af', cursor: bisaConfirm ? 'pointer' : 'not-allowed', fontFamily: 'inherit', opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Memproses...' : 'Nonaktifkan Tenant'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Dialog Aktifkan Kembali ──────────────────────────────────────────────────
// Tampil info riwayat Non-Active terakhir + pilihan: Pending atau Aktifkan

interface LogNonActive {
  status_to:  string
  alasan:     string | null
  created_at: string
}

function DialogAktifkanKembali({
  tenantId,
  tenantNama,
  onClose,
  onPilih,
  saving,
}: {
  tenantId:   string
  tenantNama: string
  onClose:    () => void
  onPilih:    (pilihan: 'pending' | 'active') => void
  saving:     boolean
}) {
  const [log,     setLog]     = useState<LogNonActive | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchLog() {
      try {
        const res  = await fetch(`/api/superadmin/tenants/${tenantId}/lifecycle-logs?status_to=non_active`)
        const json = await res.json()
        if (json.success && json.data.length > 0) setLog(json.data[0])
      } catch { /* silent */ } finally {
        setLoading(false)
      }
    }
    fetchLog()
  }, [tenantId])

  function formatTglIndo(isoStr: string) {
    return new Date(isoStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 14, width: 500, maxWidth: '90vw', border: '1.5px solid #97C459', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '0.5px solid rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a' }}>Aktifkan Kembali Tenant</div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 18, color: '#6b7280', padding: '2px 6px' }}>x</button>
        </div>

        <div style={{ padding: '16px 20px' }}>
          {loading ? (
            <div style={{ fontSize: 13, color: '#6b7280', textAlign: 'center', padding: '20px 0' }}>Memuat data...</div>
          ) : (
            <>
              {/* Info riwayat Non-Active */}
              <div style={{ background: '#FAEEDA', border: '0.5px solid #EF9F27', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#633806', marginBottom: 16, lineHeight: 1.7 }}>
                {log ? (
                  <>
                    <strong>{tenantNama}</strong> memiliki catatan Tidak Aktif,
                    {' '}tanggal: <strong>{formatTglIndo(log.created_at)}</strong>,
                    {' '}dengan alasan: <strong>{log.alasan ?? '(tidak ada alasan)'}</strong>.
                    {' '}Belum ada data transaksi.
                  </>
                ) : (
                  <><strong>{tenantNama}</strong> tidak memiliki catatan Tidak Aktif sebelumnya. Belum ada data transaksi.</>
                )}
              </div>

              {/* Pilihan tindakan */}
              <div style={{ fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 10 }}>Pilih tindakan untuk tenant ini:</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  onClick={() => onPilih('pending')}
                  disabled={saving}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', borderRadius: 10, border: '0.5px solid #EF9F27', background: 'transparent', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
                >
                  <i className="ti ti-hourglass" style={{ fontSize: 16, color: '#854F0B', marginTop: 1, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#854F0B' }}>Pending — Review Dulu</div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Status kembali ke Menunggu. SA perlu klik Aktifkan Tenant setelahnya.</div>
                  </div>
                </button>
                <button
                  onClick={() => onPilih('active')}
                  disabled={saving}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', borderRadius: 10, border: '0.5px solid #97C459', background: 'transparent', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
                >
                  <i className="ti ti-circle-check" style={{ fontSize: 16, color: '#3B6D11', marginTop: 1, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#3B6D11' }}>Aktifkan Langsung</div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Tenant langsung Aktif. AdminTenant dapat login kembali sekarang.</div>
                  </div>
                </button>
              </div>
            </>
          )}
        </div>

        <div style={{ padding: '12px 20px', borderTop: '0.5px solid rgba(0,0,0,0.12)', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} disabled={saving} style={{ padding: '6px 14px', fontSize: 13, borderRadius: 8, border: '0.5px solid rgba(0,0,0,0.22)', background: 'transparent', color: '#1a1a1a', cursor: 'pointer', fontFamily: 'inherit' }}>
            Batal
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Komponen utama ───────────────────────────────────────────────────────────

export function TenantDetailClient({ tenant: initialTenant }: Props) {
  const [tenant,       setTenant]       = useState<Tenant>(initialTenant)
  const [activeTab,    setActiveTab]    = useState<TenantTabId>('info')
  const [dialogMode,   setDialogMode]   = useState<DialogMode>(null)
  const [saving,       setSaving]       = useState(false)

  // Refresh data setelah perubahan status
  const handleRefresh = async () => {
    try {
      const res  = await fetch(`/api/superadmin/tenants/${tenant.id}`)
      const json = await res.json()
      if (json.success) setTenant(json.data)
    } catch { /* silent */ }
  }

  // Nonaktifkan tenant: active → non_active
  const handleConfirmNonaktifkan = async (alasan: string, konfirmasiNama: string) => {
    setSaving(true)
    try {
      const res  = await fetch(`/api/superadmin/tenants/${tenant.id}/status`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status: 'non_active', alasan: alasan || null, konfirmasi_nama: konfirmasiNama }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message)
      toast.success('Tenant berhasil dinonaktifkan')
      setDialogMode(null)
      await handleRefresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal mengubah status')
    } finally {
      setSaving(false)
    }
  }

  // Aktifkan kembali: non_active → pending atau active (pilihan SA di dialog)
  const handlePilihAktifkan = async (pilihan: 'pending' | 'active') => {
    setSaving(true)
    try {
      const res  = await fetch(`/api/superadmin/tenants/${tenant.id}/status`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status: pilihan, alasan: 'Diaktifkan kembali oleh SuperAdmin' }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message)
      const label = pilihan === 'active' ? 'Tenant berhasil diaktifkan' : 'Tenant kembali ke status Menunggu'
      toast.success(label)
      setDialogMode(null)
      await handleRefresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal mengubah status')
    } finally {
      setSaving(false)
    }
  }

  const quickStats = {
    kategori_aktif:   0,
    user_aktif:       0,
    user_quota:       tenant.tier === 'starter' ? 5 : tenant.tier === 'growth' ? 15 : 9999,
    kontrak_berakhir: tenant.contract_end_date ?? null,
    auto_renewal:     tenant.auto_renewal,
  }

  return (
    <div className="flex flex-col min-h-0">
      <div className="flex-1 overflow-auto p-6">

        <TenantDetailHeader
          tenant={tenant}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onNonaktifkan={() => setDialogMode('nonaktifkan')}
          onAktifkanKembali={() => setDialogMode('aktifkan_kembali')}
          quickStats={quickStats}
        />

        {activeTab === 'info'        && <TabInfoUmum          tenant={tenant} onRefresh={handleRefresh} />}
        {activeTab === 'kontrak'     && <TabKontrakSewa        tenant={tenant} onRefresh={handleRefresh} />}
        {activeTab === 'kategori'    && <TabKategori           tenantId={tenant.id} />}
        {activeTab === 'admintenant' && <TabAdminTenantHistory tenantId={tenant.id} tenantNama={tenant.nama_brand ?? ''} />}
        {activeTab === 'user'        && <TabUserTenant         tenantId={tenant.id} tier={tenant.tier} />}
        {activeTab === 'config'      && <TabOverrideConfig     tenantId={tenant.id} />}
        {activeTab === 'aksesmenu'   && <TabAksesMenuAT        tenantId={tenant.id} tenantNama={tenant.nama_brand ?? ''} />}
      </div>

      {/* Dialog Nonaktifkan Tenant */}
      {dialogMode === 'nonaktifkan' && (
        <DialogNonaktifkan
          tenantNama={tenant.nama_brand ?? ''}
          onClose={() => setDialogMode(null)}
          onConfirm={handleConfirmNonaktifkan}
          saving={saving}
        />
      )}

      {/* Dialog Aktifkan Kembali */}
      {dialogMode === 'aktifkan_kembali' && (
        <DialogAktifkanKembali
          tenantId={tenant.id}
          tenantNama={tenant.nama_brand ?? ''}
          onClose={() => setDialogMode(null)}
          onPilih={handlePilihAktifkan}
          saving={saving}
        />
      )}
    </div>
  )
}
