// app/dashboard/superadmin/tenants/[id]/tab-admintenant-history.styles.ts
// Style constants untuk TabAdminTenantHistory — dipisah agar parts.tsx < 10 KB
// Dibuat: Sesi #240
// Refactor S#316 B-04: fmtTgl() lokal diganti re-export formatDateIdDateTime dari lib/utils-client

import { formatDateIdDateTime } from '@/lib/utils-client'

// Re-export agar parts.tsx tidak perlu ubah import
export { formatDateIdDateTime as fmtTgl }

export const cs = {
  card:      { background: '#fff', border: '0.5px solid rgba(0,0,0,0.12)', borderRadius: 12, padding: '1.25rem', marginBottom: '1rem' },
  secHdr:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  secTitle:  { fontSize: 14, fontWeight: 500 },
  secSub:    { fontSize: 12, color: '#6b7280', marginTop: 2 },
  errNote:   { background: '#FCEBEB', border: '0.5px solid #F09595', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#A32D2D', marginBottom: '1rem', display: 'flex', alignItems: 'flex-start', gap: 8 },
  tableWrap: { border: '0.5px solid rgba(0,0,0,0.12)', borderRadius: 8, overflow: 'hidden', marginBottom: '1rem' },
  th:        { background: '#f9f9f8', padding: '9px 14px', textAlign: 'left' as const, fontSize: 11.5, fontWeight: 500, color: '#6b7280', borderBottom: '0.5px solid rgba(0,0,0,0.12)', whiteSpace: 'nowrap' as const },
  td:        { padding: '10px 14px', borderBottom: '0.5px solid rgba(0,0,0,0.12)', verticalAlign: 'middle' as const },
  av:        (active: boolean) => ({ width: 32, height: 32, borderRadius: '50%', background: active ? '#EAF3DE' : '#E6F1FB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 500, color: active ? '#3B6D11' : '#185FA5', flexShrink: 0 }),
  chip:      (bg: string, color: string, border: string) => ({ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 100, fontSize: 11, fontWeight: 500, background: bg, color, border: `0.5px solid ${border}` }),
  btn:       (border: string, color: string) => ({ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', border, color, background: 'transparent' }),
  empty:     { textAlign: 'center' as const, padding: '2.5rem 1rem', color: '#6b7280', fontSize: 13, border: '0.5px dashed rgba(0,0,0,0.2)', borderRadius: 8 },
  tlItem:    { display: 'flex', gap: 14, paddingBottom: 20 },
  tlLeft:    { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', width: 32, flexShrink: 0 },
  tlDot:     (bg: string, color: string, border: string) => ({ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, border: `0.5px solid ${border}`, background: bg, color, zIndex: 1, flexShrink: 0 }),
  tlLine:    { width: 1, background: 'rgba(0,0,0,0.12)', flex: 1, marginTop: 4, minHeight: 16 },
  tlWhen:    { fontSize: 11, color: '#6b7280', marginBottom: 4 },
  tlMain:    { fontSize: 13, color: '#1a1a1a', lineHeight: 1.5 },
  tlReason:  { fontSize: 12, color: '#6b7280', marginTop: 3, fontStyle: 'italic' as const },
}

export const JABATAN_LABEL: Record<string, string> = {
  penanggung_jawab: 'Penanggung Jawab',
  operator:  'Operator',
  finance:   'Finance',
  warehouse: 'Warehouse',
  sales:     'Sales',
  lainnya:   'Lainnya',
}

