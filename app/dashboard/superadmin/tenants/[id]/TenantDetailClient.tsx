'use client'

// app/dashboard/superadmin/tenants/[id]/TenantDetailClient.tsx
// Orchestrator Detail Tenant — TenantDetailHeader persisten + 7 tab
//
// Dibuat: Sesi #132 — M6 FASE 3 Step 3.7
// Diupdate: Sesi #141 — M6 Fix Fase A (G14) — integrasi TenantDetailHeader
// Diupdate: Sesi #301 — Implementasi handleSuspend + handleTerminate
//   Dialog konfirmasi 2-langkah: baca konsekuensi → ketik nama tenant.
//   API: PATCH /api/superadmin/tenants/[id]/status
// Diupdate: Sesi #302 — H-B06-02 Re-aktivasi Tenant Terminated
//   Tambah DialogMode 'reactivate', fix kalimat terminate, prop onReactivate di Header.
// Diupdate: Sesi #303 — FIX B-06 dialog Re-Aktif dari Non-Active
//   Ganti mode 'resume' dengan DialogReaktifSuspended: tampil info catatan Non-Active
//   + pilihan tombol 'Pending' atau 'Aktifkan' langsung di dalam dialog.

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
import type { Tenant, TenantLifecycleStatus } from '@/lib/types/tenant.types'

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props { tenant: Tenant }

// ─── Tipe dialog lifecycle ────────────────────────────────────────────────────

type DialogMode = 'suspend' | 'terminate' | 'reactivate' | null

// ─── Dialog konfirmasi lifecycle ──────────────────────────────────────────────

