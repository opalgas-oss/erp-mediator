'use client'

// app/dashboard/superadmin/tenants/[id]/TabAksesMenuAT.tsx
// Tab "Akses Menu AT" — SA toggle menu ceiling untuk satu tenant.
// Data source: GET/POST /api/superadmin/tenants/[id]/ceiling
// Acuan visual: Mockup_F9_SA_Ceiling_v3.html (CASE SESI-24 — disetujui Philips)
//
// Dibuat: CASE SESI-27 — A-F9 UI Ceiling SA

import { useState, useEffect, useCallback } from 'react'

// ─── CSS variables (sesuai design token platform) ────────────────────────────

const C = {
  ct:   '#1a1a1a',
  cs:   '#6b7280',
  c3:   '#9ca3af',
  bd:   'rgba(0,0,0,0.12)',
  bdr:  'rgba(0,0,0,0.08)',
  sur:  '#fff',
  surs: '#f9f9f8',
  blue: '#185FA5',
  sucBg: '#EAF3DE', sucTx: '#3B6D11', sucBd: '#97C459',
  warBg: '#FAEEDA', warTx: '#854F0B', warBd: '#EF9F27',
  infBg: '#E6F1FB', infTx: '#185FA5', infBd: '#85B7EB',
  neuBg: '#F1EFE8', neuTx: '#5F5E5A', neuBd: '#B4B2A9',
  intBg: '#EEEDFE', intTx: '#534AB7', intBd: '#AFA9EC',
}

// ─── Konstanta menu AT (sesuai ACUAN_MOCKUP_DASHBOARD_AT_v1.md) ──────────────
// Urutan dan label sesuai mockup F9 v3. menu_key harus match dashboard_menus DB.

type MenuLeaf = { menuKey: string; label: string; isPjOnly?: boolean }
type MenuGroup = {
  groupKey: string
  label:    string
  icon:     string
  items:    MenuLeaf[]
}

