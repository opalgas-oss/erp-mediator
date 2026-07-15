// lib/utils/async.utils.ts
// Utility kontrol alur async — primitif jeda (delay) untuk kode server.
//
// Fungsi:
//   - sleep — jeda eksekusi selama N milidetik
//
// Dibuat: Sesi #375 — promosi helper privat, BUKAN fungsi baru (ATURAN 17 skenario 17.2.A).
//   SEBELUM: sleep() privat di lib/services/alert-queue-drain.service.ts — ada di kode,
//   tidak terdaftar di cr_functions. Saat file drain dipecah per kanal (drain-wa /
//   drain-email), kedua kanal membutuhkannya. Menaruh sleep di salah satu kanal atau di
//   orkestrator akan menimbulkan impor melingkar; menyalinnya ke dua kanal = duplikasi
//   logic (langgar ATURAN 11/19). Rumah yang benar = lapisan utils: utils TIDAK PERNAH
//   mengimpor services, jadi arah impor selalu satu arah.
//
// Dipakai oleh:
//   - lib/services/alert-queue-drain-wa.service.ts    (jeda antar kirim WA — config fonnte_delay_seconds)
//   - lib/services/alert-queue-drain-email.service.ts (backoff retry + jeda antar item — config resend_*)
//
// Terdaftar di cr_functions: CONFIG/infrastructure, is_shared=true (pola sama fetchWithTimeout).
//
// ATURAN: import 'server-only' — konsisten dengan sibling di lib/utils (date.utils.ts).
// Jeda dipakai di jalur cron/after(); tidak ada kebutuhan sisi client.

import 'server-only'

/**
 * Jeda eksekusi selama N milidetik.
 *
 * Dipakai untuk menghormati rate limit provider (Fonnte, Resend) dan
 * exponential backoff saat retry pengiriman.
 *
 * @param ms - Durasi jeda dalam milidetik
 * @returns Promise yang resolve setelah `ms` milidetik
 *
 * @example
 *   await sleep(5000)   // tunggu 5 detik sebelum kirim WA berikutnya
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
