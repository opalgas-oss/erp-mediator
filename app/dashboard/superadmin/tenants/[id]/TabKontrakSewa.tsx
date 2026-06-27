'use client'

// app/dashboard/superadmin/tenants/[id]/TabKontrakSewa.tsx
// Tab Kontrak Sewa — pola simpan terpadu (refactor S#318 — H-DRY-TENANT-TABS Blok C)
//
// Dibuat:   Sesi #132 — M6 FASE 3 Step 3.7
// Updated:  Sesi #141 — M6 Fix Fase B
// Refactor: Sesi #318 — C-01: ganti editingCluster per-section
//           → draft + baseline + detectHasChanges (pola sama TabInfoUmum S#312)
//   - Hapus: editingCluster, BtnEdit, openEdit, cancel, isA/isB/isD
//   - Semua field langsung editable (tanpa tombol Edit per-section)
//   - Footer sticky bottom-0: Simpan + Batalkan, nonaktif saat !hasChanges
//   - handleSave kirim DIFF only via buildDiffPayload

import { useState, useCallback }          from 'react'
import { toast }                           from 'sonner'
import type { Tenant }                     from '@/lib/types/tenant.types'
import { Accordion as AccordionBase }      from './_shared/tenant-tab-ui'
import { FInput, FSelect }                 from './_shared/tenant-tab-ui'
import { formatDateIdLong }                from '@/lib/utils-client'

interface Props { tenant: Tenant; onRefresh: () => void }

// ─── KontrakDraft — semua field yang bisa diubah ──────────────────────────────

interface KontrakDraft {
  // Section A
  contract_start_date:    string
  contract_end_date:      string
  // Section B
  biaya_awal:             string
  biaya_langganan:        string
  siklus_tagihan:         string
  pajak_langganan:        string
  // Section D
  auto_renewal:           boolean
  renewal_notice_days:    string
  notif_days:             number[]
  early_termination_fee:  string
  kebijakan_refund:       string
}

// ─── buildDraft — inisialisasi draft dari data tenant ─────────────────────────

function buildDraft(t: Tenant): KontrakDraft {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const x = t as any // field kontrak belum semua masuk Tenant interface
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

// ─── detectHasChanges ─────────────────────────────────────────────────────────

function detectHasChanges(draft: KontrakDraft, baseline: KontrakDraft): boolean {
  const keys = Object.keys(draft) as (keyof KontrakDraft)[]
  return keys.some(k => {
    if (k === 'notif_days') {
      return JSON.stringify(draft.notif_days) !== JSON.stringify(baseline.notif_days)
    }
    return String(draft[k]) !== String(baseline[k])
  })
}

// ─── buildDiffPayload — hanya field yang berubah ─────────────────────────────

function buildDiffPayload(
  draft:    KontrakDraft,
  baseline: KontrakDraft,
): Record<string, unknown> {
  const diff: Record<string, unknown> = {}
  const keys = Object.keys(draft) as (keyof KontrakDraft)[]

  for (const k of keys) {
    const changed = k === 'notif_days'
      ? JSON.stringify(draft.notif_days) !== JSON.stringify(baseline.notif_days)
      : String(draft[k]) !== String(baseline[k])

    if (!changed) continue

    if (k === 'auto_renewal') {
      diff[k] = draft.auto_renewal
    } else if (k === 'notif_days') {
      diff[k] = draft.notif_days
    } else {
      diff[k] = draft[k]
    }
  }

  return diff
}

// ─── Shared style helpers ─────────────────────────────────────────────────────

const S = {
  card:   { background: '#fff', border: '0.5px solid rgba(0,0,0,0.12)', borderRadius: 12 } as React.CSSProperties,
  grid2:  { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px' } as React.CSSProperties,
  label:  { fontSize: 12, color: '#6b7280' } as React.CSSProperties,
  input:  (editable: boolean): React.CSSProperties => ({
    fontSize: 13, padding: '7px 10px', borderWidth: '0.5px', borderStyle: 'solid',
    borderColor: 'rgba(0,0,0,0.12)', borderRadius: 8, width: '100%', fontFamily: 'inherit',
    background: editable ? '#fff' : '#f9f9f8', color: editable ? '#1a1a1a' : '#6b7280',
  }),
  help:    { fontSize: 11, color: '#9ca3af', marginTop: 2 } as React.CSSProperties,
  divider: { height: '0.5px', background: 'rgba(0,0,0,0.12)', margin: '14px 0' } as React.CSSProperties,
}

// ─── Accordion wrapper (passthrough ke AccordionBase atau custom dengan rightContent) ──

function Accordion({ icon, iconBg, iconColor, title, defaultOpen, rightContent, children }: {
  icon:          string
  iconBg:        string
  iconColor:     string
  title:         string
  defaultOpen?:  boolean
  rightContent?: React.ReactNode
  children:      React.ReactNode
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
          <i
            className="ti ti-chevron-down"
            onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
            style={{ fontSize: 16, color: '#6b7280', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', cursor: 'pointer' }}
          />
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
  const diff = new Date(d).getTime() - Date.now()
  return Math.ceil(diff / 86400000)
}

function rpFmt(n: number): string {
  return 'Rp' + n.toLocaleString('id-ID')
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
          <button key={d} onClick={() => toggle(d)} style={{
            padding: '3px 10px', borderRadius: 100, fontSize: 12, cursor: 'pointer',
            borderWidth: '0.5px', borderStyle: 'solid',
            background:   on ? '#E6F1FB' : '#f9f9f8',
            color:        on ? '#185FA5' : '#6b7280',
            borderColor:  on ? '#85B7EB' : 'rgba(0,0,0,0.12)',
          }}>
            {d} hari
          </button>
        )
      })}
      <span style={{ fontSize: 11, color: '#9ca3af', alignSelf: 'center' }}>Via WA Fonnte</span>
    </div>
  )
}

