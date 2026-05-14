'use client'

// app/dashboard/superadmin/tenants/[id]/TabKontrakSewa.tsx
// Tab Kontrak Sewa — summary banner + 5 accordion section + simulator
// Fix: G22 (ContractSummaryBanner), G23 (RenewalWarning), G24 (FeeTable),
//      G25 (FeeChangeForm), G26 (FeeHistoryTimeline), G27 (FeeSimulator),
//      G28 (PDF upload), G29 (tanda tangan digital), G30 (chip notifikasi)
//
// Dibuat: Sesi #132 — M6 FASE 3 Step 3.7
// Diupdate: Sesi #141 — M6 Fix Fase B

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import type { Tenant } from '@/lib/types/tenant.types'

interface Props { tenant: Tenant; onRefresh: () => void }

// ─── Shared style helpers ─────────────────────────────────────────────────────

const S = {
  card: { background: '#fff', border: '0.5px solid rgba(0,0,0,0.12)', borderRadius: 12 } as React.CSSProperties,
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px' } as React.CSSProperties,
  label: { fontSize: 12, color: '#6b7280' } as React.CSSProperties,
  input: (editable: boolean): React.CSSProperties => ({
    fontSize: 13, padding: '7px 10px', borderWidth: '0.5px', borderStyle: 'solid',
    borderColor: 'rgba(0,0,0,0.12)', borderRadius: 8, width: '100%', fontFamily: 'inherit',
    background: editable ? '#fff' : '#f9f9f8', color: editable ? '#1a1a1a' : '#6b7280',
  }),
  select: (editable: boolean): React.CSSProperties => ({
    fontSize: 13, padding: '7px 10px', borderWidth: '0.5px', borderStyle: 'solid',
    borderColor: 'rgba(0,0,0,0.12)', borderRadius: 8, width: '100%', fontFamily: 'inherit',
    background: editable ? '#fff' : '#f9f9f8', color: editable ? '#1a1a1a' : '#6b7280',
  }),
  help: { fontSize: 11, color: '#9ca3af', marginTop: 2 } as React.CSSProperties,
  divider: { height: '0.5px', background: 'rgba(0,0,0,0.12)', margin: '14px 0' } as React.CSSProperties,
}

// ─── Accordion — sama pola dengan TabInfoUmum ─────────────────────────────────

type ClusterId = 'A' | 'B' | 'C' | 'D' | 'E'

interface AccordionProps {
  id:             ClusterId
  icon:           string
  iconBg:         string
  iconColor:      string
  title:          string
  defaultOpen?:   boolean
  rightContent?:  React.ReactNode
  children:       React.ReactNode
}

