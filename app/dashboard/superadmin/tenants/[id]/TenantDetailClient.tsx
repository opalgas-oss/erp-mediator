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

import { useState }    from 'react'
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

type DialogMode = 'suspend' | 'resume' | 'terminate' | 'reactivate' | null

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

  if (!mode) return null

  const isResume     = mode === 'resume'
  const isReactivate = mode === 'reactivate'   // S#302
  const isSimple     = isResume || isReactivate // mode tanpa langkah 2 konfirmasi nama

  const config = {
    suspend: {
      title:       'Nonaktifkan Sementara',
      borderColor: '#EF9F27',
      btnColor:    { bg: 'transparent', text: '#854F0B', border: '#EF9F27' },
      btnLabel:    'Nonaktifkan',
      konsekuensi: [
        'AdminTenant tidak bisa login ke dashboard tenant ini.',
        'Semua operasi bisnis tenant dihentikan sementara.',
        'Data dan konfigurasi tetap tersimpan.',
        'Tenant bisa diaktifkan kembali kapan saja.',
      ],
    },
    resume: {
      title:       'Aktifkan Kembali',
      borderColor: '#97C459',
      btnColor:    { bg: 'transparent', text: '#3B6D11', border: '#97C459' },
      btnLabel:    'Aktifkan',
      konsekuensi: [
        'AdminTenant dapat login kembali ke dashboard tenant.',
        'Semua operasi bisnis tenant diaktifkan kembali.',
        'Status lifecycle kembali ke Aktif.',
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

              {/* Field alasan: opsional untuk suspend/terminate, wajib untuk reactivate */}
              {!isResume && !isReactivate && (
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
          {step === 2 && !isResume && (
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

// ─── Komponen utama ───────────────────────────────────────────────────────────

export function TenantDetailClient({ tenant: initialTenant }: Props) {
  const [tenant,      setTenant]      = useState<Tenant>(initialTenant)
  const [activeTab,   setActiveTab]   = useState<TenantTabId>('info')
  const [dialogMode,  setDialogMode]  = useState<DialogMode>(null)
  const [savingStatus, setSavingStatus] = useState(false)

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
      resume:     'active',
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
        resume:     'Tenant berhasil diaktifkan kembali',
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

  // Quick stats dari field yang ada di Tenant
  const quickStats = {
    kategori_aktif:   0,
    user_aktif:       0,
    user_quota:       tenant.tier === 'starter' ? 5 : tenant.tier === 'growth' ? 15 : 9999,
    kontrak_berakhir: tenant.contract_end_date ?? null,
    auto_renewal:     tenant.auto_renewal,
  }

  // Tentukan mode dialog berdasarkan status saat ini
  const handleSuspend    = () => setDialogMode(tenant.lifecycle_status === 'suspended' ? 'resume' : 'suspend')
  const handleTerminate  = () => setDialogMode('terminate')
  const handleReactivate = () => setDialogMode('reactivate')   // S#302

  return (
    <div className="flex flex-col min-h-0">
      <div className="flex-1 overflow-auto p-6">

        <TenantDetailHeader
          tenant={tenant}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onSuspend={handleSuspend}
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
