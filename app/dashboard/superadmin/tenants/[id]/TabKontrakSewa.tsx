'use client'

// app/dashboard/superadmin/tenants/[id]/TabKontrakSewa.tsx
// Tab Kontrak Sewa — pola simpan terpadu (refactor S#318 — H-DRY-TENANT-TABS Blok C)
// Fee Engine TAHAP 3 (S#322): Section C + G22 Banner + FeeSimulator + Section E
// sepenuhnya dinamis dari API /fees — 0 hardcode literal fee.
//
// Dibuat:   Sesi #132 — M6 FASE 3 Step 3.7
// Updated:  Sesi #141 — M6 Fix Fase B
// Refactor: Sesi #318 — C-01: pola simpan terpadu
// Rewrite:  Sesi #322 — TAHAP 3 Fee Engine UI (L-01..L-08)

import { useState, useCallback, useEffect } from 'react'
import { toast }                             from 'sonner'
import type { Tenant }                       from '@/lib/types/tenant.types'
import type {
  FeeListResponse,
  FeeAktif,
  FeeHistoryResponse,
  TenantFeeHistory,
  TambahFeePayload,
  FeeTipe,
  FeeBerlakuUntuk,
}                                            from '@/lib/types/tenant-fee.types'
import { hitungSimulasiFee }                 from '@/lib/utils/fee-simulator'
import { Accordion as AccordionBase }        from './_shared/tenant-tab-ui'
import { FSelect }                           from './_shared/tenant-tab-ui'
import { formatDateIdLong }                  from '@/lib/utils-client'

interface Props { tenant: Tenant; onRefresh: () => void }

// ─── KontrakDraft — field Section A, B, D yang bisa diubah ───────────────────

interface KontrakDraft {
  contract_start_date:    string
  contract_end_date:      string
  biaya_awal:             string
  biaya_langganan:        string
  siklus_tagihan:         string
  pajak_langganan:        string
  auto_renewal:           boolean
  renewal_notice_days:    string
  notif_days:             number[]
  early_termination_fee:  string
  kebijakan_refund:       string
}

function buildDraft(t: Tenant): KontrakDraft {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const x = t as any
  return {
    contract_start_date:   t.contract_start_date?.split('T')[0] ?? '',
    contract_end_date:     t.contract_end_date?.split('T')[0]   ?? '',
    biaya_awal:            String(x.biaya_awal            ?? '0'),
    biaya_langganan:       String(x.biaya_langganan       ?? '0'),
    siklus_tagihan:        x.siklus_tagihan               ?? '',
    pajak_langganan:       String(x.pajak_langganan       ?? ''),
    auto_renewal:          t.auto_renewal                 ?? false,
    renewal_notice_days:   String(t.renewal_notice_days   ?? '30'),
    notif_days:            (x.notif_days as number[])     ?? DEFAULT_NOTIF_DAYS,
    early_termination_fee: String(t.early_termination_fee ?? ''),
    kebijakan_refund:      x.kebijakan_refund             ?? 'Refund prorata untuk sisa hari belum dipakai',
  }
}

function detectHasChanges(draft: KontrakDraft, baseline: KontrakDraft): boolean {
  const keys = Object.keys(draft) as (keyof KontrakDraft)[]
  return keys.some(k => {
    if (k === 'notif_days') return JSON.stringify(draft.notif_days) !== JSON.stringify(baseline.notif_days)
    return String(draft[k]) !== String(baseline[k])
  })
}

function buildDiffPayload(draft: KontrakDraft, baseline: KontrakDraft): Record<string, unknown> {
  const diff: Record<string, unknown> = {}
  const keys = Object.keys(draft) as (keyof KontrakDraft)[]
  for (const k of keys) {
    const changed = k === 'notif_days'
      ? JSON.stringify(draft.notif_days) !== JSON.stringify(baseline.notif_days)
      : String(draft[k]) !== String(baseline[k])
    if (!changed) continue
    if (k === 'auto_renewal') diff[k] = draft.auto_renewal
    else if (k === 'notif_days') diff[k] = draft.notif_days
    else diff[k] = draft[k]
  }
  return diff
}

// ─── Style helpers ────────────────────────────────────────────────────────────

