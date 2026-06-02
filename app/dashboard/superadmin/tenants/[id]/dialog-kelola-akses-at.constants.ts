// app/dashboard/superadmin/tenants/[id]/dialog-kelola-akses-at.constants.ts
// Konstanta dan style helpers untuk DialogKelolaAksesAdminTenant (B4)
// Dibuat: Sesi #240 — HUTANG-AT-AUTH STEP 2 Fase 2

export type DialogKelolaState =
  | 'default'        // State 1: Inactive off, checklist aktif
  | 'inactive-on'    // State 2: Toggle inactive menyala, alasan wajib, checklist disabled
  | 'loading'        // State 3: Spinner
  | 'sukses-atur'    // State 4: Sukses simpan perubahan akses area
  | 'sukses-inactive' // State 5: Sukses nonaktifkan AT

// K-21 FINAL: 4 alasan cabut akses (sesuai CHECK chk_pic_alasan di DB)
export const ALASAN_OPTIONS = [
  { value: 'resign',           label: 'Resign dari perusahaan' },
  { value: 'mutasi',           label: 'Mutasi jabatan' },
  { value: 'kontrak_berakhir', label: 'Kontrak berakhir' },
  { value: 'lainnya',          label: 'Lainnya' },
] as const

export type AlasanCabut = typeof ALASAN_OPTIONS[number]['value']

// Placeholder area+kategori untuk Skenario C-3 Lapis 1
// Di Lapis 1 ini adalah data dummy — di Lapis 2 akan di-fetch dari DB per AT
export interface AreaAkses {
  id:        string
  area:      string
  kategori:  string
  checked:   boolean
}

export const AREA_PLACEHOLDER: AreaAkses[] = [
  { id: 'a1', area: 'Jakarta Barat', kategori: 'Jasa Service Mobil',  checked: true  },
  { id: 'a2', area: 'Jakarta Barat', kategori: 'Jasa Salon Mobil',    checked: true  },
  { id: 'a3', area: 'Bogor',         kategori: 'Jasa Salon Mobil',    checked: true  },
  { id: 'a4', area: 'Bandung Selatan', kategori: 'Jasa Service Mobil', checked: false },
]

// Design system — mengikuti mockup B4 inline style
export const DB4 = {
  overlay:   { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.38)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 100, padding: '1.5rem 1rem', overflowY: 'auto' as const },
  modal:     { background: '#fff', borderRadius: 12, border: '0.5px solid rgba(0,0,0,0.22)', width: 540, maxWidth: '100%', display: 'flex', flexDirection: 'column' as const, boxShadow: '0 8px 32px rgba(0,0,0,0.12)', marginTop: 'auto', marginBottom: 'auto' },
  hdr:       { padding: '14px 20px', borderBottom: '0.5px solid rgba(0,0,0,0.12)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 },
  body:      { padding: '16px 20px', overflowY: 'auto' as const, maxHeight: 540 },
  ftr:       { padding: '11px 20px', borderTop: '0.5px solid rgba(0,0,0,0.12)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9f9f8', flexShrink: 0 },
  // AT card
  atCard:    (danger?: boolean) => ({ background: danger ? '#FCEBEB' : '#f9f9f8', border: `0.5px solid ${danger ? '#F09595' : 'rgba(0,0,0,0.12)'}`, borderRadius: 8, padding: '12px 14px', marginBottom: 14 }),
  atAv:      (danger?: boolean) => ({ width: 36, height: 36, borderRadius: '50%', background: danger ? '#FCEBEB' : '#E6F1FB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 500, color: danger ? '#A32D2D' : '#185FA5', flexShrink: 0 }),
  // Misc
  divider:   { height: '0.5px', background: 'rgba(0,0,0,0.12)', margin: '14px 0' },
  secLbl:    { fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 },
  secIcon:   (bg: string, color: string) => ({ width: 20, height: 20, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, background: bg, color, flexShrink: 0 }),
  grpLbl:    { fontSize: 11, fontWeight: 500, color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.04em', margin: '10px 0 6px', display: 'flex', alignItems: 'center', gap: 6 },
  // Area item
  areaItem:  (checked: boolean, disabled?: boolean) => ({ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', border: `0.5px solid ${checked ? '#85B7EB' : 'rgba(0,0,0,0.12)'}`, borderRadius: 8, background: checked ? '#E6F1FB' : '#fff', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.45 : 1, marginBottom: 6 }),
  areaCb:    (checked: boolean) => ({ width: 16, height: 16, border: `0.5px solid ${checked ? '#185FA5' : 'rgba(0,0,0,0.22)'}`, borderRadius: 4, flexShrink: 0, marginTop: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: checked ? '#185FA5' : '#fff', color: '#fff' }),
  // Toggle
  toggleRow: (on: boolean) => ({ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', border: `0.5px solid ${on ? '#F09595' : 'rgba(0,0,0,0.12)'}`, borderRadius: 8, marginBottom: 6, background: on ? '#FCEBEB' : '#fff' }),
  toggleEl:  (on: boolean) => ({ width: 36, height: 20, borderRadius: 100, background: on ? '#A32D2D' : 'rgba(0,0,0,0.12)', position: 'relative' as const, cursor: 'pointer', flexShrink: 0, marginTop: 1, border: `0.5px solid ${on ? '#A32D2D' : 'rgba(0,0,0,0.22)'}` }),
  toggleKnob:(on: boolean) => ({ width: 14, height: 14, borderRadius: '50%', background: '#fff', position: 'absolute' as const, top: 2, left: on ? 18 : 2, transition: 'left 0.15s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }),
  // Warn
  warnBox:   { background: '#FAEEDA', border: '0.5px solid #EF9F27', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#854F0B', display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 12 },
  // Buttons
  btn:       (border: string, color: string) => ({ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, border, color, background: 'transparent', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }),
  btnSm:     (border: string, color: string) => ({ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 8, border, color, background: 'transparent', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }),
  // Chip
  chip:      (bg: string, color: string, border: string) => ({ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 100, fontSize: 11, fontWeight: 500, background: bg, color, border: `0.5px solid ${border}` }),
  // Success
  suksesDot: (bg: string, color: string) => ({ width: 52, height: 52, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontSize: 24, background: bg, color }),
  detail:    { background: '#f9f9f8', border: '0.5px solid rgba(0,0,0,0.12)', borderRadius: 8, padding: '12px 14px', marginTop: 14 },
  previewRow:{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '0.5px solid rgba(0,0,0,0.12)', fontSize: 13 },
  fv:        { fontSize: 13, padding: '7px 10px', border: '0.5px solid rgba(0,0,0,0.12)', borderRadius: 8, background: '#fff', fontFamily: 'inherit', width: '100%', color: '#1a1a1a' },
}

export const JABATAN_LABEL: Record<string, string> = {
  penanggung_jawab: 'Penanggung Jawab',
  operator:  'Operator', finance: 'Finance',
  warehouse: 'Warehouse', sales: 'Sales', lainnya: 'Lainnya',
}