function Accordion({ icon, iconBg, iconColor, title, defaultOpen, rightContent, children }: AccordionProps) {
  const [open, setOpen] = useState(!!defaultOpen)
  return (
    <div style={{ ...S.card, overflow: 'hidden', marginBottom: 10 }}>
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
          <i className="ti ti-chevron-down" style={{ fontSize: 16, color: '#6b7280', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </div>
      </div>
      {open && <div style={{ padding: '0 16px 16px', background: '#fff' }}>{children}</div>}
    </div>
  )
}

// ─── Button helpers ───────────────────────────────────────────────────────────

function BtnEdit({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', fontSize: 12, borderRadius: 8, cursor: 'pointer', borderWidth: '0.5px', borderStyle: 'solid', borderColor: '#85B7EB', color: '#185FA5', background: 'transparent' }}>
      <i className="ti ti-edit" /> Edit
    </button>
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

function fmt(d: string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

function daysUntil(d: string | null): number | null {
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
  const toggle = (d: number) => onChange(value.includes(d) ? value.filter(x => x !== d) : [...value, d])
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
      {NOTIF_OPTIONS.map(d => {
        const on = value.includes(d)
        return (
          <button key={d} onClick={() => toggle(d)} style={{
            padding: '3px 10px', borderRadius: 100, fontSize: 12, cursor: 'pointer',
            borderWidth: '0.5px', borderStyle: 'solid',
            background: on ? '#E6F1FB' : '#f9f9f8',
            color:      on ? '#185FA5' : '#6b7280',
            borderColor: on ? '#85B7EB' : 'rgba(0,0,0,0.12)',
          }}>
            {d} hari
          </button>
        )
      })}
      <span style={{ fontSize: 11, color: '#9ca3af', alignSelf: 'center' }}>Via WA Fonnte</span>
    </div>
  )
}

// ─── FeeSimulator (G27) ───────────────────────────────────────────────────────

function FeeSimulator() {
  const [gmv,    setGmv]    = useState(0)
  const [orders, setOrders] = useState(0)

  // Rate default dari fee rows (placeholder — di prod ambil dari API)
  const komisiRate = 8        // %
  const prosesFlat = 1250     // per order
  const gwPercent  = 0.7      // %
  const gwFlat     = 500      // per order

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
  const [editingCluster, setEditingCluster] = useState<ClusterId | null>(null)
  const [saving,  setSaving]   = useState(false)
  const [form,    setForm]     = useState<Record<string, unknown>>({})
  const [notifDays, setNotifDays] = useState<number[]>(DEFAULT_NOTIF_DAYS)

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))
  const openEdit = (id: ClusterId) => { setForm({}); setEditingCluster(id) }
  const cancel   = () => { setEditingCluster(null); setForm({}) }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res  = await fetch(`/api/superadmin/tenants/${tenant.id}?section=contract`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message)
      toast.success('Kontrak berhasil diperbarui')
      setEditingCluster(null); setForm({}); onRefresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal menyimpan')
    } finally {
      setSaving(false)
    }
  }

  const isA = editingCluster === 'A'
  const isB = editingCluster === 'B'
  const isD = editingCluster === 'D'

  const days = daysUntil(tenant.contract_end_date)

  const CONTRACT_STATUS_LABEL: Record<string, string> = {
    draft: 'Draft', aktif: 'Aktif', kedaluwarsa: 'Kedaluwarsa',
    dihentikan_awal: 'Dihentikan Awal', diperbarui: 'Diperbarui',
  }

  return (
    <div>

      {/* G23 — Renewal Warning (kondisional ≤ 30 hari) */}
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
      <Accordion id="A" icon="ti-file-description" iconBg="#E6F1FB" iconColor="#185FA5"
        title="Section A — Kontrak master" defaultOpen
        rightContent={<BtnEdit onClick={() => openEdit('A')} />}
      >
        <div style={{ ...S.grid2, marginTop: 12 }}>
          <FRO label="Nomor kontrak" value={tenant.contract_number ?? 'Auto-generated'} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={S.label}>Status kontrak</label>
            <input readOnly value={tenant.contract_status ? CONTRACT_STATUS_LABEL[tenant.contract_status] ?? tenant.contract_status : '—'} style={{ ...S.input(false), color: tenant.contract_status === 'aktif' ? '#3B6D11' : undefined, fontWeight: tenant.contract_status === 'aktif' ? 500 : undefined }} />
          </div>

          {isA ? (
            <>
              <FF label="Tanggal mulai *">
                <input type="date" defaultValue={tenant.contract_start_date?.split('T')[0] ?? ''} onChange={e => set('contract_start_date', e.target.value)} style={S.input(true)} />
              </FF>
              <FF label="Tanggal berakhir">
                <input type="date" defaultValue={tenant.contract_end_date?.split('T')[0] ?? ''} onChange={e => set('contract_end_date', e.target.value)} style={S.input(true)} />
                <span style={S.help}>Kosongkan untuk kontrak permanen / tanpa batas waktu</span>
              </FF>
            </>
          ) : (
            <>
              <FRO label="Tanggal mulai" value={fmt(tenant.contract_start_date)} />
              <FRO label="Tanggal berakhir" value={tenant.contract_end_date ? fmt(tenant.contract_end_date) : 'Permanen'} />
            </>
          )}

          {/* G28 — Upload file kontrak */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={S.label}>File lampiran kontrak</label>
            {tenant.contract_file_url ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <i className="ti ti-file-type-pdf" style={{ color: '#A32D2D', fontSize: 18 }} />
                <a href={tenant.contract_file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: '#185FA5' }}>
                  Lihat kontrak PDF
                </a>
                {isA && (
                  <button style={{ padding: '3px 8px', fontSize: 11, borderRadius: 8, cursor: 'pointer', borderWidth: '0.5px', borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.22)', background: 'transparent', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <i className="ti ti-upload" /> Ganti
                  </button>
                )}
              </div>
            ) : (
              <button style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', fontSize: 12, borderRadius: 8, borderWidth: '0.5px', borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.22)', background: 'transparent', cursor: isA ? 'pointer' : 'default', alignSelf: 'flex-start' }}>
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
      <Accordion id="B" icon="ti-calendar-repeat" iconBg="#EEEDFE" iconColor="#534AB7"
        title="Section B — Biaya setup & langganan"
        rightContent={<BtnEdit onClick={() => openEdit('B')} />}
      >
        <div style={{ ...S.grid2, marginTop: 12 }}>
          <FF label="Biaya awal / onboarding">
            <input readOnly={!isB} value={isB ? (form.biaya_awal as string ?? '0') : 'Rp0'} onChange={e => set('biaya_awal', e.target.value)} placeholder="Rp 0 = tidak ada biaya awal" style={S.input(isB)} />
            <span style={S.help}>Opsional. Biaya implementasi awal di luar biaya transaksi.</span>
          </FF>
          <FF label="Biaya langganan berkala">
            <input readOnly={!isB} value={isB ? (form.biaya_langganan as string ?? '0') : 'Rp0'} onChange={e => set('biaya_langganan', e.target.value)} placeholder="Rp 0 = tidak ada langganan" style={S.input(isB)} />
          </FF>
          <FF label="Siklus tagihan">
            {isB ? (
              <select style={S.select(true)} onChange={e => set('siklus_tagihan', e.target.value)}>
                <option value="">Tidak ada langganan</option>
                <option value="bulanan">Bulanan</option>
                <option value="kuartalan">Kuartalan</option>
                <option value="tahunan">Tahunan</option>
              </select>
            ) : (
              <input readOnly value="Tidak ada langganan" style={S.input(false)} />
            )}
          </FF>
          <FF label="Perlakuan pajak langganan">
            {isB ? (
              <select style={S.select(true)} onChange={e => set('pajak_langganan', e.target.value)}>
                <option value="inklusif">PPN Inklusif (termasuk PPN 11%)</option>
                <option value="eksklusif">PPN Eksklusif (PPN ditambah di atas)</option>
              </select>
            ) : (
              <input readOnly value="PPN Inklusif (termasuk PPN 11%)" style={S.input(false)} />
            )}
          </FF>
        </div>
      </Accordion>

      {/* Section C: Struktur Biaya Transaksi */}
      <Accordion id="C" icon="ti-percentage" iconBg="#EAF3DE" iconColor="#3B6D11"
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
                { nama: 'Komisi platform',    tipe: '% transaksi', tipeBg: '#E6F1FB', tipeColor: '#185FA5', tipeBorder: '#85B7EB', nilai: '8%',               bw: 'Per transaksi', ppn: true,  tgl: '1 Jan 2026' },
                { nama: 'Biaya proses order', tipe: 'Flat/order',  tipeBg: '#EEEDFE', tipeColor: '#534AB7', tipeBorder: '#AFA9EC', nilai: 'Rp1.250/order',     bw: 'Per order',     ppn: true,  tgl: '1 Jan 2026' },
                { nama: 'Biaya gateway Xendit',tipe: 'Hybrid',     tipeBg: '#EAF3DE', tipeColor: '#3B6D11', tipeBorder: '#97C459', nilai: '0.7% + Rp500',      bw: 'Per transaksi', ppn: false, tgl: '1 Jan 2026', alt: true },
                { nama: 'PPN (informasi)',     tipe: 'Info saja',  tipeBg: '#f9f9f8', tipeColor: '#6b7280', tipeBorder: 'rgba(0,0,0,0.12)', nilai: '11% efektif (inklusif)', bw: 'Semua', ppn: null, tgl: '—' },
              ].map((row, i) => (
                <tr key={i} style={{ borderTopWidth: '0.5px', borderTopStyle: 'solid', borderTopColor: 'rgba(0,0,0,0.12)', background: row.alt ? '#f9f9f8' : '#fff' }}
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
              <select style={S.select(true)}>
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
      <Accordion id="D" icon="ti-refresh" iconBg="#FAEEDA" iconColor="#854F0B"
        title="Section D — Perpanjangan & penghentian"
        rightContent={<BtnEdit onClick={() => openEdit('D')} />}
      >
        <div style={{ ...S.grid2, marginTop: 12 }}>
          <FF label="Auto-renewal">
            {isD ? (
              <select style={S.select(true)} onChange={e => set('auto_renewal', e.target.value === 'true')}>
                <option value="true">Aktif</option>
                <option value="false">Tidak aktif</option>
              </select>
            ) : (
              <input readOnly value={tenant.auto_renewal ? 'Aktif' : 'Tidak aktif'} style={S.input(false)} />
            )}
          </FF>
          <FF label="Periode pemberitahuan (hari)">
            {isD ? (
              <input type="number" defaultValue={tenant.renewal_notice_days} onChange={e => set('renewal_notice_days', e.target.value)} style={S.input(true)} />
            ) : (
              <input readOnly value={`${tenant.renewal_notice_days} hari`} style={S.input(false)} />
            )}
          </FF>
        </div>

        {/* G30 — Chip jadwal notifikasi */}
        <div style={{ marginTop: 14 }}>
          <label style={S.label}>Jadwal notifikasi renewal (hari sebelum)</label>
          <NotifChips value={notifDays} onChange={setNotifDays} />
          <span style={S.help}>Klik untuk aktifkan/nonaktifkan hari tertentu.</span>
        </div>

        <div style={S.divider} />

        <div style={{ ...S.grid2 }}>
          <FF label="Denda penghentian awal (opsional)">
            {isD ? (
              <input type="number" defaultValue={tenant.early_termination_fee ?? ''} onChange={e => set('early_termination_fee', e.target.value)} placeholder="0 = tidak ada denda" style={S.input(true)} />
            ) : (
              <input readOnly value={tenant.early_termination_fee ? `Rp${Number(tenant.early_termination_fee).toLocaleString('id-ID')}` : 'Tidak ada denda'} style={S.input(false)} />
            )}
          </FF>
          <FF label="Kebijakan refund (teks)">
            <input readOnly={!isD} defaultValue="Refund prorata untuk sisa hari belum dipakai" style={S.input(isD)} />
          </FF>
        </div>
      </Accordion>

      {/* Section E: Riwayat Perubahan Biaya */}
      <Accordion id="E" icon="ti-history" iconBg="#F1EFE8" iconColor="#5F5E5A"
        title="Section E — Riwayat perubahan biaya"
      >
        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 12, marginBottom: 14 }}>
          Read-only. Tersimpan minimum 36 bulan.
        </div>

        {/* Timeline placeholder */}
        {[
          { dot: 'done', tgl: '1 Jan 2026', nama: 'Philips Liemena', desc: 'Biaya awal kontrak ditetapkan — Komisi 8% + Rp1.250/order', tipe: 'Awal', tipeBg: '#E6F1FB', tipeColor: '#185FA5', tipeBorder: '#85B7EB' },
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

      {/* G27 — FeeSimulator */}
      <FeeSimulator />

      {/* Footer */}
      {editingCluster !== null && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: '1rem', paddingTop: '1rem', borderTopWidth: '0.5px', borderTopStyle: 'solid', borderTopColor: 'rgba(0,0,0,0.12)' }}>
          <button onClick={cancel} disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer', borderWidth: '0.5px', borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.22)', color: '#1a1a1a', background: 'transparent' }}>
            Batal
          </button>
          <button onClick={handleSave} disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer', borderWidth: '0.5px', borderStyle: 'solid', borderColor: '#85B7EB', color: '#185FA5', background: '#E6F1FB' }}>
            <i className="ti ti-device-floppy" /> {saving ? 'Menyimpan...' : 'Simpan perubahan'}
          </button>
        </div>
      )}
    </div>
  )
}
