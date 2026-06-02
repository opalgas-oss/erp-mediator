// app/dashboard/superadmin/tenants/[id]/dialog-tambah-at.constants.ts
// Konstanta dan style helpers untuk DialogTambahAdminTenant
// Dipisah agar DialogTambahAdminTenant.tsx tetap < 10 KB

export type JabatanAT = 'penanggung_jawab' | 'operator' | 'finance' | 'warehouse' | 'sales' | 'lainnya'
export type RelasiAT  = 'owner' | 'direktur' | 'karyawan' | 'konsultan' | 'keluarga_pemilik'
export type DialogATState = 'form' | 'loading' | 'existing' | 'error' | 'sukses'

export interface FormDataAT {
  nama:     string
  email:    string
  nomor_wa: string
  jabatan:  JabatanAT | ''
  relasi:   RelasiAT  | ''
}

export interface ExistingInfoAT {
  user_id:               string
  user_name:             string
  user_email:            string
  user_wa:               string | null
  role_existing:         string | null
  has_active_membership: boolean
}

export const JABATAN_OPTIONS: { value: JabatanAT; label: string }[] = [
  { value: 'penanggung_jawab', label: 'Penanggung Jawab' },
  { value: 'operator',         label: 'Operator' },
  { value: 'finance',          label: 'Finance' },
  { value: 'warehouse',        label: 'Warehouse' },
  { value: 'sales',            label: 'Sales' },
  { value: 'lainnya',          label: 'Lainnya' },
]

export const RELASI_OPTIONS: { value: RelasiAT; label: string }[] = [
  { value: 'owner',            label: 'Owner' },
  { value: 'direktur',         label: 'Direktur' },
  { value: 'karyawan',         label: 'Karyawan' },
  { value: 'konsultan',        label: 'Konsultan' },
  { value: 'keluarga_pemilik', label: 'Keluarga Pemilik' },
]

// Design system style helpers (mengikuti mockup B1 inline style)
export const DS = {
  overlay:  { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' },
  modal:    { background: '#fff', borderRadius: 12, border: '0.5px solid rgba(0,0,0,0.22)', width: 520, maxWidth: '100%', display: 'flex', flexDirection: 'column' as const, maxHeight: '90vh', overflow: 'hidden' },
  hdr:      { padding: '16px 20px', borderBottom: '0.5px solid rgba(0,0,0,0.12)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 },
  body:     { padding: '16px 20px', overflowY: 'auto' as const, flex: 1 },
  ftr:      { padding: '12px 20px', borderTop: '0.5px solid rgba(0,0,0,0.12)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9f9f8', flexShrink: 0 },
  ff:       { display: 'flex', flexDirection: 'column' as const, gap: 4, marginBottom: 10 },
  label:    { fontSize: 12, color: '#6b7280' },
  req:      { color: '#A32D2D', fontSize: 11 },
  input:    { fontSize: 13, padding: '7px 10px', border: '0.5px solid rgba(0,0,0,0.12)', borderRadius: 8, background: '#fff', fontFamily: 'inherit', width: '100%', color: '#1a1a1a' },
  inputErr: { fontSize: 13, padding: '7px 10px', border: '0.5px solid #F09595', borderRadius: 8, background: '#fff', fontFamily: 'inherit', width: '100%', color: '#1a1a1a' },
  grid:     { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px' },
  divider:  { height: '0.5px', background: 'rgba(0,0,0,0.12)', margin: '14px 0' },
  secLbl:   { fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 },
  secIcon:  (color: string, bg: string) => ({ width: 22, height: 22, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, background: bg, color }),
  btnBase:  (border: string, color: string) => ({ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', border, color, background: 'transparent' }),
  errNote:  { background: '#FCEBEB', border: '0.5px solid #F09595', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#A32D2D', marginBottom: 14, display: 'flex', alignItems: 'flex-start', gap: 8 },
  warnNote: { background: '#FAEEDA', border: '0.5px solid #EF9F27', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#854F0B', marginBottom: 14, display: 'flex', alignItems: 'flex-start', gap: 8 },
  infoBox:  { background: '#f9f9f8', border: '0.5px solid rgba(0,0,0,0.12)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#6b7280', display: 'flex', gap: 8 },
  chip:     (bg: string, color: string, border: string) => ({ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 100, fontSize: 11, fontWeight: 500, background: bg, color, border: `0.5px solid ${border}` }),
  chipBlue: { display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 100, fontSize: 11, fontWeight: 500, background: '#E6F1FB', color: '#185FA5', border: '0.5px solid #85B7EB' },
  chipOrange: { display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 100, fontSize: 11, fontWeight: 500, background: '#FAEEDA', color: '#854F0B', border: '0.5px solid #EF9F27' },
  chipGreen: { display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 100, fontSize: 11, fontWeight: 500, background: '#EAF3DE', color: '#3B6D11', border: '0.5px solid #97C459' },
  suksesBg: { background: '#f9f9f8', border: '0.5px solid rgba(0,0,0,0.12)', borderRadius: 8, padding: '12px 14px', display: 'flex', flexDirection: 'column' as const, gap: 8 },
  suksesDot: { width: 52, height: 52, borderRadius: '50%', background: '#EAF3DE', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontSize: 24, color: '#3B6D11' },
}