const AT_MENU_GROUPS: MenuGroup[] = [
  {
    groupKey: 'at.beranda',
    label: 'Beranda',
    icon: 'ti-home-2',
    items: [{ menuKey: 'at.beranda', label: 'Beranda' }],
  },
  {
    groupKey: 'at.permintaan_lelang',
    label: 'Permintaan & Lelang',
    icon: 'ti-gavel',
    items: [
      { menuKey: 'at.permintaan_lelang.permintaan_masuk',  label: 'Permintaan Masuk' },
      { menuKey: 'at.permintaan_lelang.lelang_berjalan',   label: 'Lelang Berjalan' },
      { menuKey: 'at.permintaan_lelang.daftar_bid',        label: 'Daftar Bid' },
      { menuKey: 'at.permintaan_lelang.order_berjalan',    label: 'Order Berjalan' },
      { menuKey: 'at.permintaan_lelang.riwayat_order',     label: 'Riwayat Order' },
      { menuKey: 'at.permintaan_lelang.sengketa',          label: 'Sengketa' },
    ],
  },
  {
    groupKey: 'at.manajemen_vendor',
    label: 'Manajemen Vendor',
    icon: 'ti-users-group',
    items: [
      { menuKey: 'at.manajemen_vendor.daftar_aktif',      label: 'Daftar Vendor Aktif' },
      { menuKey: 'at.manajemen_vendor.permintaan_gabung', label: 'Permintaan Bergabung' },
      { menuKey: 'at.manajemen_vendor.diblokir',          label: 'Vendor Diblokir' },
    ],
  },
  {
    groupKey: 'at.keuangan',
    label: 'Keuangan & Pencairan',
    icon: 'ti-receipt-2',
    items: [
      { menuKey: 'at.keuangan.ringkasan',         label: 'Ringkasan Keuangan' },
      { menuKey: 'at.keuangan.riwayat_transaksi', label: 'Riwayat Transaksi' },
      { menuKey: 'at.keuangan.kewajiban_vendor',  label: 'Kewajiban ke Vendor' },
      { menuKey: 'at.keuangan.kewajiban_sa',      label: 'Kewajiban ke SA' },
      { menuKey: 'at.keuangan.refund_koreksi',    label: 'Refund & Koreksi' },
    ],
  },
  {
    groupKey: 'at.laporan',
    label: 'Laporan & Analitik',
    icon: 'ti-chart-bar',
    items: [
      { menuKey: 'at.laporan.ringkasan_operasional', label: 'Ringkasan Operasional' },
      { menuKey: 'at.laporan.keuangan',              label: 'Laporan Keuangan' },
      { menuKey: 'at.laporan.performa_vendor',       label: 'Laporan Performa Vendor' },
      { menuKey: 'at.laporan.bidding',               label: 'Laporan Bidding' },
    ],
  },
  {
    groupKey: 'at.profil_tim',
    label: 'Profil & Tim',
    icon: 'ti-building-store',
    items: [
      { menuKey: 'at.profil_tim.profil_perusahaan', label: 'Profil Perusahaan' },
      { menuKey: 'at.profil_tim.manajemen_tim',     label: 'Manajemen Tim' },
    ],
  },
  {
    groupKey: 'at.pengaturan_ops',
    label: 'Pengaturan Operasional',
    icon: 'ti-settings-2',
    items: [
      { menuKey: 'at.pengaturan_ops.bidding_lelang', label: 'Pengaturan Bidding & Lelang' },
      { menuKey: 'at.pengaturan_ops.vendor',         label: 'Pengaturan Vendor' },
      { menuKey: 'at.pengaturan_ops.harian',         label: 'Pengaturan Operasional Harian' },
      { menuKey: 'at.pengaturan_ops.komisi_biaya',   label: 'Pengaturan Komisi & Biaya' },
    ],
  },
  {
    groupKey: 'at.notifikasi_log',
    label: 'Notifikasi & Log',
    icon: 'ti-bell-ringing-2',
    items: [
      { menuKey: 'at.notifikasi_log.pengaturan_notif', label: 'Pengaturan Notifikasi' },
      { menuKey: 'at.notifikasi_log.log_aktivitas',    label: 'Log Aktivitas' },
    ],
  },
]

const PJ_ITEMS: MenuLeaf[] = [
  { menuKey: 'at.kelola_akses_role',   label: 'Kelola Akses Role',   isPjOnly: true },
  { menuKey: 'at.konfigurasi_system',  label: 'Konfigurasi System',  isPjOnly: true },
]

// Semua menu_key yang bisa di-toggle (non-PJ)
const ALL_TOGGLEABLE_KEYS: string[] = AT_MENU_GROUPS.flatMap(g => g.items.map(i => i.menuKey))

// ─── Tipe state ───────────────────────────────────────────────────────────────

type CeilingMap = Record<string, boolean> // menuKey → isActive

// Map menu_key → id dari DB (diisi setelah load)
type MenuIdMap = Record<string, string> // menuKey → uuid

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  tenantId:   string
  tenantNama: string
}

// ─── Toggle komponen kecil ─────────────────────────────────────────────────────

function Toggle({
  on,
  disabled = false,
  onChange,
}: {
  on: boolean
  disabled?: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div
      role="switch"
      aria-checked={on}
      onClick={() => !disabled && onChange(!on)}
      style={{
        width: 34, height: 19, borderRadius: 100,
        background: on ? C.blue : '#d1d5db',
        display: 'flex', alignItems: 'center', padding: 2.5,
        justifyContent: on ? 'flex-end' : 'flex-start',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transition: 'background 0.15s',
        flexShrink: 0,
      }}
    >
      <div style={{
        width: 14, height: 14, borderRadius: '50%', background: '#fff',
        boxShadow: '0 1px 2px rgba(0,0,0,0.2)', flexShrink: 0,
      }} />
    </div>
  )
}

// ─── Komponen utama ───────────────────────────────────────────────────────────