function DialogLifecycle({
  mode,
  tenantNama,
  onClose,
  onConfirm,
  saving,
}: {
  mode:       DialogMode
  tenantNama: string
  onClose:    () => void
  onConfirm:  (alasan: string, konfirmasiNama: string) => void
  saving:     boolean
}) {
  const [step,           setStep]           = useState<1 | 2>(1)
  const [alasan,         setAlasan]         = useState('')
  const [konfirmasiNama, setKonfirmasiNama] = useState('')

  // Reset state setiap kali dialog dibuka ulang (mode berubah dari null ke nilai tertentu)
  useEffect(() => {
    if (mode) {
      setStep(1)
      setAlasan('')
      setKonfirmasiNama('')
    }
  }, [mode])

  if (!mode) return null

  const isReactivate = mode === 'reactivate'   // S#302
  const isSimple     = isReactivate             // mode tanpa langkah 2 konfirmasi nama

  const config = {
    suspend: {
      title:       'Non Active',
      borderColor: '#EF9F27',
      btnColor:    { bg: 'transparent', text: '#854F0B', border: '#EF9F27' },
      btnLabel:    'Non Active',
      konsekuensi: [
        'AdminTenant tidak bisa login ke dashboard tenant ini.',
        'Semua operasi bisnis tenant dihentikan sementara.',
        'Data dan konfigurasi tetap tersimpan.',
        'Tenant bisa diaktifkan kembali kapan saja.',
      ],
    },

    terminate: {
      title:       'Akhiri Tenant',
      borderColor: '#F09595',
      btnColor:    { bg: '#FCEBEB', text: '#A32D2D', border: '#F09595' },
      btnLabel:    'Akhiri Tenant',
      konsekuensi: [
        'AdminTenant kehilangan akses ke dashboard tenant ini.',
        'Semua operasi bisnis tenant dihentikan.',
        'Semua data tetap tersimpan untuk keperluan audit.',
        'SA dapat mengaktifkan kembali tenant ini di kemudian hari jika diperlukan.',
      ],
    },
    reactivate: {   // S#302
      title:       'Aktifkan Kembali Tenant',
      borderColor: '#97C459',
      btnColor:    { bg: 'transparent', text: '#3B6D11', border: '#97C459' },
      btnLabel:    'Aktifkan Kembali',
      konsekuensi: [
        'Status tenant akan kembali ke Menunggu Review (pending).',
        'SA perlu melakukan review ulang kontrak sebelum mengaktifkan penuh.',
        'AdminTenant belum bisa login sampai status diubah ke Aktif.',
        'Semua data dan konfigurasi sebelumnya tetap tersimpan.',
      ],
    },
  }[mode]

  const namaMatch = konfirmasiNama.trim().toLowerCase() === tenantNama.trim().toLowerCase()
  const bisa = isSimple ? true : (step === 2 && namaMatch)

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 14, width: 480, maxWidth: '90vw', border: `1.5px solid ${config.borderColor}`, overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '0.5px solid rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a' }}>{config.title}</div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 18, color: '#6b7280', padding: '2px 6px' }}>×</button>
        </div>

        <div style={{ padding: '16px 20px' }}>

          {/* Langkah 1 — baca konsekuensi */}
          {(step === 1 || isSimple) && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 8 }}>
                {isSimple ? 'Yang akan terjadi:' : 'Langkah 1 — Baca konsekuensi:'}
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: '#1a1a1a', lineHeight: 1.7 }}>
                {config.konsekuensi.map((k, i) => <li key={i}>{k}</li>)}
              </ul>

              {/* Field alasan: opsional untuk suspend/terminate */}
              {!isReactivate && (
                <div style={{ marginTop: 14 }}>
                  <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Alasan (opsional)</label>
                  <input
                    value={alasan}
                    onChange={e => setAlasan(e.target.value)}
                    placeholder="Contoh: pelanggaran ketentuan layanan"
                    style={{ width: '100%', fontSize: 13, padding: '7px 10px', border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 8, fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                </div>
              )}
              {isReactivate && (   // S#302: alasan wajib untuk re-aktivasi
                <div style={{ marginTop: 14 }}>
                  <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Alasan re-aktivasi <span style={{ color: '#A32D2D' }}>*</span></label>
                  <input
                    value={alasan}
                    onChange={e => setAlasan(e.target.value)}
                    placeholder="Contoh: kontrak diperpanjang, masalah sebelumnya sudah diselesaikan"
                    style={{ width: '100%', fontSize: 13, padding: '7px 10px', border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 8, fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Langkah 2 — konfirmasi nama (suspend/terminate) */}
          {step === 2 && !isReactivate && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 8 }}>
                Langkah 2 — Konfirmasi dengan mengetik nama tenant:
              </div>
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

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '0.5px solid rgba(0,0,0,0.12)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} disabled={saving} style={{ padding: '6px 14px', fontSize: 13, borderRadius: 8, border: '0.5px solid rgba(0,0,0,0.22)', background: 'transparent', color: '#1a1a1a', cursor: 'pointer', fontFamily: 'inherit' }}>
            Batal
          </button>

          {/* Langkah 1 → Langkah 2 (suspend/terminate) */}
          {step === 1 && !isSimple && (
            <button onClick={() => setStep(2)} style={{ padding: '6px 14px', fontSize: 13, borderRadius: 8, border: `0.5px solid ${config.borderColor}`, background: 'transparent', color: config.btnColor.text, cursor: 'pointer', fontFamily: 'inherit' }}>
              Lanjut →
            </button>
          )}

          {/* Konfirmasi final */}
          {(isSimple || step === 2) && (
            <button
              onClick={() => onConfirm(alasan, konfirmasiNama)}
              disabled={saving || !bisa || (isReactivate && !alasan.trim())}
              style={{ padding: '6px 14px', fontSize: 13, borderRadius: 8, border: `0.5px solid ${config.borderColor}`, background: config.btnColor.bg, color: bisa ? config.btnColor.text : '#9ca3af', cursor: bisa ? 'pointer' : 'not-allowed', fontFamily: 'inherit', opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Memproses...' : config.btnLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Dialog Re-Aktif dari Non-Active (S#303) ────────────────────────────────
// Tampil info catatan Non-Active terakhir + pilihan tombol Pending / Aktifkan

interface LogNonActive {
  status_to:  string
  alasan:     string | null
  created_at: string
}

function DialogReaktifSuspended({
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
        const res  = await fetch(`/api/superadmin/tenants/${tenantId}/lifecycle-logs?status_to=suspended`)
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
          <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a' }}>Re-Aktif Tenant</div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 18, color: '#6b7280', padding: '2px 6px' }}>x</button>
        </div>

        <div style={{ padding: '16px 20px' }}>
          {loading ? (
            <div style={{ fontSize: 13, color: '#6b7280', textAlign: 'center', padding: '20px 0' }}>Memuat data...</div>
          ) : (
            <>
              {/* Info catatan Non-Active */}
              <div style={{ background: '#FAEEDA', border: '0.5px solid #EF9F27', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#633806', marginBottom: 16, lineHeight: 1.7 }}>
                {log ? (
                  <>
                    <strong>{tenantNama}</strong> memiliki catatan Non Active,
                    {' '}tanggal: <strong>{formatTglIndo(log.created_at)}</strong>,
                    {' '}dengan alasan: <strong>{log.alasan ?? '(tidak ada alasan)'}</strong>.
                    {' '}Belum ada data transaksi.
                  </>
                ) : (
                  <><strong>{tenantNama}</strong> tidak memiliki catatan Non Active sebelumnya. Belum ada data transaksi.</>
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
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#854F0B' }}>Pending</div>
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
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#3B6D11' }}>Actived</div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Tenant langsung Aktif. AdminTenant dapat login kembali sekarang.</div>
                  </div>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
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
  const [tenant,      setTenant]      = useState<Tenant>(initialTenant)
  const [activeTab,   setActiveTab]   = useState<TenantTabId>('info')
  const [dialogMode,  setDialogMode]  = useState<DialogMode>(null)
  const [savingStatus, setSavingStatus] = useState(false)
  // S#303: dialog Re-Aktif dari Non-Active
  const [showDialogReaktif, setShowDialogReaktif] = useState(false)

  // Refresh data setelah ada perubahan
  const handleRefresh = async () => {
    try {
      const res  = await fetch(`/api/superadmin/tenants/${tenant.id}`)
      const json = await res.json()
      if (json.success) setTenant(json.data)
    } catch { /* silent */ }
  }

  // Kirim perubahan status ke API
  const handleConfirmStatus = async (alasan: string, konfirmasiNama: string) => {
    if (!dialogMode) return
    setSavingStatus(true)

    const statusMap: Record<NonNullable<DialogMode>, TenantLifecycleStatus> = {
      suspend:    'suspended',
      terminate:  'terminated',
      reactivate: 'pending',   // S#302: terminated → pending untuk review ulang
    }
    const newStatus = statusMap[dialogMode]

    try {
      const res  = await fetch(`/api/superadmin/tenants/${tenant.id}/status`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status: newStatus, alasan: alasan || null, konfirmasi_nama: konfirmasiNama }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message)

      const labelMap: Record<NonNullable<DialogMode>, string> = {
        suspend:    'Tenant berhasil dinonaktifkan',
        terminate:  'Tenant berhasil diakhiri',
        reactivate: 'Tenant berhasil diaktifkan kembali — status: Menunggu Review',   // S#302
      }
      toast.success(labelMap[dialogMode])
      setDialogMode(null)
      await handleRefresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal mengubah status')
    } finally {
      setSavingStatus(false)
    }
  }

  // S#303: handler Re-Aktif dari Non-Active — pilihan Pending atau Aktifkan
  const handlePilihReaktif = async (pilihan: 'pending' | 'active') => {
    setSavingStatus(true)
    try {
      const res  = await fetch(`/api/superadmin/tenants/${tenant.id}/status`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status: pilihan, alasan: 'Re-aktivasi dari Non-Active' }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message)
      const label = pilihan === 'active' ? 'Tenant berhasil diaktifkan' : 'Tenant kembali ke status Pending'
      toast.success(label)
      setShowDialogReaktif(false)
      await handleRefresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal mengubah status')
    } finally {
      setSavingStatus(false)
    }
  }

  // Quick stats dari field yang ada di Tenant
  const quickStats = {
    kategori_aktif:   0,
    user_aktif:       0,
    user_quota:       tenant.tier === 'starter' ? 5 : tenant.tier === 'growth' ? 15 : 9999,
    kontrak_berakhir: tenant.contract_end_date ?? null,
    auto_renewal:     tenant.auto_renewal,
  }

  const handleSuspend    = () => setDialogMode(tenant.lifecycle_status === 'suspended' ? null : 'suspend')
  // S#303: suspended → buka DialogReaktifSuspended, bukan DialogLifecycle
  const handleResume     = () => setShowDialogReaktif(true)
  const handleTerminate  = () => setDialogMode('terminate')
  const handleReactivate = () => setDialogMode('reactivate')   // S#302

  return (
    <div className="flex flex-col min-h-0">
      <div className="flex-1 overflow-auto p-6">

        <TenantDetailHeader
          tenant={tenant}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onSuspend={tenant.lifecycle_status === 'suspended' ? handleResume : handleSuspend}
          onTerminate={handleTerminate}
          onReactivate={handleReactivate}   // S#302
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

      {/* Dialog Re-Aktif dari Non-Active (S#303) */}
      {showDialogReaktif && (
        <DialogReaktifSuspended
          tenantId={tenant.id}
          tenantNama={tenant.nama_brand ?? ''}
          onClose={() => setShowDialogReaktif(false)}
          onPilih={handlePilihReaktif}
          saving={savingStatus}
        />
      )}

      {/* Dialog konfirmasi lifecycle */}
      <DialogLifecycle
        mode={dialogMode}
        tenantNama={tenant.nama_brand ?? ''}
        onClose={() => setDialogMode(null)}
        onConfirm={handleConfirmStatus}
        saving={savingStatus}
      />
    </div>
  )
}
