'use client'

// app/dashboard/superadmin/tenants/[id]/TabInfoUmum.tsx
// Tab Info Umum — pola simpan terpadu (refactor S#312)
//
// Dibuat: Sesi #132 — M6 FASE 3 Step 3.7
// Refactor S#312: ganti editingCluster per-cluster → draft + baseline + detectHasChanges
//   - Semua field langsung editable (tanpa tombol Edit per-cluster)
//   - Footer sticky bottom-0: Simpan + Batalkan, nonaktif saat !hasChanges
//   - handleSave kirim DIFF only (tidak kirim field yang tidak berubah)
//   - Fix chevron: onClick langsung di elemen chevron (hapus stopPropagation wrapper)
//   - Split file: sub-komponen + helpers → TabInfoUmum.helpers.tsx (ATURAN 9)
// Sub-komponen: lihat TabInfoUmum.helpers.tsx

import { useState, useCallback }    from 'react'
import { toast }                    from 'sonner'
import type { Tenant }              from '@/lib/types/tenant.types'
import {
  Accordion, FRow, FReadOnly, FInput, FSelect, LifecycleViz,
  buildDraft, detectHasChanges, buildDiffPayload,
  formatTglLengkap, formatTglWaktu,
  type TenantDraft,
} from './TabInfoUmum.helpers'

interface Props { tenant: Tenant; onRefresh: () => void }