export function TabAksesMenuAT({ tenantId, tenantNama }: Props) {
  const [ceiling,    setCeiling]    = useState<CeilingMap>({})
  const [menuIdMap,  setMenuIdMap]  = useState<MenuIdMap>({})
  const [dirty,      setDirty]      = useState(false)
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [statusMsg,  setStatusMsg]  = useState<{ text: string; ok: boolean } | null>(null)
  const [errorMsg,   setErrorMsg]   = useState<string | null>(null)

  // ── Load: ceiling saat ini + id map dari DB ──────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      // 1. Ambil ceiling saat ini
      const cRes = await fetch(`/api/superadmin/tenants/${tenantId}/ceiling`)
      const cJson = await cRes.json()
      if (!cJson.success) throw new Error(cJson.message ?? 'Gagal ambil data ceiling')

      // 2. Ambil id map: menu_key → uuid dari dashboard_menus
      const mRes = await fetch(`/api/superadmin/dashboard-menus?scope=admin_tenant`)
      const mJson = await mRes.json()

      // Bangun menuIdMap dari response
      const idMap: MenuIdMap = {}
      if (mJson.success && Array.isArray(mJson.data)) {
        for (const row of mJson.data as { menuKey: string; id: string }[]) {
          idMap[row.menuKey] = row.id
        }
      }
      setMenuIdMap(idMap)

      // Bangun ceiling map: default semua ON (jika belum pernah diset SA, semua aktif)
      const existingCeiling: CeilingMap = {}
      for (const item of cJson.data as { menuId: string; isActive: boolean }[]) {
        // Cari menu_key dari id
        const key = Object.keys(idMap).find(k => idMap[k] === item.menuId)
        if (key) existingCeiling[key] = item.isActive
      }

      // Menu yang belum ada di ceiling → default ON
      const finalCeiling: CeilingMap = {}
      for (const key of ALL_TOGGLEABLE_KEYS) {
        finalCeiling[key] = existingCeiling[key] ?? true
      }
      setCeiling(finalCeiling)
      setDirty(false)

    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => { load() }, [load])

  // ── Toggle satu item ───────────────────────────────────────────────────────
  const toggle = (key: string, val: boolean) => {
    setCeiling(prev => ({ ...prev, [key]: val }))
    setDirty(true)
    setStatusMsg(null)
  }

  // ── Toggle semua item di satu grup ─────────────────────────────────────────
  const toggleGroup = (group: MenuGroup, val: boolean) => {
    const update: CeilingMap = {}
    for (const item of group.items) update[item.menuKey] = val
    setCeiling(prev => ({ ...prev, ...update }))
    setDirty(true)
    setStatusMsg(null)
  }

  // ── Aktifkan / nonaktifkan semua ────────────────────────────────────────────
  const setAll = (val: boolean) => {
    const update: CeilingMap = {}
    for (const key of ALL_TOGGLEABLE_KEYS) update[key] = val
    setCeiling(update)
    setDirty(true)
    setStatusMsg(null)
  }

  // ── Hitung counter ─────────────────────────────────────────────────────────
  const countOn  = ALL_TOGGLEABLE_KEYS.filter(k => ceiling[k] !== false).length
  const countOff = ALL_TOGGLEABLE_KEYS.length - countOn

  // ── Simpan ─────────────────────────────────────────────────────────────────
  const simpan = async () => {
    if (saving) return
    setSaving(true)
    setStatusMsg(null)
    try {
      // Susun items: pakai menuIdMap (uuid) sebagai menuId
      const items = ALL_TOGGLEABLE_KEYS
        .map(key => ({ menuId: menuIdMap[key], isActive: ceiling[key] ?? true }))
        .filter(item => !!item.menuId)

      const res = await fetch(`/api/superadmin/tenants/${tenantId}/ceiling`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message ?? 'Gagal menyimpan')

      setDirty(false)
      setStatusMsg({ text: 'Perubahan tersimpan', ok: true })
    } catch (err) {
      setStatusMsg({ text: err instanceof Error ? err.message : 'Gagal menyimpan', ok: false })
    } finally {
      setSaving(false)
    }
  }

  // ── Batal ─────────────────────────────────────────────────────────────────
  const batal = () => { load() }

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 24, color: C.cs, fontSize: 13 }}>
        <i className="ti ti-loader-2" style={{ animation: 'spin 1s linear infinite' }} />
        Memuat data menu...
      </div>
    )
  }

  if (errorMsg) {
    return (
      <div style={{
        padding: '12px 16px', borderRadius: 8, background: '#FCEBEB',
        color: '#A32D2D', fontSize: 13, border: '0.5px solid #F09595',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <i className="ti ti-alert-circle" />
        {errorMsg}
        <button
          onClick={load}
          style={{ marginLeft: 'auto', fontSize: 12, color: '#A32D2D', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
        >
          Coba lagi
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Banner info */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 8,
        padding: '10px 14px', borderRadius: 8, marginBottom: 16,
        fontSize: 12, lineHeight: 1.5,
        background: C.infBg, color: C.infTx,
        border: `0.5px solid ${C.infBd}`,
      }}>
        <i className="ti ti-info-circle" style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }} />
        <div>
          Menu yang Anda aktifkan di sini akan tampil di Dashboard AdminTenant{' '}
          <strong>{tenantNama}</strong>. Menu yang dinonaktifkan tidak akan muncul sama sekali untuk tenant ini.
        </div>
      </div>

      {/* Summary bar */}
      <div style={{
        background: C.sur, border: `0.5px solid ${C.bd}`, borderRadius: 12,
        padding: '14px 20px', marginBottom: 16,
        display: 'flex', alignItems: 'center', gap: 20,
      }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 600 }}>{countOn}</div>
          <div style={{ fontSize: 11, color: C.cs, marginTop: 2 }}>Menu diaktifkan</div>
        </div>
        <div style={{ width: 0.5, height: 36, background: C.bd, flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 20, fontWeight: 600, color: C.cs }}>{countOff}</div>
          <div style={{ fontSize: 11, color: C.cs, marginTop: 2 }}>Menu dinonaktifkan</div>
        </div>
        <div style={{ width: 0.5, height: 36, background: C.bd, flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 20, fontWeight: 600 }}>{ALL_TOGGLEABLE_KEYS.length}</div>
          <div style={{ fontSize: 11, color: C.cs, marginTop: 2 }}>Total menu AT</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={() => setAll(false)} style={btnOutline}>Nonaktifkan Semua</button>
          <button onClick={() => setAll(true)}  style={btnOutline}>Aktifkan Semua</button>
          <button onClick={simpan} disabled={saving || !dirty} style={{ ...btnPrimary, opacity: (saving || !dirty) ? 0.6 : 1 }}>
            <i className="ti ti-device-floppy" />
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>

      {/* Grid 2 kolom */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, paddingBottom: 80 }}>

        {AT_MENU_GROUPS.map(group => {
          const allOn  = group.items.every(i => ceiling[i.menuKey] !== false)
          const allOff = group.items.every(i => ceiling[i.menuKey] === false)
          const countLabel = group.items.length === 1
            ? '1 menu'
            : `${group.items.length} submenu`

          return (
            <div key={group.groupKey} style={card}>
              {/* Card header */}
              <div style={cardHdr}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600 }}>
                  <i className={`ti ${group.icon}`} style={{ fontSize: 14, color: C.blue }} />
                  {group.label}
                </div>
                {group.items.length > 1 && (
                  <button
                    onClick={() => toggleGroup(group, !allOn)}
                    style={{ fontSize: 11, color: C.cs, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <i className="ti ti-checks" style={{ fontSize: 12 }} />
                    {allOn ? 'Nonaktifkan' : allOff ? 'Aktifkan' : 'Semua'}
                  </button>
                )}
                {group.items.length === 1 && (
                  <span style={{
                    fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 100,
                    background: C.infBg, color: C.infTx, border: `0.5px solid ${C.infBd}`,
                  }}>
                    {countLabel}
                  </span>
                )}
              </div>

              {/* Rows */}
              {group.items.map((item, idx) => (
                <div
                  key={item.menuKey}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '9px 16px',
                    borderBottom: idx < group.items.length - 1
                      ? `0.5px solid ${C.bdr}`
                      : 'none',
                  }}
                >
                  <span style={{ fontSize: 12, color: C.cs }}>{item.label}</span>
                  <Toggle
                    on={ceiling[item.menuKey] !== false}
                    onChange={v => toggle(item.menuKey, v)}
                  />
                </div>
              ))}
            </div>
          )
        })}

        {/* Khusus PJ — full width */}
        <div style={{ ...card, gridColumn: '1 / -1' }}>
          <div style={cardHdr}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600 }}>
              <i className="ti ti-shield-lock" style={{ fontSize: 14, color: C.blue }} />
              Khusus Penanggung Jawab (PJ)
            </div>
            <span style={{
              fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 100,
              background: C.neuBg, color: C.neuTx, border: `0.5px solid ${C.neuBd}`,
            }}>
              Selalu aktif — tidak bisa diubah
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            {PJ_ITEMS.map((item, idx) => (
              <div
                key={item.menuKey}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '9px 16px',
                  borderRight: idx === 0 ? `0.5px solid ${C.bdr}` : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: C.cs }}>
                  <i className={idx === 0 ? 'ti ti-shield-lock' : 'ti ti-adjustments-horizontal'} style={{ fontSize: 13, color: C.c3 }} />
                  {item.label}
                  <span style={{
                    fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 100,
                    background: C.intBg, color: C.intTx, border: `0.5px solid ${C.intBd}`,
                  }}>
                    PJ
                  </span>
                </div>
                <Toggle on={true} disabled={true} onChange={() => {}} />
              </div>
            ))}
          </div>

          <div style={{ padding: '9px 16px', fontSize: 11, color: C.cs, background: C.surs, borderTop: `0.5px solid ${C.bdr}` }}>
            Menu ini selalu aktif untuk Penanggung Jawab dan tidak dapat dinonaktifkan.
          </div>
        </div>
      </div>

      {/* Save bar sticky */}
      <div style={{
        position: 'sticky', bottom: 0,
        background: C.sur, borderTop: `0.5px solid ${C.bd}`,
        padding: '12px 0', marginTop: 16,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{
          fontSize: 12,
          color: statusMsg
            ? (statusMsg.ok ? C.sucTx : '#A32D2D')
            : dirty ? C.warTx : C.cs,
        }}>
          {statusMsg
            ? statusMsg.text
            : dirty
              ? 'Ada perubahan yang belum disimpan'
              : 'Tidak ada perubahan'}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={batal}  disabled={!dirty || saving} style={{ ...btnOutline, opacity: (!dirty || saving) ? 0.5 : 1 }}>Batal</button>
          <button onClick={simpan} disabled={!dirty || saving} style={{ ...btnPrimary, opacity: (!dirty || saving) ? 0.6 : 1 }}>
            <i className="ti ti-device-floppy" />
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Style helpers ─────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: '#fff',
  borderWidth: '0.5px', borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.12)',
  borderRadius: 12, overflow: 'hidden',
}

const cardHdr: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '11px 16px',
  borderBottom: '0.5px solid rgba(0,0,0,0.12)',
  background: '#f9f9f8',
}

const btnBase: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '5px 11px', borderRadius: 8,
  fontSize: 12, fontWeight: 500, cursor: 'pointer',
  fontFamily: 'inherit',
}

const btnOutline: React.CSSProperties = {
  ...btnBase,
  background: '#fff', color: '#1a1a1a',
  borderWidth: '0.5px', borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.12)',
}

const btnPrimary: React.CSSProperties = {
  ...btnBase,
  background: '#1a1a1a', color: '#fff',
  borderWidth: '0.5px', borderStyle: 'solid', borderColor: '#1a1a1a',
}