const S = {
  card:    { background: '#fff', border: '0.5px solid rgba(0,0,0,0.12)', borderRadius: 12 } as React.CSSProperties,
  grid2:   { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px' } as React.CSSProperties,
  label:   { fontSize: 12, color: '#6b7280' } as React.CSSProperties,
  input:   (editable: boolean): React.CSSProperties => ({
    fontSize: 13, padding: '7px 10px', borderWidth: '0.5px', borderStyle: 'solid',
    borderColor: 'rgba(0,0,0,0.12)', borderRadius: 8, width: '100%', fontFamily: 'inherit',
    background: editable ? '#fff' : '#f9f9f8', color: editable ? '#1a1a1a' : '#6b7280',
  }),
  help:    { fontSize: 11, color: '#9ca3af', marginTop: 2 } as React.CSSProperties,
  divider: { height: '0.5px', background: 'rgba(0,0,0,0.12)', margin: '14px 0' } as React.CSSProperties,
}

// ─── Accordion wrapper ────────────────────────────────────────────────────────

function Accordion({ icon, iconBg, iconColor, title, defaultOpen, rightContent, children }: {
  icon: string; iconBg: string; iconColor: string; title: string
  defaultOpen?: boolean; rightContent?: React.ReactNode; children: React.ReactNode
}) {
  if (!rightContent) {
    return (
      <AccordionBase icon={icon} iconBg={iconBg} iconColor={iconColor} title={title} defaultOpen={defaultOpen}>
        {children}
      </AccordionBase>
    )
  }
  const [open, setOpen] = useState(defaultOpen ?? false)
  return (
    <div style={{ border: '0.5px solid rgba(0,0,0,0.12)', borderRadius: 12, overflow: 'hidden', marginBottom: 10 }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', cursor: 'pointer', background: '#fff', userSelect: 'none' }}
        onMouseEnter={e => (e.currentTarget.style.background = '#f9f9f8')}
        onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 500, fontSize: 14 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: iconBg, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>
            <i className={`ti ${icon}`} />
          </div>
          {title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }} onClick={e => e.stopPropagation()}>
          {rightContent}
          <i className="ti ti-chevron-down" onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
            style={{ fontSize: 16, color: '#6b7280', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', cursor: 'pointer' }} />
        </div>
      </div>
      {open && <div style={{ padding: '0 16px 16px', background: '#fff' }}>{children}</div>}
    </div>
  )
}

// ─── Field helpers ────────────────────────────────────────────────────────────

function FF({ label, fullWidth, children }: { label: string; fullWidth?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, gridColumn: fullWidth ? '1/-1' : undefined }}>
      <label style={S.label}>{label}</label>
      {children}
    </div>
  )
}

function FRO({ label, value, fullWidth }: { label: string; value: string | null | undefined; fullWidth?: boolean }) {
  return (
    <FF label={label} fullWidth={fullWidth}>
      <input readOnly value={value ?? ''} style={S.input(false)} />
    </FF>
  )
}

// ─── Format helpers ───────────────────────────────────────────────────────────

const fmt = formatDateIdLong

function daysUntil(d: string | null | undefined): number | null {
  if (!d) return null
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
}

function rpFmt(n: number): string {
  return 'Rp' + n.toLocaleString('id-ID')
}

function fmtNilai(fee: FeeAktif): string {
  if (fee.tipe === 'persen' && fee.nilai_persen !== null) {
    return `${fee.nilai_persen}%`
  }
  if (fee.tipe === 'flat' && fee.nilai_flat !== null) {
    return `${rpFmt(fee.nilai_flat)}/${fee.berlaku_untuk === 'per_order' ? 'order' : 'bln'}`
  }
  if (fee.tipe === 'hybrid' && fee.nilai_persen !== null && fee.nilai_flat !== null) {
    return `${fee.nilai_persen}% + ${rpFmt(fee.nilai_flat)}`
  }
  if (fee.tipe === 'info' && fee.nilai_persen !== null) {
    return `${fee.nilai_persen}% efektif (inklusif)`
  }
  return '—'
}

function fmtTipeLabel(tipe: FeeTipe): string {
  const m: Record<FeeTipe, string> = { persen: '% transaksi', flat: 'Flat/order', hybrid: 'Hybrid', info: 'Info saja' }
  return m[tipe] ?? tipe
}

function fmtBerlakuUntuk(bw: FeeBerlakuUntuk): string {
  const m: Record<FeeBerlakuUntuk, string> = { per_transaksi: 'Per transaksi', per_order: 'Per order', per_bulan: 'Per bulan' }
  return m[bw] ?? bw
}

function fmtTgl(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function tipeBadgeStyle(tipe: FeeTipe): React.CSSProperties {
  const m: Record<FeeTipe, { bg: string; color: string; border: string }> = {
    persen:  { bg: '#E6F1FB', color: '#185FA5', border: '#85B7EB' },
    flat:    { bg: '#EEEDFE', color: '#534AB7', border: '#AFA9EC' },
    hybrid:  { bg: '#EAF3DE', color: '#3B6D11', border: '#97C459' },
    info:    { bg: '#f9f9f8', color: '#6b7280', border: 'rgba(0,0,0,0.12)' },
  }
  const t = m[tipe] ?? m.info
  return { background: t.bg, color: t.color, borderWidth: '0.5px', borderStyle: 'solid', borderColor: t.border, borderRadius: 100, padding: '2px 8px', fontSize: 11, fontWeight: 500, display: 'inline-block' }
}

// ─── Chip jadwal notifikasi (G30) ─────────────────────────────────────────────

const DEFAULT_NOTIF_DAYS = [90, 60, 30, 7]
const NOTIF_OPTIONS      = [90, 60, 30, 14, 7]

function NotifChips({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) {
  const toggle = (d: number) =>
    onChange(value.includes(d) ? value.filter(x => x !== d) : [...value, d])
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
      {NOTIF_OPTIONS.map(d => {
        const on = value.includes(d)
        return (
          <button key={d} onClick={() => toggle(d)} style={{ padding: '3px 10px', borderRadius: 100, fontSize: 12, cursor: 'pointer', borderWidth: '0.5px', borderStyle: 'solid', background: on ? '#E6F1FB' : '#f9f9f8', color: on ? '#185FA5' : '#6b7280', borderColor: on ? '#85B7EB' : 'rgba(0,0,0,0.12)' }}>
            {d} hari
          </button>
        )
      })}
      <span style={{ fontSize: 11, color: '#9ca3af', alignSelf: 'center' }}>Via WA Fonnte</span>
    </div>
  )
}

// ─── L-07 FeeSimulator — kalkulasi dari feeAktif di state (tidak hardcode) ───

function FeeSimulator({ feeAktif }: { feeAktif: FeeAktif[] }) {
  const [gmv,    setGmv]    = useState(0)
  const [orders, setOrders] = useState(0)

  const result = hitungSimulasiFee({ gmv, orders, fees: feeAktif })

  return (
    <div style={{ ...S.card, padding: '14px 16px', marginTop: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, fontWeight: 500, fontSize: 13 }}>
        <i className="ti ti-calculator" style={{ color: '#185FA5', fontSize: 16 }} />
        Simulator kalkulasi biaya
      </div>
      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
        Masukkan estimasi GMV dan jumlah transaksi untuk melihat perkiraan biaya.
      </div>
      <div style={{ ...S.grid2, marginBottom: 12 }}>
        <FF label="GMV (nilai transaksi kotor)">
          <input type="number" value={gmv || ''} onChange={e => setGmv(Number(e.target.value))} placeholder="Contoh: 100000000" style={S.input(true)} />
          <span style={S.help}>Contoh: 100000000 = Rp100 juta</span>
        </FF>
        <FF label="Jumlah order sukses">
          <input type="number" value={orders || ''} onChange={e => setOrders(Number(e.target.value))} placeholder="Contoh: 80" style={S.input(true)} />
        </FF>
      </div>
      {(gmv > 0 || orders > 0) && (
        <div style={{ background: '#fff', borderWidth: '0.5px', borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.12)', borderRadius: 8, padding: '12px 14px', marginBottom: 8 }}>
          {result.baris.map(b => (
            <div key={b.fee_key} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottomWidth: '0.5px', borderBottomStyle: 'solid', borderBottomColor: 'rgba(0,0,0,0.12)', fontSize: 13 }}>
              <span style={{ color: '#6b7280' }}>{b.nama_biaya} ({b.rumus})</span>
              <span>{rpFmt(b.nilai)}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0 0', fontSize: 13, fontWeight: 500 }}>
            <span>Total estimasi biaya</span>
            <span style={{ color: '#185FA5' }}>{rpFmt(result.total)}</span>
          </div>
        </div>
      )}
      <div style={{ background: '#EAF3DE', borderRadius: 8, padding: '6px 10px', fontSize: 11, color: '#6b7280', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
        <i className="ti ti-info-circle" style={{ color: '#3B6D11', flexShrink: 0, marginTop: 1 }} />
        Semua biaya sudah termasuk PPN (inklusif). e-Faktur terbit otomatis tiap akhir bulan untuk tenant PKP.
      </div>
    </div>
  )
}

// ─── Komponen utama ───────────────────────────────────────────────────────────

export function TabKontrakSewa({ tenant, onRefresh }: Props) {
  const initial = buildDraft(tenant)

  // ── Section A/B/D draft state ──
  const [draft,    setDraft]    = useState<KontrakDraft>(initial)
  const [baseline, setBaseline] = useState<KontrakDraft>(JSON.parse(JSON.stringify(initial)))
  const [saving,   setSaving]   = useState(false)

  const hasChanges = detectHasChanges(draft, baseline)

  const set = useCallback(<K extends keyof KontrakDraft>(k: K, v: KontrakDraft[K]) => {
    setDraft(d => ({ ...d, [k]: v }))
  }, [])

  // ── L-01: state fee aktif ──
  const [feeData,    setFeeData]    = useState<FeeListResponse | null>(null)
  const [feeLoading, setFeeLoading] = useState(true)
  const [feeError,   setFeeError]   = useState<string | null>(null)

  // ── L-02: state inline form ──
  const [editingFeeKey, setEditingFeeKey] = useState<string | null>(null)
  const [showAddForm,   setShowAddForm]   = useState(false)
  const [inlineForm,    setInlineForm]    = useState<Partial<TambahFeePayload>>({})
  const [inlineLoading, setInlineLoading] = useState(false)

  // ── L-08: state riwayat ──
  const [historyData,    setHistoryData]    = useState<FeeHistoryResponse | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyExpanded, setHistoryExpanded] = useState(false)

  // ── L-01: fetch fee aktif saat mount ──
  const fetchFee = useCallback(async () => {
    setFeeLoading(true)
    setFeeError(null)
    try {
      const res  = await fetch(`/api/superadmin/tenants/${tenant.id}/fees`)
      const json = await res.json()
      if (!json.success) throw new Error(json.message ?? 'Gagal memuat data fee')
      setFeeData(json.data as FeeListResponse)
    } catch (e) {
      setFeeError(e instanceof Error ? e.message : 'Gagal memuat data fee')
    } finally {
      setFeeLoading(false)
    }
  }, [tenant.id])

  useEffect(() => { void fetchFee() }, [fetchFee])

  // ── L-08: fetch riwayat saat section E expand ──
  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const res  = await fetch(`/api/superadmin/tenants/${tenant.id}/fees/history`)
      const json = await res.json()
      if (!json.success) throw new Error(json.message ?? 'Gagal memuat riwayat')
      setHistoryData(json.data as FeeHistoryResponse)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal memuat riwayat')
    } finally {
      setHistoryLoading(false)
    }
  }, [tenant.id])

  const handleSectionEExpand = () => {
    setHistoryExpanded(v => {
      if (!v && !historyData) void fetchHistory()
      return !v
    })
  }

  // ── L-05: handler klik edit baris ──
  const handleEditRow = (fee: FeeAktif) => {
    if (fee.tipe === 'info') return
    setEditingFeeKey(fee.fee_key)
    setShowAddForm(false)
    setInlineForm({
      fee_key:       fee.fee_key,
      nama_biaya:    fee.nama_biaya,
      tipe:          fee.tipe,
      nilai_persen:  fee.nilai_persen ?? undefined,
      nilai_flat:    fee.nilai_flat   ?? undefined,
      nilai_maks:    fee.nilai_maks   ?? undefined,
      berlaku_untuk: fee.berlaku_untuk,
      ppn_inklusif:  fee.ppn_inklusif,
      passthrough:   fee.passthrough,
      berlaku_mulai: '',
      alasan:        '',
    })
  }

  // ── L-05 + L-06: handler POST ke API ──
  const handleInlineSubmit = async () => {
    if (!inlineForm.berlaku_mulai) {
      toast.error('Tanggal berlaku mulai wajib diisi')
      return
    }
    setInlineLoading(true)
    try {
      const payload: TambahFeePayload = {
        fee_key:       inlineForm.fee_key       ?? '',
        nama_biaya:    inlineForm.nama_biaya    ?? '',
        tipe:          inlineForm.tipe          ?? 'persen',
        nilai_persen:  inlineForm.nilai_persen,
        nilai_flat:    inlineForm.nilai_flat,
        nilai_maks:    inlineForm.nilai_maks,
        berlaku_untuk: inlineForm.berlaku_untuk ?? 'per_transaksi',
        ppn_inklusif:  inlineForm.ppn_inklusif  ?? true,
        passthrough:   inlineForm.passthrough   ?? false,
        berlaku_mulai: inlineForm.berlaku_mulai,
        alasan:        inlineForm.alasan,
      }
      const res  = await fetch(`/api/superadmin/tenants/${tenant.id}/fees`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message)
      toast.success('Perubahan biaya dijadwalkan')
      setEditingFeeKey(null)
      setShowAddForm(false)
      setInlineForm({})
      await fetchFee()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal menyimpan')
    } finally {
      setInlineLoading(false)
    }
  }

  const handleInlineCancel = () => {
    setEditingFeeKey(null)
    setShowAddForm(false)
    setInlineForm({})
  }

  // ── Section A/B/D save ──
  const handleCancel = () => { setDraft(JSON.parse(JSON.stringify(baseline))) }

  const handleSave = async () => {
    const diff = buildDiffPayload(draft, baseline)
    if (Object.keys(diff).length === 0) return
    setSaving(true)
    try {
      const res  = await fetch(`/api/superadmin/tenants/${tenant.id}?section=contract`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(diff),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message)
      toast.success('Kontrak berhasil diperbarui')
      setBaseline(JSON.parse(JSON.stringify(draft)))
      onRefresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal menyimpan')
    } finally {
      setSaving(false)
    }
  }

  const days = daysUntil(tenant.contract_end_date)

  const CONTRACT_STATUS_LABEL: Record<string, string> = {
    draft: 'Draft', aktif: 'Aktif', kedaluwarsa: 'Kedaluwarsa',
    dihentikan_awal: 'Dihentikan Awal', diperbarui: 'Diperbarui',
  }

  // ── Derivasi banner G22 dari feeData ──
  const bannerKomisi  = feeData?.aktif.find(f => f.fee_key === 'komisi_platform')
  const bannerProses  = feeData?.aktif.find(f => f.fee_key === 'biaya_proses_order')
  const bannerTeks    = feeData
    ? [bannerKomisi ? `Komisi platform ${fmtNilai(bannerKomisi)} per transaksi` : null,
       bannerProses  ? `${fmtNilai(bannerProses)} biaya proses per order sukses` : null]
        .filter(Boolean).join(' + ') || 'Lihat tabel biaya di bawah'
    : '…'

  // ── today untuk min date H+1 ──
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>

      {/* Info bar */}
      <div style={{ background: '#E6F1FB', border: '0.5px solid #85B7EB', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#0C447C', marginBottom: 10, display: 'flex', alignItems: 'flex-start', gap: 8, lineHeight: 1.5 }}>
        <i className="ti ti-pencil" style={{ marginTop: 1, flexShrink: 0 }} />
        <span>Semua section bisa langsung diisi atau diubah sekaligus. Perubahan disimpan bersama lewat tombol di footer. Field terkunci (nomor kontrak, status) tetap read-only.</span>
      </div>

      {/* G23 — Renewal Warning */}
      {days !== null && days <= 30 && days >= 0 && (
        <div style={{ background: '#FAEEDA', borderWidth: '0.5px', borderStyle: 'solid', borderColor: '#EF9F27', borderRadius: 8, padding: '8px 14px', fontSize: 12, color: '#854F0B', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="ti ti-clock-exclamation" />
          Kontrak berakhir dalam <strong>{days} hari</strong> ({fmt(tenant.contract_end_date)}).
          Notifikasi renewal akan dikirim {tenant.renewal_notice_days} hari sebelumnya.
        </div>
      )}

      {/* L-03 — G22 Contract Summary Banner (dinamis dari feeData) */}
      <div style={{ background: '#EAF3DE', borderWidth: '0.5px', borderStyle: 'solid', borderColor: '#97C459', borderRadius: 12, padding: '14px 18px', marginBottom: '1rem' }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: '#3B6D11', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
          <i className="ti ti-receipt" style={{ fontSize: 13 }} />
          Ringkasan biaya berlaku saat ini
        </div>
        {feeLoading ? (
          <div style={{ fontSize: 13, color: '#6b7280' }}>Memuat data biaya…</div>
        ) : feeError ? (
          <div style={{ fontSize: 13, color: '#A32D2D' }}>{feeError}</div>
        ) : (
          <>
            <div style={{ fontSize: 14, color: '#27500A', lineHeight: 1.6 }}>{bannerTeks}</div>
            {bannerKomisi?.ppn_inklusif && (
              <div style={{ fontSize: 12, color: '#3B6D11', marginTop: 4 }}>
                PPN sudah termasuk dalam seluruh biaya di atas ·
                e-Faktur terbit otomatis tiap akhir bulan (status PKP aktif)
              </div>
            )}
          </>
        )}
      </div>

      {/* Section A */}
      <Accordion icon="ti-file-description" iconBg="#E6F1FB" iconColor="#185FA5" title="Section A — Kontrak master" defaultOpen>
        <div style={{ ...S.grid2, marginTop: 12 }}>
          <FRO label="Nomor kontrak" value={tenant.contract_number ?? 'Auto-generated'} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={S.label}>Status kontrak</label>
            <input readOnly value={tenant.contract_status ? CONTRACT_STATUS_LABEL[tenant.contract_status] ?? tenant.contract_status : '—'} style={{ ...S.input(false), color: tenant.contract_status === 'aktif' ? '#3B6D11' : undefined, fontWeight: tenant.contract_status === 'aktif' ? 500 : undefined }} />
          </div>
          <FF label="Tanggal mulai *">
            <input type="date" value={draft.contract_start_date} onChange={e => set('contract_start_date', e.target.value)} style={S.input(true)} />
          </FF>
          <FF label="Tanggal berakhir">
            <input type="date" value={draft.contract_end_date} onChange={e => set('contract_end_date', e.target.value)} style={S.input(true)} />
            <span style={S.help}>Kosongkan untuk kontrak permanen / tanpa batas waktu</span>
          </FF>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={S.label}>File lampiran kontrak</label>
            {tenant.contract_file_url ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <i className="ti ti-file-type-pdf" style={{ color: '#A32D2D', fontSize: 18 }} />
                <a href={tenant.contract_file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: '#185FA5' }}>Lihat kontrak PDF</a>
                <button style={{ padding: '3px 8px', fontSize: 11, borderRadius: 8, cursor: 'pointer', borderWidth: '0.5px', borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.22)', background: 'transparent', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <i className="ti ti-upload" /> Ganti
                </button>
              </div>
            ) : (
              <button style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', fontSize: 12, borderRadius: 8, borderWidth: '0.5px', borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.22)', background: 'transparent', cursor: 'pointer', alignSelf: 'flex-start' }}>
                <i className="ti ti-upload" /> Upload PDF kontrak
              </button>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={S.label}>Tanda tangan digital</label>
            {tenant.contract_signed ? (
              <div style={{ ...S.input(false), display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="ti ti-signature" style={{ color: '#3B6D11' }} />
                Sudah ditandatangani {tenant.contract_signed_at ? `· ${fmt(tenant.contract_signed_at)}` : ''}
              </div>
            ) : (
              <div style={{ ...S.input(false), display: 'flex', alignItems: 'center', gap: 6, color: '#9ca3af' }}>
                <i className="ti ti-signature" /> Belum ditandatangani
              </div>
            )}
          </div>
        </div>
      </Accordion>

      {/* Section B */}
      <Accordion icon="ti-calendar-repeat" iconBg="#EEEDFE" iconColor="#534AB7" title="Section B — Biaya setup & langganan">
        <div style={{ ...S.grid2, marginTop: 12 }}>
          <FF label="Biaya awal / onboarding">
            <input type="number" value={draft.biaya_awal} onChange={e => set('biaya_awal', e.target.value)} placeholder="0 = tidak ada biaya awal" style={S.input(true)} />
            <span style={S.help}>Opsional. Biaya implementasi awal di luar biaya transaksi.</span>
          </FF>
          <FF label="Biaya langganan berkala">
            <input type="number" value={draft.biaya_langganan} onChange={e => set('biaya_langganan', e.target.value)} placeholder="0 = tidak ada langganan" style={S.input(true)} />
          </FF>
          <FSelect label="Siklus tagihan" value={draft.siklus_tagihan} onChange={v => set('siklus_tagihan', v)} options={[{ val: '', label: 'Tidak ada langganan' }, { val: 'bulanan', label: 'Bulanan' }, { val: 'kuartalan', label: 'Kuartalan' }, { val: 'tahunan', label: 'Tahunan' }]} />
          <FSelect label="Perlakuan pajak langganan" value={draft.pajak_langganan} onChange={v => set('pajak_langganan', v)} options={[{ val: 'inklusif', label: 'PPN Inklusif (termasuk PPN 11%)' }, { val: 'eksklusif', label: 'PPN Eksklusif (PPN ditambah di atas)' }]} />
        </div>
      </Accordion>

      {/* L-04 + L-05 + L-06 — Section C: Struktur Biaya Transaksi (dinamis) */}
      <Accordion icon="ti-percentage" iconBg="#EAF3DE" iconColor="#3B6D11"
        title="Section C — Struktur biaya transaksi" defaultOpen
        rightContent={
          <button
            onClick={() => { setShowAddForm(v => !v); setEditingFeeKey(null); setInlineForm({}) }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', fontSize: 12, borderRadius: 8, cursor: 'pointer', borderWidth: '0.5px', borderStyle: 'solid', borderColor: '#85B7EB', color: '#185FA5', background: '#E6F1FB' }}
          >
            <i className="ti ti-plus" /> Tambah baris
          </button>
        }
      >
        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8, marginTop: 12 }}>
          Setiap perubahan biaya wajib mengisi tanggal berlaku (tidak retroaktif).
        </div>

        {/* Fee Table */}
        {feeLoading ? (
          <div style={{ padding: '16px 0', fontSize: 13, color: '#6b7280' }}>Memuat data biaya…</div>
        ) : feeError ? (
          <div style={{ padding: '16px 0', fontSize: 13, color: '#A32D2D' }}>{feeError}</div>
        ) : !feeData || feeData.aktif.length === 0 ? (
          <div style={{ padding: '16px 0', fontSize: 13, color: '#6b7280' }}>Belum ada data biaya. Klik "+ Tambah baris" untuk menambahkan.</div>
        ) : (
          <div style={{ borderWidth: '0.5px', borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.12)', borderRadius: 8, overflow: 'hidden', marginBottom: 14 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f9f9f8' }}>
                  {['Nama biaya', 'Tipe', 'Nilai', 'Berlaku untuk', 'PPN', 'Berlaku mulai', 'Sumber', ''].map(h => (
                    <th key={h} style={{ padding: '8px 10px', fontSize: 11, fontWeight: 500, color: '#6b7280', textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {feeData.aktif.map((fee, i) => {
                  // Deteksi apakah baris ini "terjadwal" = berlaku_mulai > today
                  const isPending  = fee.berlaku_mulai > new Date().toISOString().split('T')[0]
                  const isEditing  = editingFeeKey === fee.fee_key
                  const rowBg      = isPending ? '#FFFBF0' : (i % 2 === 0 ? '#fff' : '#f9f9f8')

                  return (
                    <>
                      <tr
                        key={fee.fee_key}
                        style={{ borderTopWidth: '0.5px', borderTopStyle: 'solid', borderTopColor: 'rgba(0,0,0,0.12)', background: rowBg }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f9f9f8')}
                        onMouseLeave={e => (e.currentTarget.style.background = rowBg)}
                      >
                        <td style={{ padding: '9px 10px', fontWeight: 500 }}>
                          {fee.nama_biaya}
                          {isPending && (
                            <span style={{ display: 'inline-block', marginLeft: 6, padding: '1px 6px', borderRadius: 100, fontSize: 10, fontWeight: 500, background: '#FAEEDA', color: '#854F0B', borderWidth: '0.5px', borderStyle: 'solid', borderColor: '#EF9F27', verticalAlign: 'middle' }}>
                              Berlaku {fmtTgl(fee.berlaku_mulai)}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '9px 10px' }}>
                          <span style={tipeBadgeStyle(fee.tipe)}>{fmtTipeLabel(fee.tipe)}</span>
                        </td>
                        <td style={{ padding: '9px 10px', fontWeight: 500 }}>{fmtNilai(fee)}</td>
                        <td style={{ padding: '9px 10px', fontSize: 12, color: '#6b7280' }}>{fmtBerlakuUntuk(fee.berlaku_untuk)}</td>
                        <td style={{ padding: '9px 10px' }}>
                          {fee.tipe === 'info' ? (
                            <span style={{ color: '#9ca3af', fontSize: 11 }}>—</span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 6px', borderRadius: 100, fontSize: 10, fontWeight: 500, borderWidth: '0.5px', borderStyle: 'solid', background: fee.ppn_inklusif ? '#EAF3DE' : '#f9f9f8', color: fee.ppn_inklusif ? '#3B6D11' : '#6b7280', borderColor: fee.ppn_inklusif ? '#97C459' : 'rgba(0,0,0,0.12)' }}>
                              {fee.ppn_inklusif && <i className="ti ti-check" style={{ fontSize: 9 }} />}
                              {fee.ppn_inklusif ? 'Ya' : 'Tidak'}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '9px 10px', fontSize: 12, color: '#6b7280' }}>{fmtTgl(fee.berlaku_mulai)}</td>
                        <td style={{ padding: '9px 10px' }}>
                          {fee.sumber === 'platform_default' ? (
                            <span style={{ fontSize: 10, color: '#9ca3af', borderWidth: '0.5px', borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.12)', borderRadius: 100, padding: '1px 6px' }}>Platform</span>
                          ) : (
                            <span style={{ fontSize: 10, color: '#185FA5', borderWidth: '0.5px', borderStyle: 'solid', borderColor: '#85B7EB', borderRadius: 100, padding: '1px 6px', background: '#E6F1FB' }}>Tenant</span>
                          )}
                        </td>
                        <td style={{ padding: '9px 6px' }}>
                          {isPending ? (
                            <button
                              title="Batalkan jadwal"
                              style={{ padding: '3px 8px', fontSize: 11, borderWidth: '0.5px', borderStyle: 'solid', borderColor: '#EF9F27', borderRadius: 8, background: 'transparent', cursor: 'pointer', color: '#854F0B' }}
                            >
                              <i className="ti ti-trash" />
                            </button>
                          ) : fee.tipe !== 'info' ? (
                            <button
                              onClick={() => handleEditRow(fee)}
                              title="Jadwalkan perubahan"
                              style={{ padding: '3px 8px', fontSize: 11, borderWidth: '0.5px', borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.22)', borderRadius: 8, background: isEditing ? '#E6F1FB' : 'transparent', cursor: 'pointer', color: isEditing ? '#185FA5' : undefined }}
                            >
                              <i className="ti ti-edit" />
                            </button>
                          ) : null}
                        </td>
                      </tr>

                      {/* L-05 — Inline form edit (Opsi B: collapse di bawah baris) */}
                      {isEditing && (
                        <tr key={`${fee.fee_key}-inline`} style={{ background: '#F0F7FF' }}>
                          <td colSpan={8} style={{ padding: '12px 14px' }}>
                            <div style={{ fontSize: 12, fontWeight: 500, color: '#185FA5', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                              <i className="ti ti-calendar-event" />
                              Jadwalkan perubahan: {fee.nama_biaya}
                            </div>
                            <div style={{ ...S.grid2, marginBottom: 10 }}>
                              {/* Tampilkan nilai lama vs baru */}
                              <FF label="Nilai lama (berlaku saat ini)">
                                <input readOnly value={fmtNilai(fee)} style={S.input(false)} />
                              </FF>
                              {fee.tipe === 'persen' && (
                                <FF label="Nilai baru (%)">
                                  <input
                                    type="number" step="0.01" min="0" max="100"
                                    value={inlineForm.nilai_persen ?? ''}
                                    onChange={e => setInlineForm(f => ({ ...f, nilai_persen: Number(e.target.value) || undefined }))}
                                    placeholder="Contoh: 7.5"
                                    style={S.input(true)}
                                  />
                                </FF>
                              )}
                              {fee.tipe === 'flat' && (
                                <FF label="Nilai baru (Rp/order)">
                                  <input
                                    type="number" min="0"
                                    value={inlineForm.nilai_flat ?? ''}
                                    onChange={e => setInlineForm(f => ({ ...f, nilai_flat: Number(e.target.value) || undefined }))}
                                    placeholder="Contoh: 1500"
                                    style={S.input(true)}
                                  />
                                </FF>
                              )}
                              {fee.tipe === 'hybrid' && (
                                <>
                                  <FF label="Persen baru (%)">
                                    <input
                                      type="number" step="0.01" min="0"
                                      value={inlineForm.nilai_persen ?? ''}
                                      onChange={e => setInlineForm(f => ({ ...f, nilai_persen: Number(e.target.value) || undefined }))}
                                      placeholder={String(fee.nilai_persen ?? '')}
                                      style={S.input(true)}
                                    />
                                  </FF>
                                  <FF label="Flat baru (Rp)">
                                    <input
                                      type="number" min="0"
                                      value={inlineForm.nilai_flat ?? ''}
                                      onChange={e => setInlineForm(f => ({ ...f, nilai_flat: Number(e.target.value) || undefined }))}
                                      placeholder={String(fee.nilai_flat ?? '')}
                                      style={S.input(true)}
                                    />
                                  </FF>
                                </>
                              )}
                              <FF label="Berlaku mulai *">
                                <input
                                  type="date" min={tomorrowStr}
                                  value={inlineForm.berlaku_mulai ?? ''}
                                  onChange={e => setInlineForm(f => ({ ...f, berlaku_mulai: e.target.value }))}
                                  style={S.input(true)}
                                />
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, background: '#FAEEDA', color: '#854F0B', borderWidth: '0.5px', borderStyle: 'solid', borderColor: '#EF9F27', borderRadius: 8, padding: '3px 8px', marginTop: 2 }}>
                                  <i className="ti ti-info-circle" /> Tidak bisa retroaktif. Minimal H+1.
                                </div>
                              </FF>
                              <FF label="Alasan perubahan (opsional)">
                                <input
                                  type="text"
                                  value={inlineForm.alasan ?? ''}
                                  onChange={e => setInlineForm(f => ({ ...f, alasan: e.target.value }))}
                                  placeholder="Negosiasi ulang kontrak"
                                  style={S.input(true)}
                                />
                              </FF>
                            </div>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                              <button onClick={handleInlineCancel} style={{ padding: '5px 12px', fontSize: 12, borderRadius: 8, borderWidth: '0.5px', borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.22)', background: 'transparent', cursor: 'pointer' }}>
                                Batalkan
                              </button>
                              <button onClick={handleInlineSubmit} disabled={inlineLoading} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', fontSize: 12, borderRadius: 8, borderWidth: '0.5px', borderStyle: 'solid', borderColor: '#85B7EB', color: '#185FA5', background: '#E6F1FB', cursor: inlineLoading ? 'not-allowed' : 'pointer', opacity: inlineLoading ? 0.6 : 1 }}>
                                <i className="ti ti-device-floppy" />
                                {inlineLoading ? 'Menyimpan…' : 'Jadwalkan perubahan'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* L-06 — Form "+ Tambah baris" */}
        {showAddForm && (
          <div style={{ ...S.card, padding: '14px 16px', marginBottom: 14, background: '#F0F7FF' }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#185FA5', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="ti ti-plus" /> Tambah baris biaya baru
            </div>
            <div style={{ ...S.grid2, marginBottom: 10 }}>
              <FF label="Nama biaya *">
                <input
                  type="text"
                  value={inlineForm.nama_biaya ?? ''}
                  onChange={e => setInlineForm(f => ({ ...f, nama_biaya: e.target.value }))}
                  placeholder="Contoh: Biaya asuransi transaksi"
                  style={S.input(true)}
                />
              </FF>
              <FF label="Tipe biaya *">
                <select
                  value={inlineForm.tipe ?? ''}
                  onChange={e => setInlineForm(f => ({ ...f, tipe: e.target.value as FeeTipe }))}
                  style={S.input(true)}
                >
                  <option value="">— Pilih tipe —</option>
                  <option value="persen">% transaksi (persentase)</option>
                  <option value="flat">Flat per order (nominal)</option>
                  <option value="hybrid">Hybrid (% + flat)</option>
                  <option value="info">Info saja (tidak dihitung)</option>
                </select>
              </FF>
              {(inlineForm.tipe === 'persen' || inlineForm.tipe === 'hybrid') && (
                <FF label="Nilai persen (%)">
                  <input
                    type="number" step="0.01" min="0" max="100"
                    value={inlineForm.nilai_persen ?? ''}
                    onChange={e => setInlineForm(f => ({ ...f, nilai_persen: Number(e.target.value) || undefined }))}
                    placeholder="Contoh: 5"
                    style={S.input(true)}
                  />
                </FF>
              )}
              {(inlineForm.tipe === 'flat' || inlineForm.tipe === 'hybrid') && (
                <FF label="Nilai flat (Rp)">
                  <input
                    type="number" min="0"
                    value={inlineForm.nilai_flat ?? ''}
                    onChange={e => setInlineForm(f => ({ ...f, nilai_flat: Number(e.target.value) || undefined }))}
                    placeholder="Contoh: 500"
                    style={S.input(true)}
                  />
                </FF>
              )}
              <FF label="Berlaku untuk">
                <select
                  value={inlineForm.berlaku_untuk ?? 'per_transaksi'}
                  onChange={e => setInlineForm(f => ({ ...f, berlaku_untuk: e.target.value as FeeBerlakuUntuk }))}
                  style={S.input(true)}
                >
                  <option value="per_transaksi">Per transaksi</option>
                  <option value="per_order">Per order</option>
                  <option value="per_bulan">Per bulan</option>
                </select>
              </FF>
              <FF label="PPN inklusif">
                <select
                  value={String(inlineForm.ppn_inklusif ?? true)}
                  onChange={e => setInlineForm(f => ({ ...f, ppn_inklusif: e.target.value === 'true' }))}
                  style={S.input(true)}
                >
                  <option value="true">Ya (PPN sudah termasuk)</option>
                  <option value="false">Tidak (PPN dihitung terpisah)</option>
                </select>
              </FF>
              <FF label="Berlaku mulai *">
                <input
                  type="date" min={tomorrowStr}
                  value={inlineForm.berlaku_mulai ?? ''}
                  onChange={e => setInlineForm(f => ({ ...f, berlaku_mulai: e.target.value }))}
                  style={S.input(true)}
                />
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, background: '#FAEEDA', color: '#854F0B', borderWidth: '0.5px', borderStyle: 'solid', borderColor: '#EF9F27', borderRadius: 8, padding: '3px 8px', marginTop: 2 }}>
                  <i className="ti ti-info-circle" /> Tidak bisa retroaktif. Minimal H+1.
                </div>
              </FF>
              <FF label="Alasan (opsional)">
                <input
                  type="text"
                  value={inlineForm.alasan ?? ''}
                  onChange={e => setInlineForm(f => ({ ...f, alasan: e.target.value }))}
                  placeholder="Penambahan fee baru"
                  style={S.input(true)}
                />
              </FF>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={handleInlineCancel} style={{ padding: '5px 12px', fontSize: 12, borderRadius: 8, borderWidth: '0.5px', borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.22)', background: 'transparent', cursor: 'pointer' }}>
                Batalkan
              </button>
              <button onClick={handleInlineSubmit} disabled={inlineLoading} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', fontSize: 12, borderRadius: 8, borderWidth: '0.5px', borderStyle: 'solid', borderColor: '#85B7EB', color: '#185FA5', background: '#E6F1FB', cursor: inlineLoading ? 'not-allowed' : 'pointer', opacity: inlineLoading ? 0.6 : 1 }}>
                <i className="ti ti-device-floppy" />
                {inlineLoading ? 'Menyimpan…' : 'Simpan baris baru'}
              </button>
            </div>
          </div>
        )}
      </Accordion>

      {/* Section D */}
      <Accordion icon="ti-refresh" iconBg="#FAEEDA" iconColor="#854F0B" title="Section D — Perpanjangan & penghentian">
        <div style={{ ...S.grid2, marginTop: 12 }}>
          <FSelect label="Auto-renewal" value={String(draft.auto_renewal)} onChange={v => set('auto_renewal', v === 'true')} options={[{ val: 'true', label: 'Aktif' }, { val: 'false', label: 'Tidak aktif' }]} />
          <FF label="Periode pemberitahuan (hari)">
            <input type="number" value={draft.renewal_notice_days} onChange={e => set('renewal_notice_days', e.target.value)} style={S.input(true)} />
          </FF>
        </div>
        <div style={{ marginTop: 14 }}>
          <label style={S.label}>Jadwal notifikasi renewal (hari sebelum)</label>
          <NotifChips value={draft.notif_days} onChange={v => set('notif_days', v)} />
          <span style={S.help}>Klik untuk aktifkan/nonaktifkan hari tertentu.</span>
        </div>
        <div style={S.divider} />
        <div style={{ ...S.grid2 }}>
          <FF label="Denda penghentian awal (opsional)">
            <input type="number" value={draft.early_termination_fee} onChange={e => set('early_termination_fee', e.target.value)} placeholder="0 = tidak ada denda" style={S.input(true)} />
          </FF>
          <FF label="Kebijakan refund (teks)">
            <input type="text" value={draft.kebijakan_refund} onChange={e => set('kebijakan_refund', e.target.value)} style={S.input(true)} />
          </FF>
        </div>
      </Accordion>

      {/* L-08 — Section E: Riwayat Perubahan Biaya (dinamis dari API) */}
      <div style={{ border: '0.5px solid rgba(0,0,0,0.12)', borderRadius: 12, overflow: 'hidden', marginBottom: 10 }}>
        <div
          onClick={handleSectionEExpand}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', cursor: 'pointer', background: '#fff', userSelect: 'none' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#f9f9f8')}
          onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 500, fontSize: 14 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: '#F1EFE8', color: '#5F5E5A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>
              <i className="ti ti-history" />
            </div>
            Section E — Riwayat perubahan biaya
          </div>
          <i className="ti ti-chevron-down" style={{ fontSize: 16, color: '#6b7280', transform: historyExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </div>

        {historyExpanded && (
          <div style={{ padding: '0 16px 16px', background: '#fff' }}>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 12, marginBottom: 14 }}>
              Read-only. Tersimpan minimum 10 tahun.
            </div>

            {historyLoading ? (
              <div style={{ fontSize: 13, color: '#6b7280' }}>Memuat riwayat…</div>
            ) : !historyData || historyData.data.length === 0 ? (
              <div style={{ fontSize: 13, color: '#6b7280' }}>Belum ada riwayat perubahan biaya.</div>
            ) : (
              <>
                {historyData.data.map((h: TenantFeeHistory, i: number) => {
                  const nilaiLama = h.nilai_lama
                    ? (() => {
                        const n = h.nilai_lama
                        if (n.tipe === 'persen') return `${n.nilai_persen}%`
                        if (n.tipe === 'flat')   return `${rpFmt(n.nilai_flat ?? 0)}`
                        if (n.tipe === 'hybrid') return `${n.nilai_persen}% + ${rpFmt(n.nilai_flat ?? 0)}`
                        return '—'
                      })()
                    : null
                  const nilaiBaru = (() => {
                    const n = h.nilai_baru
                    if (n.tipe === 'persen') return `${n.nilai_persen}%`
                    if (n.tipe === 'flat')   return `${rpFmt(n.nilai_flat ?? 0)}`
                    if (n.tipe === 'hybrid') return `${n.nilai_persen}% + ${rpFmt(n.nilai_flat ?? 0)}`
                    return '—'
                  })()
                  const AKSI_COLOR: Record<string, string> = { tambah: '#3B6D11', ubah: '#185FA5', jadwalkan: '#854F0B', batalkan: '#A32D2D' }
                  const AKSI_BG:    Record<string, string> = { tambah: '#EAF3DE', ubah: '#E6F1FB', jadwalkan: '#FAEEDA', batalkan: '#FDE8E8' }
                  const AKSI_BORDER: Record<string, string> = { tambah: '#97C459', ubah: '#85B7EB', jadwalkan: '#EF9F27', batalkan: '#ECA9A9' }

                  return (
                    <div key={h.id} style={{ display: 'flex', gap: 12, paddingBottom: 20, position: 'relative' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 32, flexShrink: 0 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#97C459', borderWidth: '0.5px', borderStyle: 'solid', borderColor: '#3B6D11', zIndex: 1, marginTop: 3 }} />
                        {i < historyData.data.length - 1 && <div style={{ width: 1, background: 'rgba(0,0,0,0.12)', flex: 1, marginTop: 4 }} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>
                          {h.berlaku_mulai ? fmtTgl(h.berlaku_mulai) : fmtTgl(h.changed_at)}
                          {h.changed_by ? ` — oleh ${h.changed_by}` : ''}
                        </div>
                        <div style={{ fontSize: 12, color: '#1a1a1a' }}>
                          {h.nama_biaya}
                          {nilaiLama ? ` — ${nilaiLama} → ${nilaiBaru}` : ` — ditetapkan ${nilaiBaru}`}
                          <span style={{ display: 'inline-block', padding: '1px 6px', borderRadius: 100, fontSize: 10, fontWeight: 500, background: AKSI_BG[h.aksi] ?? '#f9f9f8', color: AKSI_COLOR[h.aksi] ?? '#6b7280', borderWidth: '0.5px', borderStyle: 'solid', borderColor: AKSI_BORDER[h.aksi] ?? 'rgba(0,0,0,0.12)', marginLeft: 6, verticalAlign: 'middle', textTransform: 'capitalize' }}>{h.aksi}</span>
                        </div>
                        {h.alasan && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>Alasan: {h.alasan}</div>}
                      </div>
                    </div>
                  )
                })}
                {historyData.total > historyData.data.length && (
                  <button style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#185FA5', background: 'transparent', borderWidth: 0, cursor: 'pointer', padding: 0 }}>
                    <i className="ti ti-list" /> Lihat selengkapnya ({historyData.total} total)
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* L-07 — FeeSimulator (kalkulasi dari feeAktif state, bukan hardcode) */}
      <FeeSimulator feeAktif={feeData?.aktif ?? []} />

      {/* Footer sticky: Simpan + Batalkan (Section A/B/D) */}
      <div style={{ position: 'sticky', bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', marginTop: 4, borderTop: '0.5px solid rgba(0,0,0,0.22)', background: 'rgba(249,249,248,0.97)', backdropFilter: 'blur(4px)' }}>
        <span style={{ fontSize: 11, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 5 }}>
          <i className="ti ti-pin" />
          {hasChanges ? <span style={{ fontWeight: 500, color: '#854F0B' }}>Ada perubahan yang belum disimpan</span> : 'Tidak ada perubahan'}
        </span>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleCancel} disabled={!hasChanges || saving}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, fontSize: 13, border: '0.5px solid rgba(0,0,0,0.22)', color: '#1a1a1a', background: 'transparent', cursor: (!hasChanges || saving) ? 'not-allowed' : 'pointer', opacity: (!hasChanges || saving) ? 0.5 : 1 }}
          >
            Batalkan
          </button>
          <button
            onClick={handleSave} disabled={!hasChanges || saving}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, fontSize: 13, border: '0.5px solid #85B7EB', color: '#185FA5', background: '#E6F1FB', cursor: (!hasChanges || saving) ? 'not-allowed' : 'pointer', opacity: (!hasChanges || saving) ? 0.5 : 1 }}
          >
            <i className="ti ti-device-floppy" />
            {saving ? 'Menyimpan...' : 'Simpan perubahan'}
          </button>
        </div>
      </div>

    </div>
  )
}
