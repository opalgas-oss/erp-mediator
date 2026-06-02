'use client'

// app/dashboard/superadmin/tenants/[id]/dialog-tambah-at.parts.tsx
// Sub-komponen render untuk DialogTambahAdminTenant (dipecah agar ukuran file < 10 KB)
// Dibuat: Sesi #239 — HUTANG-AT-AUTH STEP 2 Fase 2

import { DS, type FormDataAT, type ExistingInfoAT, type JabatanAT, type RelasiAT } from './dialog-tambah-at.constants'

// ─── BodyForm ─────────────────────────────────────────────────────────────────

interface BodyFormProps {
  form:           FormDataAT
  setForm:        (fn: (prev: FormDataAT) => FormDataAT) => void
  errors:         Partial<Record<keyof FormDataAT, string>>
  errMsg?:        string
  jabatanOptions: { value: JabatanAT; label: string }[]
  relasiOptions:  { value: RelasiAT;  label: string }[]
}

export function BodyForm({ form, setForm, errors, errMsg, jabatanOptions, relasiOptions }: BodyFormProps) {
  const inp = (key: keyof FormDataAT) => ({
    style: errors[key] ? DS.inputErr : DS.input,
    value: form[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(f => ({ ...f, [key]: e.target.value })),
  })

  return <>
    {errMsg && <div style={DS.errNote}><i className="ti ti-alert-circle" style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }} /><div><strong>Gagal.</strong> {errMsg}</div></div>}
    <div style={DS.secLbl}><div style={DS.secIcon('#185FA5', '#E6F1FB')}><i className="ti ti-user" /></div>Data orang</div>
    <div style={DS.ff}><label style={DS.label}>Nama lengkap <span style={DS.req}>*</span></label><input {...inp('nama')} placeholder="Nama lengkap" />{errors.nama && <span style={{ fontSize: 11, color: '#A32D2D' }}>{errors.nama}</span>}</div>
    <div style={DS.grid}>
      <div style={DS.ff}><label style={DS.label}>Email <span style={DS.req}>*</span></label><input {...inp('email')} type="email" placeholder="nama@perusahaan.com" />{errors.email && <span style={{ fontSize: 11, color: '#A32D2D' }}>{errors.email}</span>}</div>
      <div style={DS.ff}><label style={DS.label}>Nomor WA <span style={DS.req}>*</span></label><input {...inp('nomor_wa')} placeholder="628xxxxxxxxxx" />{errors.nomor_wa && <span style={{ fontSize: 11, color: '#A32D2D' }}>{errors.nomor_wa}</span>}</div>
    </div>
    <div style={DS.divider} />
    <div style={DS.secLbl}><div style={DS.secIcon('#3B6D11', '#EAF3DE')}><i className="ti ti-id-badge" /></div>Peran &amp; relasi</div>
    <div style={DS.grid}>
      <div style={DS.ff}>
        <label style={DS.label}>Jabatan <span style={DS.req}>*</span></label>
        <select style={errors.jabatan ? DS.inputErr : DS.input} value={form.jabatan} onChange={e => setForm(f => ({ ...f, jabatan: e.target.value as JabatanAT }))}>
          <option value="" disabled>Pilih jabatan...</option>
          {jabatanOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {errors.jabatan && <span style={{ fontSize: 11, color: '#A32D2D' }}>{errors.jabatan}</span>}
      </div>
      <div style={DS.ff}>
        <label style={DS.label}>Relasi ke perusahaan <span style={DS.req}>*</span></label>
        <select style={errors.relasi ? DS.inputErr : DS.input} value={form.relasi} onChange={e => setForm(f => ({ ...f, relasi: e.target.value as RelasiAT }))}>
          <option value="" disabled>Pilih relasi...</option>
          {relasiOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {errors.relasi && <span style={{ fontSize: 11, color: '#A32D2D' }}>{errors.relasi}</span>}
      </div>
    </div>
    <div style={DS.divider} />
    <div style={DS.infoBox}><i className="ti ti-info-circle" style={{ fontSize: 16, color: '#185FA5', flexShrink: 0, marginTop: 1 }} /><div>Setelah disimpan, sistem otomatis membuat akun dan mengirim <strong>tautan aktivasi</strong> ke email. AdminTenant membuat kata sandi sendiri.</div></div>
  </>
}

// ─── BodyLoading ──────────────────────────────────────────────────────────────

export function BodyLoading() {
  return (
    <div style={{ textAlign: 'center', padding: '48px 20px' }}>
      <div style={{ width: 40, height: 40, border: '3px solid #E6F1FB', borderTopColor: '#185FA5', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 16px' }} />
      <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>Memproses...</div>
    </div>
  )
}

// ─── BodyExisting ─────────────────────────────────────────────────────────────

export function BodyExisting({ existing }: { existing: ExistingInfoAT }) {
  return <>
    <div style={DS.warnNote}><i className="ti ti-alert-triangle" style={{ flexShrink: 0, fontSize: 15, marginTop: 1 }} /><div><strong>{existing.user_email}</strong> sudah memiliki akun di platform. Konfirmasi apakah email ini benar dan akan digabungkan ke tenant ini.</div></div>
    <div style={{ fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 8 }}>Detail akun yang ditemukan</div>
    <div style={{ background: '#f9f9f8', border: '0.5px solid rgba(0,0,0,0.12)', borderRadius: 8, padding: '12px 14px', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#E6F1FB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 500, color: '#185FA5' }}>
          {(existing.user_name ?? 'U').substring(0, 2).toUpperCase()}
        </div>
        <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 500 }}>{existing.user_name}</div><div style={{ fontSize: 12, color: '#6b7280' }}>{existing.user_email}</div></div>
        {existing.role_existing && <span style={DS.chipBlue}>{existing.role_existing}</span>}
      </div>
      {existing.user_wa && <div style={{ fontSize: 12, color: '#6b7280' }}>WA: {existing.user_wa}</div>}
    </div>
    <div style={DS.infoBox}><i className="ti ti-info-circle" style={{ fontSize: 16, color: '#185FA5', flexShrink: 0 }} /><div>Jika <strong>Ya</strong>: akun ini ditambahkan sebagai AdminTenant. Peran lama <strong>tidak berubah</strong>.<br />Jika <strong>Tidak</strong>: kembali ke form, data tetap ada.</div></div>
  </>
}

// ─── BodySukses ───────────────────────────────────────────────────────────────

export function BodySukses({ form, mailOk }: { form: FormDataAT; mailOk: boolean }) {
  return <>
    <div style={{ textAlign: 'center', padding: '8px 0 12px' }}>
      <div style={DS.suksesDot}><i className="ti ti-user-check" /></div>
      <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: 6 }}>Berhasil Ditambahkan</h3>
      <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>
        {mailOk ? <>Email aktivasi dikirim ke <strong>{form.email}</strong>. AdminTenant perlu klik tautan untuk mengaktifkan akun.</> : <>AdminTenant ditambahkan. <span style={{ color: '#854F0B' }}>Email aktivasi gagal — gunakan Kirim Ulang.</span></>}
      </p>
    </div>
    <div style={DS.suksesBg}>
      {[{ k: 'Nama', v: form.nama }, { k: 'Email', v: form.email }, { k: 'Jabatan', v: <span style={DS.chipBlue}>{form.jabatan}</span> }, { k: 'Email aktivasi', v: <span style={mailOk ? DS.chipGreen : DS.chipOrange}>{mailOk ? 'Terkirim' : 'Gagal'}</span> }].map(({ k, v }) => (
        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
          <span style={{ color: '#6b7280', fontSize: 12 }}>{k}</span><span style={{ fontWeight: 500 }}>{v}</span>
        </div>
      ))}
    </div>
  </>
}
