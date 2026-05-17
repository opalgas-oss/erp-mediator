// lib/utils/fonnte.server.ts
// Shared utility: kirim pesan WhatsApp via Fonnte API.
// Dibuat: Sesi #173 — SL-D002+K002 refactor duplikasi pola Fonnte di 4 file service.
//
// SEBELUM: fetch('https://api.fonnte.com/send', ...) duplikat inline di:
//   - lib/services/otp.service.ts        (sendOTP channel=whatsapp)
//   - lib/services/account-lock.service.ts (sendLockNotificationWA)
//   - lib/services/tenant-pic.service.ts  (kirimNotifikasiGantiPIC)
//   - lib/services/alert.service.ts       (sendWAAlert)
//
// SESUDAH: semua caller import dan panggil sendFonnteWA() dari file ini.
//
// DESAIN:
//   Token Fonnte WAJIB diambil caller via getCredential('fonnte', 'api_token')
//   sebelum memanggil fungsi ini — tidak di-fetch internal agar kompatibel
//   dengan caller yang sudah ambil token dalam Promise.all (otp.service.ts).
//
// ATURAN: import 'server-only' — tidak boleh dipakai di client component.

import 'server-only'

/**
 * Kirim pesan WhatsApp via Fonnte API.
 *
 * Shared primitive — dipanggil dari:
 *   - OTPService (sendOTP channel=whatsapp)
 *   - AccountLockService (sendLockNotificationWA)
 *   - TenantPICService (kirimNotifikasiGantiPIC)
 *   - AlertService (sendWAAlert)
 *
 * @param target  - Nomor tujuan format 62xxx (tanpa tanda baca)
 * @param message - Isi pesan WhatsApp
 * @param token   - Fonnte api_token dari M3 credential.service
 * @returns { success: boolean; reason?: string }
 *   success=true  → pesan berhasil dikirim (HTTP 2xx dari Fonnte)
 *   success=false → gagal, reason berisi detail error
 */
export async function sendFonnteWA(
  target:  string,
  message: string,
  token:   string
): Promise<{ success: boolean; reason?: string }> {
  try {
    const res = await fetch('https://api.fonnte.com/send', {
      method:  'POST',
      headers: {
        'Authorization': token,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({ target, message, countryCode: '62' }),
    })

    if (!res.ok) {
      const errBody = await res.text().catch(() => '')
      return { success: false, reason: `HTTP ${res.status}: ${errBody}` }
    }

    return { success: true }
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, reason }
  }
}