// ─── FeeSimulator (G27) — tidak masuk draft/save ──────────────────────────────

function FeeSimulator() {
  const [gmv,    setGmv]    = useState(0)
  const [orders, setOrders] = useState(0)

  const komisiRate = 8
  const prosesFlat = 1250
  const gwPercent  = 0.7
  const gwFlat     = 500

  const komisi  = gmv * (komisiRate / 100)
  const proses  = orders * prosesFlat
  const gateway = gmv * (gwPercent / 100) + orders * gwFlat
  const total   = komisi + proses + gateway

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
          {[
            { label: `Komisi platform (${komisiRate}%)`, val: komisi },
            { label: `Biaya proses order (${rpFmt(prosesFlat)} × ${orders})`, val: proses },
            { label: `Biaya gateway Xendit (${gwPercent}% + ${rpFmt(gwFlat)}/order)`, val: gateway },
          ].map(({ label, val }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottomWidth: '0.5px', borderBottomStyle: 'solid', borderBottomColor: 'rgba(0,0,0,0.12)', fontSize: 13 }}>
              <span style={{ color: '#6b7280' }}>{label}</span>
              <span>{rpFmt(val)}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0 0', fontSize: 13, fontWeight: 500 }}>
            <span>Total estimasi biaya</span>
            <span style={{ color: '#185FA5' }}>{rpFmt(total)}</span>
          </div>
        </div>
      )}

      <div style={{ background: '#EAF3DE', borderRadius: 8, padding: '6px 10px', fontSize: 11, color: '#6b7280', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
        <i className="ti ti-info-circle" style={{ color: '#3B6D11', flexShrink: 0, marginTop: 1 }} />
        Semua biaya sudah termasuk PPN 11% (inklusif). e-Faktur terbit otomatis tiap akhir bulan untuk tenant PKP.
      </div>
    </div>
  )
}

// ─── Komponen utama ───────────────────────────────────────────────────────────

