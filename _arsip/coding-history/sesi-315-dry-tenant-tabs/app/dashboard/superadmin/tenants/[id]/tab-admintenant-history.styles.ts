// ARSIP PRA-B-04 S#316 — tab-admintenant-history.styles.ts
// Perubahan B-04: fmtTgl() lokal → diganti formatDateIdDateTime dari lib/utils-client
// tab-admintenant-history.parts.tsx: 1x toLocaleDateString inline → formatDateIdShort

export const cs = { card: {}, secHdr: {}, secTitle: {}, secSub: {}, errNote: {}, tableWrap: {}, th: {}, td: {}, av: () => ({}), chip: () => ({}), btn: () => ({}), empty: {}, tlItem: {}, tlLeft: {}, tlDot: () => ({}), tlLine: {}, tlWhen: {}, tlMain: {}, tlReason: {} }
export const JABATAN_LABEL: Record<string, string> = {}
export function fmtTgl(iso: string) { return new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' WIB' }
