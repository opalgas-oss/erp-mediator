// ARSIP sesi-101-dry-fix — lib/utils-client.ts
// Sebelum: tambah formatDateIdShort()
'use client'
export function getCookie(name: string): string {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? decodeURIComponent(match[2]) : ''
}
export function interpolate(teks: string, vars: Record<string, string>): string {
  return teks.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`)
}