export function TabKontrakSewa({ tenant, onRefresh }: Props) {
  const initial = buildDraft(tenant)

  const [draft,    setDraft]    = useState<KontrakDraft>(initial)
  const [baseline, setBaseline] = useState<KontrakDraft>(JSON.parse(JSON.stringify(initial)))
  const [saving,   setSaving]   = useState(false)

  const hasChanges = detectHasChanges(draft, baseline)

  const set = useCallback(<K extends keyof KontrakDraft>(k: K, v: KontrakDraft[K]) => {
    setDraft(d => ({ ...d, [k]: v }))
  }, [])

  const handleCancel = () => {
    setDraft(JSON.parse(JSON.stringify(baseline)))
  }

  const handleSave = async () => {
    const diff = buildDiffPayload(draft, baseline)
    if (Object.keys(diff).length === 0) return

    setSaving(true)
    try {
      const res  = await fetch(`/api/superadmin/tenants/${tenant.id}?section=contract`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(diff),
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>

      {/* Info bar: panduan penggunaan */}
      <div style={{ background: '#E6F1FB', border: '0.5px solid #85B7EB', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#0C447C', marginBottom: 10, display: 'flex', alignItems: 'flex-start', gap: 8, lineHeight: 1.5 }}>
        <i className="ti ti-pencil" style={{ marginTop: 1, flexShrink: 0 }} />
        <span>Semua section bisa langsung diisi atau diubah sekaligus. Perubahan disimpan bersama lewat tombol di footer. Field terkunci (nomor kontrak, status) tetap read-only.</span>
      </div>

      {/* G23 — Renewal Warning (kondisional <= 30 hari) */}
      {days !== null && days <= 30 && days >= 0 && (
        <div style={{ background: '#FAEEDA', borderWidth: '0.5px', borderStyle: 'solid', borderColor: '#EF9F27', borderRadius: 8, padding: '8px 14px', fontSize: 12, color: '#854F0B', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="ti ti-clock-exclamation" />
          Kontrak berakhir dalam <strong>{days} hari</strong> ({fmt(tenant.contract_end_date)}).
          Notifikasi renewal akan dikirim {tenant.renewal_notice_days} hari sebelumnya.
        </div>
      )}

      {/* G22 — Contract Summary Banner */}
      <div style={{ background: '#EAF3DE', borderWidth: '0.5px', borderStyle: 'solid', borderColor: '#97C459', borderRadius: 12, padding: '14px 18px', marginBottom: '1rem' }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: '#3B6D11', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
          <i className="ti ti-receipt" style={{ fontSize: 13 }} />
          Ringkasan biaya berlaku saat ini
        </div>
        <div style={{ fontSize: 14, color: '#27500A', lineHeight: 1.6 }}>
          Komisi platform 8% per transaksi + Rp1.250 biaya proses per order sukses
        </div>
        <div style={{ fontSize: 12, color: '#3B6D11', marginTop: 4 }}>
          PPN 11% sudah termasuk dalam seluruh biaya di atas ·
          e-Faktur terbit otomatis tiap akhir bulan (status PKP aktif)
        </div>
      </div>

      {/* Section A: Kontrak Master */}
      <Accordion icon="ti-file-description" iconBg="#E6F1FB" iconColor="#185FA5"
        title="Section A — Kontrak master" defaultOpen
      >
        <div style={{ ...S.grid2, marginTop: 12 }}>
          <FRO label="Nomor kontrak" value={tenant.contract_number ?? 'Auto-generated'} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={S.label}>Status kontrak</label>
            <input
              readOnly
              value={tenant.contract_status ? CONTRACT_STATUS_LABEL[tenant.contract_status] ?? tenant.contract_status : '—'}
              style={{
                ...S.input(false),
                color:      tenant.contract_status === 'aktif' ? '#3B6D11' : undefined,
                fontWeight: tenant.contract_status === 'aktif' ? 500 : undefined,
              }}
            />
          </div>

          <FF label="Tanggal mulai *">
            <input
              type="date"
              value={draft.contract_start_date}
              onChange={e => set('contract_start_date', e.target.value)}
              style={S.input(true)}
            />
          </FF>
          <FF label="Tanggal berakhir">
            <input
              type="date"
              value={draft.contract_end_date}
              onChange={e => set('contract_end_date', e.target.value)}
              style={S.input(true)}
            />
            <span style={S.help}>Kosongkan untuk kontrak permanen / tanpa batas waktu</span>
          </FF>

          {/* G28 — Upload file kontrak */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={S.label}>File lampiran kontrak</label>
            {tenant.contract_file_url ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <i className="ti ti-file-type-pdf" style={{ color: '#A32D2D', fontSize: 18 }} />
                <a href={tenant.contract_file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: '#185FA5' }}>
                  Lihat kontrak PDF
                </a>
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

          {/* G29 — Tanda tangan digital */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={S.label}>Tanda tangan digital</label>
            {tenant.contract_signed ? (
              <div style={{ ...S.input(false), display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="ti ti-signature" style={{ color: '#3B6D11' }} />
                Sudah ditandatangani {tenant.contract_signed_at ? `· ${fmt(tenant.contract_signed_at)}` : ''}
              </div>
            ) : (
              <div style={{ ...S.input(false), display: 'flex', alignItems: 'center', gap: 6, color: '#9ca3af' }}>
                <i className="ti ti-signature" />
                Belum ditandatangani
              </div>
            )}
          </div>
        </div>
      </Accordion>

      {/* Section B: Biaya Setup & Langganan */}
      <Accordion icon="ti-calendar-repeat" iconBg="#EEEDFE" iconColor="#534AB7"
        title="Section B — Biaya setup & langganan"
      >
        <div style={{ ...S.grid2, marginTop: 12 }}>
          <FF label="Biaya awal / onboarding">
            <input
              type="number"
              value={draft.biaya_awal}
              onChange={e => set('biaya_awal', e.target.value)}
              placeholder="0 = tidak ada biaya awal"
              style={S.input(true)}
            />
            <span style={S.help}>Opsional. Biaya implementasi awal di luar biaya transaksi.</span>
          </FF>
          <FF label="Biaya langganan berkala">
            <input
              type="number"
              value={draft.biaya_langganan}
              onChange={e => set('biaya_langganan', e.target.value)}
              placeholder="0 = tidak ada langganan"
              style={S.input(true)}
            />
          </FF>
          <FSelect
            label="Siklus tagihan"
            value={draft.siklus_tagihan}
            onChange={v => set('siklus_tagihan', v)}
            options={[
              { val: '',           label: 'Tidak ada langganan' },
              { val: 'bulanan',    label: 'Bulanan' },
              { val: 'kuartalan',  label: 'Kuartalan' },
              { val: 'tahunan',    label: 'Tahunan' },
            ]}
          />
          <FSelect
            label="Perlakuan pajak langganan"
            value={draft.pajak_langganan}
            onChange={v => set('pajak_langganan', v)}
            options={[
              { val: 'inklusif',  label: 'PPN Inklusif (termasuk PPN 11%)' },
              { val: 'eksklusif', label: 'PPN Eksklusif (PPN ditambah di atas)' },
            ]}
          />
        </div>
      </Accordion>

      {/* Section C: Struktur Biaya Transaksi — tetap pakai pendekatan terpisah */}
      <Accordion icon="ti-percentage" iconBg="#EAF3DE" iconColor="#3B6D11"
        title="Section C — Struktur biaya transaksi" defaultOpen
        rightContent={
          <button style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', fontSize: 12, borderRadius: 8, cursor: 'pointer', borderWidth: '0.5px', borderStyle: 'solid', borderColor: '#85B7EB', color: '#185FA5', background: '#E6F1FB' }}>
            <i className="ti ti-plus" /> Tambah baris
          </button>
        }
      >
        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8, marginTop: 12 }}>
          Setiap perubahan biaya wajib mengisi tanggal berlaku (tidak retroaktif).
        </div>

        {/* Fee table */}
        <div style={{ borderWidth: '0.5px', borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.12)', borderRadius: 8, overflow: 'hidden', marginBottom: 14 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9f9f8' }}>
                {['Nama biaya', 'Tipe', 'Nilai', 'Berlaku untuk', 'PPN', 'Berlaku mulai', ''].map(h => (
                  <th key={h} style={{ padding: '8px 10px', fontSize: 11, fontWeight: 500, color: '#6b7280', textAlign: 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { nama: 'Komisi platform',     tipe: '% transaksi', tipeBg: '#E6F1FB', tipeColor: '#185FA5', tipeBorder: '#85B7EB',              nilai: '8%',            bw: 'Per transaksi', ppn: true,  tgl: '1 Jan 2026' },
                { nama: 'Biaya proses order',  tipe: 'Flat/order',  tipeBg: '#EEEDFE', tipeColor: '#534AB7', tipeBorder: '#AFA9EC',              nilai: 'Rp1.250/order', bw: 'Per order',     ppn: true,  tgl: '1 Jan 2026' },
                { nama: 'Biaya gateway Xendit',tipe: 'Hybrid',      tipeBg: '#EAF3DE', tipeColor: '#3B6D11', tipeBorder: '#97C459',              nilai: '0.7% + Rp500',  bw: 'Per transaksi', ppn: false, tgl: '1 Jan 2026', alt: true },
                { nama: 'PPN (informasi)',      tipe: 'Info saja',   tipeBg: '#f9f9f8', tipeColor: '#6b7280', tipeBorder: 'rgba(0,0,0,0.12)',    nilai: '11% efektif (inklusif)', bw: 'Semua', ppn: null,  tgl: '—' },
              ].map((row, i) => (
                <tr
                  key={i}
                  style={{ borderTopWidth: '0.5px', borderTopStyle: 'solid', borderTopColor: 'rgba(0,0,0,0.12)', background: row.alt ? '#f9f9f8' : '#fff' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f9f9f8')}
                  onMouseLeave={e => (e.currentTarget.style.background = row.alt ? '#f9f9f8' : '#fff')}
                >
                  <td style={{ padding: '9px 10px', fontWeight: 500 }}>{row.nama}</td>
                  <td style={{ padding: '9px 10px' }}>
                    <span style={{ background: row.tipeBg, color: row.tipeColor, borderWidth: '0.5px', borderStyle: 'solid', borderColor: row.tipeBorder, borderRadius: 100, padding: '2px 8px', fontSize: 11, fontWeight: 500, display: 'inline-block' }}>{row.tipe}</span>
                  </td>
                  <td style={{ padding: '9px 10px', fontWeight: 500 }}>{row.nilai}</td>
                  <td style={{ padding: '9px 10px', fontSize: 12, color: '#6b7280' }}>{row.bw}</td>
                  <td style={{ padding: '9px 10px' }}>
                    {row.ppn === null ? <span style={{ color: '#9ca3af', fontSize: 11 }}>—</span> : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 6px', borderRadius: 100, fontSize: 10, fontWeight: 500, borderWidth: '0.5px', borderStyle: 'solid', background: row.ppn ? '#EAF3DE' : '#f9f9f8', color: row.ppn ? '#3B6D11' : '#6b7280', borderColor: row.ppn ? '#97C459' : 'rgba(0,0,0,0.12)' }}>
                        {row.ppn && <i className="ti ti-check" style={{ fontSize: 9 }} />}{row.ppn ? 'Ya' : 'Tidak'}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '9px 10px', fontSize: 12, color: '#6b7280' }}>{row.tgl}</td>
                  <td style={{ padding: '9px 6px' }}>
                    {row.ppn !== null && (
                      <button style={{ padding: '3px 8px', fontSize: 11, borderWidth: '0.5px', borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.22)', borderRadius: 8, background: 'transparent', cursor: 'pointer' }}>
                        <i className="ti ti-edit" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* G25 — Form ubah biaya */}
        <div style={{ ...S.card, padding: '14px 16px' }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#1a1a1a', marginBottom: 12 }}>Ubah biaya — berlaku mulai kapan?</div>
          <div style={{ ...S.grid2 }}>
            <FF label="Biaya yang diubah">
              <select style={S.input(true)}>
                <option>Komisi platform</option>
                <option>Biaya proses order</option>
              </select>
            </FF>
            <FF label="Nilai baru">
              <input type="text" placeholder="Contoh: 7 (untuk %)" style={S.input(true)} />
            </FF>
            <FF label="Berlaku mulai *">
              <input type="date" style={S.input(true)} />
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, background: '#FAEEDA', color: '#854F0B', borderWidth: '0.5px', borderStyle: 'solid', borderColor: '#EF9F27', borderRadius: 8, padding: '3px 8px', marginTop: 2 }}>
                <i className="ti ti-info-circle" /> Tidak bisa retroaktif. Minimal H+1.
              </div>
            </FF>
            <FF label="Alasan perubahan (opsional)">
              <input type="text" placeholder="Negosiasi ulang kontrak" style={S.input(true)} />
            </FF>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
            <button style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer', borderWidth: '0.5px', borderStyle: 'solid', borderColor: '#85B7EB', color: '#185FA5', background: '#E6F1FB' }}>
              <i className="ti ti-device-floppy" /> Jadwalkan perubahan biaya
            </button>
          </div>
        </div>
      </Accordion>

      {/* Section D: Perpanjangan & Penghentian */}
      <Accordion icon="ti-refresh" iconBg="#FAEEDA" iconColor="#854F0B"
        title="Section D — Perpanjangan & penghentian"
      >
        <div style={{ ...S.grid2, marginTop: 12 }}>
          <FSelect
            label="Auto-renewal"
            value={String(draft.auto_renewal)}
            onChange={v => set('auto_renewal', v === 'true')}
            options={[
              { val: 'true',  label: 'Aktif' },
              { val: 'false', label: 'Tidak aktif' },
            ]}
          />
          <FF label="Periode pemberitahuan (hari)">
            <input
              type="number"
              value={draft.renewal_notice_days}
              onChange={e => set('renewal_notice_days', e.target.value)}
              style={S.input(true)}
            />
          </FF>
        </div>

        {/* G30 — Chip jadwal notifikasi */}
        <div style={{ marginTop: 14 }}>
          <label style={S.label}>Jadwal notifikasi renewal (hari sebelum)</label>
          <NotifChips value={draft.notif_days} onChange={v => set('notif_days', v)} />
          <span style={S.help}>Klik untuk aktifkan/nonaktifkan hari tertentu.</span>
        </div>

        <div style={S.divider} />

        <div style={{ ...S.grid2 }}>
          <FF label="Denda penghentian awal (opsional)">
            <input
              type="number"
              value={draft.early_termination_fee}
              onChange={e => set('early_termination_fee', e.target.value)}
              placeholder="0 = tidak ada denda"
              style={S.input(true)}
            />
          </FF>
          <FF label="Kebijakan refund (teks)">
            <input
              type="text"
              value={draft.kebijakan_refund}
              onChange={e => set('kebijakan_refund', e.target.value)}
              style={S.input(true)}
            />
          </FF>
        </div>
      </Accordion>

      {/* Section E: Riwayat Perubahan Biaya — read-only */}
      <Accordion icon="ti-history" iconBg="#F1EFE8" iconColor="#5F5E5A"
        title="Section E — Riwayat perubahan biaya"
      >
        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 12, marginBottom: 14 }}>
          Read-only. Tersimpan minimum 36 bulan.
        </div>

        {[
          { tgl: '1 Jan 2026', nama: 'Philips Liemena', desc: 'Biaya awal kontrak ditetapkan — Komisi 8% + Rp1.250/order', tipe: 'Awal', tipeBg: '#E6F1FB', tipeColor: '#185FA5', tipeBorder: '#85B7EB' },
        ].map((e, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, paddingBottom: 20, position: 'relative' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 32, flexShrink: 0 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#97C459', borderWidth: '0.5px', borderStyle: 'solid', borderColor: '#3B6D11', zIndex: 1, marginTop: 3 }} />
              <div style={{ width: 1, background: 'rgba(0,0,0,0.12)', flex: 1, marginTop: 4 }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>{e.tgl} — oleh {e.nama}</div>
              <div style={{ fontSize: 12, color: '#1a1a1a' }}>
                {e.desc}
                <span style={{ display: 'inline-block', padding: '1px 6px', borderRadius: 100, fontSize: 10, fontWeight: 500, background: e.tipeBg, color: e.tipeColor, borderWidth: '0.5px', borderStyle: 'solid', borderColor: e.tipeBorder, marginLeft: 6, verticalAlign: 'middle' }}>{e.tipe}</span>
              </div>
            </div>
          </div>
        ))}

        <button style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#185FA5', background: 'transparent', borderWidth: 0, cursor: 'pointer', padding: 0 }}>
          <i className="ti ti-list" /> Lihat selengkapnya
        </button>
      </Accordion>

      {/* G27 — FeeSimulator — tidak masuk draft/save */}
      <FeeSimulator />

      {/* Footer sticky: Simpan + Batalkan */}
      <div style={{
        position: 'sticky', bottom: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', marginTop: 4,
        borderTop: '0.5px solid rgba(0,0,0,0.22)',
        background: 'rgba(249,249,248,0.97)', backdropFilter: 'blur(4px)',
      }}>
        <span style={{ fontSize: 11, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 5 }}>
          <i className="ti ti-pin" />
          {hasChanges
            ? <span style={{ fontWeight: 500, color: '#854F0B' }}>Ada perubahan yang belum disimpan</span>
            : 'Tidak ada perubahan'}
        </span>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleCancel}
            disabled={!hasChanges || saving}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 8, fontSize: 13,
              border: '0.5px solid rgba(0,0,0,0.22)', color: '#1a1a1a', background: 'transparent',
              cursor: (!hasChanges || saving) ? 'not-allowed' : 'pointer',
              opacity: (!hasChanges || saving) ? 0.5 : 1,
            }}
          >
            Batalkan
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 8, fontSize: 13,
              border: '0.5px solid #85B7EB', color: '#185FA5', background: '#E6F1FB',
              cursor: (!hasChanges || saving) ? 'not-allowed' : 'pointer',
              opacity: (!hasChanges || saving) ? 0.5 : 1,
            }}
          >
            <i className="ti ti-device-floppy" />
            {saving ? 'Menyimpan...' : 'Simpan perubahan'}
          </button>
        </div>
      </div>

    </div>
  )
}