export function TabInfoUmum({ tenant, onRefresh }: Props) {
  const initial = buildDraft(tenant)

  const [draft,       setDraft]       = useState<TenantDraft>(initial)
  const [baseline,    setBaseline]    = useState<TenantDraft>(JSON.parse(JSON.stringify(initial)))
  const [saving,      setSaving]      = useState(false)
  const [savingStatus,setSavingStatus]= useState(false)

  const hasChanges = detectHasChanges(draft, baseline)

  // ─── Setter draft ──────────────────────────────────────────────────────────

  const set = useCallback(<K extends keyof TenantDraft>(k: K, v: TenantDraft[K]) => {
    setDraft(d => ({ ...d, [k]: v }))
  }, [])

  // ─── Batalkan: reset draft ke baseline ────────────────────────────────────

  const handleCancel = () => {
    setDraft(JSON.parse(JSON.stringify(baseline)))
  }

  // ─── Simpan: kirim DIFF only ke PATCH /api/superadmin/tenants/[id] ─────────

  const handleSave = async () => {
    const diff = buildDiffPayload(draft, baseline)

    if (Object.keys(diff).length === 0) {
      // Tidak ada perubahan — tidak kirim, tidak tampil toast
      return
    }

    setSaving(true)
    try {
      const res  = await fetch(`/api/superadmin/tenants/${tenant.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(diff),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message)

      toast.success('Perubahan berhasil disimpan')

      // Sinkron baseline setelah save sukses (sama pola ConfigPageClient S#110b)
      setBaseline(JSON.parse(JSON.stringify(draft)))
      onRefresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal menyimpan')
    } finally {
      setSaving(false)
    }
  }

  // ─── Aktifkan Tenant: pending → active ────────────────────────────────────

  const handleAktifkan = async () => {
    setSavingStatus(true)
    try {
      const res  = await fetch(`/api/superadmin/tenants/${tenant.id}/status`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status: 'active', alasan: 'Diaktifkan oleh SuperAdmin' }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message)
      toast.success('Tenant berhasil diaktifkan')
      onRefresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal mengaktifkan tenant')
    } finally {
      setSavingStatus(false)
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>

      {/* Info bar: panduan penggunaan */}
      <div style={{ background: '#E6F1FB', border: '0.5px solid #85B7EB', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#0C447C', marginBottom: 10, display: 'flex', alignItems: 'flex-start', gap: 8, lineHeight: 1.5 }}>
        <i className="ti ti-pencil" style={{ marginTop: 1, flexShrink: 0 }} />
        <span>Semua cluster bisa langsung diisi atau diubah sekaligus. Perubahan dari cluster mana pun disimpan bersama lewat tombol di footer. Field terkunci (Kode tenant, ID sistem, tanggal) tetap read-only.</span>
      </div>

      {/* ── Cluster A: Identitas master ──────────────────────────────────────── */}
      <Accordion icon="ti-id-badge" iconBg="#E6F1FB" iconColor="#185FA5"
        title="Cluster A — Identitas master" defaultOpen
      >
        <FRow>
          <FInput label="Nama brand *"            value={draft.nama_brand} onChange={v => set('nama_brand', v)} />
          <FInput label="Nama legal perusahaan *" value={draft.nama_legal} onChange={v => set('nama_legal', v)} />
          <FReadOnly label="Kode tenant">
            <input readOnly value={tenant.slug ?? ''} style={{ fontSize: 13, padding: '7px 10px', border: '0.5px solid rgba(0,0,0,0.12)', borderRadius: 8, background: '#f9f9f8', color: '#6b7280', width: '100%', fontFamily: 'inherit' }} />
            <span style={{ fontSize: 11, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 4 }}>
              <i className="ti ti-lock" /> Tidak bisa diubah setelah aktif
            </span>
          </FReadOnly>
          <FReadOnly label="ID sistem"          value={tenant.tenant_display_id} />
          <FReadOnly label="Tanggal bergabung"  value={formatTglLengkap(tenant.created_at)} />
          <FReadOnly label="Aktivitas terakhir" value={formatTglWaktu(tenant.updated_at)} />
        </FRow>
      </Accordion>

      {/* ── Cluster B: Legalitas Indonesia ───────────────────────────────────── */}
      <Accordion icon="ti-file-certificate" iconBg="#EAF3DE" iconColor="#3B6D11"
        title="Cluster B — Legalitas Indonesia" defaultOpen
      >
        <FRow>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 12, color: '#6b7280' }}>NPWP perusahaan *</label>
            <input
              value={draft.npwp}
              onChange={e => set('npwp', e.target.value)}
              style={{ fontSize: 13, padding: '7px 10px', border: '0.5px solid rgba(0,0,0,0.12)', borderRadius: 8, background: '#fff', width: '100%', fontFamily: 'inherit' }}
            />
            <span style={{ fontSize: 11, color: '#9ca3af', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span><i className="ti ti-check" style={{ color: '#3B6D11' }} /> Format valid</span>
              <button onClick={() => window.open('https://ereg.pajak.go.id', '_blank')} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', fontSize: 11, border: '0.5px solid rgba(0,0,0,0.22)', borderRadius: 8, cursor: 'pointer', color: '#185FA5', background: 'transparent' }}>
                <i className="ti ti-external-link" style={{ fontSize: 12 }} /> Verifikasi di Coretax
              </button>
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 12, color: '#6b7280' }}>NIB (Nomor Induk Berusaha)</label>
            <input
              value={draft.nib}
              onChange={e => set('nib', e.target.value)}
              style={{ fontSize: 13, padding: '7px 10px', border: '0.5px solid rgba(0,0,0,0.12)', borderRadius: 8, background: '#fff', width: '100%', fontFamily: 'inherit' }}
            />
            <span style={{ fontSize: 11, color: '#9ca3af', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>13 digit</span>
              <button onClick={() => window.open('https://oss.go.id', '_blank')} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', fontSize: 11, border: '0.5px solid rgba(0,0,0,0.22)', borderRadius: 8, cursor: 'pointer', color: '#185FA5', background: 'transparent' }}>
                <i className="ti ti-external-link" style={{ fontSize: 12 }} /> Verifikasi di OSS
              </button>
            </span>
          </div>

          <FSelect label="Status PKP" value={draft.status_pkp} onChange={v => set('status_pkp', v)} options={[
            { val: '',        label: '— Belum diisi —' },
            { val: 'pkp',     label: 'PKP — e-Faktur terbit otomatis tiap akhir bulan' },
            { val: 'non_pkp', label: 'Non-PKP — tidak kena PPN e-Faktur' },
          ]} />

          <FSelect label="Bentuk badan usaha *" value={draft.bentuk_badan_usaha} onChange={v => set('bentuk_badan_usaha', v)} options={[
            { val: 'pt',              label: 'PT (Perseroan Terbatas)' },
            { val: 'cv',              label: 'CV' },
            { val: 'perorangan_umkm', label: 'Perorangan / UMKM' },
            { val: 'yayasan',         label: 'Yayasan' },
            { val: 'koperasi',        label: 'Koperasi' },
          ]} />

          <FInput label="KBLI utama"              value={draft.kbli_utama}    onChange={v => set('kbli_utama', v)}    placeholder="Contoh: 45201 — Reparasi Mobil" />
          <FInput label="KBLI sekunder (opsional)" value={draft.kbli_sekunder} onChange={v => set('kbli_sekunder', v)} placeholder="Opsional" />
        </FRow>
      </Accordion>

      {/* ── Cluster C: Kontak & Domisili ──────────────────────────────────────── */}
      <Accordion icon="ti-map-pin" iconBg="#EEEDFE" iconColor="#534AB7"
        title="Cluster C — Kontak & domisili"
      >
        <FRow>
          <FInput label="Alamat operasional *" value={draft.alamat} onChange={v => set('alamat', v)} fullWidth />

          <FSelect label="Provinsi" value={draft.provinsi} onChange={v => set('provinsi', v)} options={[
            { val: '',             label: '— Pilih provinsi —' },
            { val: 'DKI Jakarta',  label: 'DKI Jakarta' },
            { val: 'Jawa Barat',   label: 'Jawa Barat' },
            { val: 'Jawa Tengah',  label: 'Jawa Tengah' },
            { val: 'Jawa Timur',   label: 'Jawa Timur' },
            { val: 'Banten',       label: 'Banten' },
            { val: 'Bali',         label: 'Bali' },
          ]} />

          <FInput label="Kota / Kabupaten" value={draft.kota}      onChange={v => set('kota', v)}      placeholder="Isi kota setelah pilih provinsi" />
          <FInput label="Kecamatan"        value={draft.kecamatan} onChange={v => set('kecamatan', v)} />
          <FInput label="Kode pos"         value={draft.kode_pos}  onChange={v => set('kode_pos', v.replace(/\D/g, '').slice(0, 5))} placeholder="5 digit" />
          <FInput label="Email resmi tenant" value={draft.email_resmi}     onChange={v => set('email_resmi', v)}     type="email" />
          <FInput label="Nomor WA bisnis *"  value={draft.nomor_wa_bisnis} onChange={v => set('nomor_wa_bisnis', v)} helpText="Format: 62 + nomor tanpa angka 0 depan" />
        </FRow>
      </Accordion>

      {/* ── Cluster D: Klasifikasi internal ───────────────────────────────────── */}
      <Accordion icon="ti-adjustments" iconBg="#FAEEDA" iconColor="#854F0B"
        title="Cluster D — Klasifikasi internal platform"
      >
        <FRow>
          <FSelect label="Tipe tenant *" value={draft.tipe} onChange={v => set('tipe', v)} options={[
            { val: 'internal',  label: 'Internal — dioperasikan platform sendiri' },
            { val: 'eksternal', label: 'Eksternal — disewakan ke pihak ketiga' },
          ]} />

          <FSelect label="Tier / Paket" value={draft.tier} onChange={v => set('tier', v)} options={[
            { val: 'starter',    label: 'Starter (maks. 5 user)' },
            { val: 'growth',     label: 'Growth (maks. 15 user)' },
            { val: 'enterprise', label: 'Enterprise (tidak terbatas)' },
          ]} />

          {/* Persetujuan refund otomatis — hanya tampil kalau tipe = internal */}
          {draft.tipe === 'internal' && (
            <FSelect label="Persetujuan refund otomatis" value={String(draft.refund_auto_approve)} onChange={v => set('refund_auto_approve', v === 'true')} options={[
              { val: 'true',  label: 'Ya — refund langsung diproses' },
              { val: 'false', label: 'Tidak — refund eskalasi ke SuperAdmin' },
            ]} />
          )}

          <FInput label="Region / area coverage"       value={draft.region_coverage} onChange={v => set('region_coverage', v)} helpText="Opsional. Kosong = seluruh Indonesia" />
          <FInput label="Tags / label internal (opsional)" value={draft.tags} onChange={v => set('tags', v)} fullWidth placeholder="Contoh: jabodetabek-coverage, pilot-tenant" helpText="Opsional. Tidak terlihat AdminTenant" />
        </FRow>
      </Accordion>

      {/* ── Status Lifecycle ──────────────────────────────────────────────────── */}
      <LifecycleViz
        status={tenant.lifecycle_status}
        onAktifkan={handleAktifkan}
        saving={savingStatus}
      />

      {/* ── Cluster F: Pengaturan tambahan & catatan internal ─────────────────── */}
      <Accordion icon="ti-settings-2" iconBg="#F1EFE8" iconColor="#5F5E5A"
        title="Pengaturan tambahan & catatan internal"
      >
        <FRow>
          <FSelect label="Zona waktu" value={draft.timezone} onChange={v => set('timezone', v)} options={[
            { val: 'Asia/Jakarta',  label: 'Asia/Jakarta (WIB, UTC+7)' },
            { val: 'Asia/Makassar', label: 'Asia/Makassar (WITA, UTC+8)' },
            { val: 'Asia/Jayapura', label: 'Asia/Jayapura (WIT, UTC+9)' },
          ]} />
          <FSelect label="Bahasa antarmuka default" value={draft.bahasa} onChange={v => set('bahasa', v)} options={[
            { val: 'id-ID', label: 'Bahasa Indonesia (id-ID)' },
          ]} />
        </FRow>

        <div style={{ height: 0.5, background: 'rgba(0,0,0,0.12)', margin: '14px 0' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}>
            <i className="ti ti-lock" style={{ color: '#854F0B' }} />
            Catatan internal SuperAdmin
            <span style={{ fontSize: 11, color: '#854F0B', marginLeft: 4 }}>(tidak terlihat AdminTenant)</span>
          </label>
          <textarea
            value={draft.catatan_internal}
            onChange={e => set('catatan_internal', e.target.value)}
            style={{ background: '#FAEEDA', border: '0.5px solid #EF9F27', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: '#633806', minHeight: 80, resize: 'vertical', width: '100%', fontFamily: 'inherit' }}
          />
        </div>

        <div style={{ height: 0.5, background: 'rgba(0,0,0,0.12)', margin: '14px 0' }} />

        <div style={{ fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 10 }}>Branding whitelabel (opsional)</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px 16px' }}>
          {([
            { label: 'Warna utama', key: 'warna_utama' as const },
            { label: 'Warna aksen', key: 'warna_aksen' as const },
          ] as { label: string; key: 'warna_utama' | 'warna_aksen' }[]).map(({ label, key }) => (
            <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, color: '#6b7280' }}>{label}</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, border: '0.5px solid rgba(0,0,0,0.12)', background: draft[key], flexShrink: 0 }} />
                <input value={draft[key]} onChange={e => set(key, e.target.value)} style={{ flex: 1, fontSize: 13, padding: '7px 10px', border: '0.5px solid rgba(0,0,0,0.12)', borderRadius: 8, background: '#fff', fontFamily: 'inherit' }} />
              </div>
            </div>
          ))}
          {['Logo (light bg)', 'Logo (dark bg)'].map(label => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, color: '#6b7280' }}>{label}</label>
              <button style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '5px 10px', fontSize: 12, borderRadius: 8, border: '0.5px solid rgba(0,0,0,0.22)', background: 'transparent', cursor: 'pointer' }}>
                <i className="ti ti-upload" /> Upload PNG
              </button>
            </div>
          ))}
        </div>
      </Accordion>

      {/* ── Footer sticky: Simpan + Batalkan ─────────────────────────────────── */}
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
