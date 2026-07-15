// lib/services/alert-queue-drain.service.ts
// Service: ORKESTRATOR drain queue notifikasi alert — WA (Fonnte) + Email (Resend)
// Dibuat: Sesi #374 — dipecah dari alert-queue.service.ts (sisi TULIS vs sisi BACA).
// Diubah: Sesi #375 — isi kanal dipindah ke 2 file per kanal (HUTANG-PECAH-KANAL-DRAIN);
//   file ini menyisakan orkestrasi saja. Pindah murni — logika NOL berubah.
//
// Kenapa file ini TETAP di path yang sama (bukan ikut di-rename):
//   pemanggil (metrics-collector.service.ts) dan registry cr_functions.drainQueues
//   menunjuk ke path ini. Mempertahankannya = nol perubahan caller + nol kerja mundur.
//
// Peta file keluarga queue alert (by kategori, ATURAN 31):
//   alert-queue.service.ts             sisi TULIS : enqueueWA / enqueueEmail, tipe, QUEUE_KEY_*
//   alert-queue-drain.service.ts       ORKESTRATOR: drainQueues (file ini)
//   alert-queue-drain-wa.service.ts    kanal WA    : drainWAQueue + DLQ WA
//   alert-queue-drain-email.service.ts kanal Email : drainEmailQueue + DLQ Email
//
// Dipakai oleh: metrics-collector.service.ts (collectL1Metrics, di dalam after()).
//   Route collect-metrics wajib maxDuration=60 supaya drain tuntas (FIX S#359).
//
// ATURAN: import 'server-only' — tidak boleh dipakai di client component.

import 'server-only'
import { drainWAQueue }    from '@/lib/services/alert-queue-drain-wa.service'
import { drainEmailQueue } from '@/lib/services/alert-queue-drain-email.service'

// ─── drainQueues ─────────────────────────────────────────────────────────────

/**
 * Drain kedua queue (WA + Email) — dipanggil di akhir collectL1Metrics setiap cron run.
 * Kedua kanal jalan paralel: rate limit, retry, dan penanganan error berbeda per kanal.
 * allSettled — kegagalan satu kanal tidak menghentikan kanal lain.
 */
export async function drainQueues(): Promise<void> {
  await Promise.allSettled([
    drainWAQueue(),
    drainEmailQueue(),
  ])
}
