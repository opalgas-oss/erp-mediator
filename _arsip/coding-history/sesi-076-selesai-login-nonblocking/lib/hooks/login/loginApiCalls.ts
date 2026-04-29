// ARSIP sesi-076-selesai-login-nonblocking — loginApiCalls.ts sebelum modifikasi
// Perubahan: ParamSessionLog tambah opsional sessionId, fetchSessionLog kirim sessionId ke server
'use client'
import { getDeviceInfo } from '@/lib/session-client'
export interface ParamSessionLog {
  uid:      string
  tenantId: string | null
  role:     string
  gpsKota:  string
}
export async function fetchSessionLog(params: ParamSessionLog) {
  const res = await fetch('/api/auth/session-log', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      uid: params.uid, tenant_id: params.tenantId,
      role: params.role, device: getDeviceInfo(), gps_kota: params.gpsKota,
    }),
  })
  return res.json()
}
export async function fetchUserPresence(params: import('./loginApiCalls').ParamUserPresence): Promise<void> {
  await fetch('/api/auth/user-presence', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      uid: params.uid, tenant_id: params.tenantId,
      nama: params.nama, role: params.role, device: getDeviceInfo(),
      current_page: params.currentPage, current_page_label: params.currentPageLabel,
    }),
  })
}
// ... (file lengkap ada di versi aktif sebelum edit)
