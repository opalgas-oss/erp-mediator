// lib/activity.ts
// Mencatat posisi user secara realtime (User Presence) dan aksi penting ke activity log
// Dipakai di SEMUA halaman setiap kali user navigasi atau lakukan aksi
//
// Path Presence: /tenants/{tenantId}/user_presence/{uid}       — OVERWRITE
// Path Log:      /tenants/{tenantId}/activity_logs/{logId}     — APPEND-ONLY

import { db } from '@/lib/firebase';
import { getEffectivePolicy } from '@/lib/policy';
import {
  collection,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';

// ============================================================
// TYPE DEFINITIONS
// ============================================================

/**
 * Informasi halaman yang sedang aktif dikunjungi user.
 * Dipakai sebagai parameter di updateUserPresence().
 */
export interface PageInfo {
  /** Path URL halaman — contoh: "/order/new" */
  page: string;
  /** Nama tampilan halaman dalam Bahasa Indonesia — contoh: "Buat Order Baru" */
  label: string;
  /** Nama modul yang memiliki halaman ini — contoh: "ORDER" */
  module: string;
}

/**
 * Data lengkap satu entri activity log.
 * Semua field wajib diisi oleh pemanggil sebelum dikirim ke writeActivityLog().
 */
export interface ActivityLogData {
  /** UID user yang melakukan aksi */
  uid: string;
  /** Nama lengkap user */
  nama: string;
  /** ID tenant tempat user beroperasi */
  tenant_id: string;
  /** ID sesi aktif user saat aksi dilakukan */
  session_id: string;
  /** Role user saat aksi dilakukan */
  role: string;
  /** Jenis aksi yang dilakukan */
  action_type: 'PAGE_VIEW' | 'BUTTON_CLICK' | 'FORM_SUBMIT' | 'FORM_ERROR' | 'API_CALL';
  /** Modul tempat aksi dilakukan */
  module: 'AUTH' | 'ORDER' | 'PAYMENT' | 'VENDOR' | 'ADMIN' | 'DISPUTE' | 'CHAT';
  /** Path URL halaman saat aksi dilakukan */
  page: string;
  /** Nama tampilan halaman */
  page_label: string;
  /** Deskripsi detail aksi — contoh: "Klik tombol Kirim Order" */
  action_detail: string;
  /** Hasil aksi */
  result: 'SUCCESS' | 'FAILED' | 'BLOCKED';
  /** Informasi perangkat user — contoh: "Chrome 124 / Windows 10" */
  device: string;
  /** Kota berdasarkan GPS atau IP — contoh: "Jakarta" */
  gps_kota: string;
  /** Alamat IP user (opsional — diisi jika tersedia dari server) */
  ip_address?: string;
}

// ============================================================
// FUNGSI UTAMA
// ============================================================

/**
 * Memperbarui data kehadiran (presence) user secara realtime di Firestore.
 * Dokumen di-OVERWRITE dengan setDoc + merge:true — bukan append.
 * Dipanggil setiap kali user berpindah halaman.
 *
 * TODO: Tambah cache setelah lib/cache.ts selesai (Sprint 0 Task 5)
 *
 * @param uid        - UID user yang sedang aktif
 * @param tenantId   - ID tenant tempat user beroperasi
 * @param sessionId  - ID sesi aktif user
 * @param nama       - Nama lengkap user
 * @param role       - Role user saat ini
 * @param device     - Informasi perangkat user
 * @param gpsKota    - Kota berdasarkan GPS atau IP
 * @param pageInfo   - Informasi halaman yang sedang dikunjungi
 *
 * @example
 * await updateUserPresence(
 *   'uid123', 'tenant_erpmediator', 'sess_abc',
 *   'Budi Santoso', 'vendor', 'Chrome / Android',
 *   'Surabaya', { page: '/order/new', label: 'Buat Order Baru', module: 'ORDER' }
 * );
 */
export async function updateUserPresence(
  uid: string,
  tenantId: string,
  sessionId: string,
  nama: string,
  role: string,
  device: string,
  gpsKota: string,
  pageInfo: PageInfo
): Promise<void> {
  // Referensi dokumen presence — satu dokumen per user per tenant
  const presenceRef = doc(db, 'tenants', tenantId, 'user_presence', uid);

  // Tulis dengan merge:true agar field lain tidak terhapus saat update parsial
  await setDoc(
    presenceRef,
    {
      uid,
      tenant_id: tenantId,
      session_id: sessionId,
      nama,
      role,
      device,
      gps_kota: gpsKota,
      current_page: pageInfo.page,
      current_page_label: pageInfo.label,
      current_page_module: pageInfo.module,
      last_active: serverTimestamp(),
      status: 'online',
    },
    { merge: true }
  );
}

/**
 * Menulis satu entri baru ke activity log tenant.
 * Sifat: APPEND-ONLY — selalu buat dokumen baru, tidak pernah update yang lama.
 *
 * Sebelum menulis, fungsi ini mengecek policy activity_logging tenant.
 * Kalau jenis aksi tidak diizinkan oleh policy → return tanpa menulis ke Firestore.
 *
 * TODO: Tambah cache setelah lib/cache.ts selesai (Sprint 0 Task 5)
 *
 * @param tenantId - ID tenant tempat log akan ditulis
 * @param data     - Data lengkap aktivitas yang akan dicatat
 *
 * @example
 * await writeActivityLog('tenant_erpmediator', {
 *   uid: 'uid123', nama: 'Budi', tenant_id: 'tenant_erpmediator',
 *   session_id: 'sess_abc', role: 'vendor',
 *   action_type: 'PAGE_VIEW', module: 'ORDER',
 *   page: '/order/new', page_label: 'Buat Order Baru',
 *   action_detail: 'Membuka halaman buat order', result: 'SUCCESS',
 *   device: 'Chrome / Android', gps_kota: 'Surabaya',
 * });
 */
export async function writeActivityLog(
  tenantId: string,
  data: ActivityLogData
): Promise<void> {
  // Baca policy activity_logging untuk tenant ini
  // TODO: Tambah cache setelah lib/cache.ts selesai (Sprint 0 Task 5)
  const policy = await getEffectivePolicy(tenantId, 'activity_logging');

  // Cek apakah jenis aksi ini diizinkan oleh policy — kalau tidak, keluar lebih awal
  if (data.action_type === 'PAGE_VIEW' && !policy.log_page_views) return;
  if (data.action_type === 'BUTTON_CLICK' && !policy.log_button_clicks) return;
  if (data.action_type === 'FORM_SUBMIT' && !policy.log_form_submits) return;
  if (data.action_type === 'FORM_ERROR' && !policy.log_errors) return;

  // Referensi koleksi activity_logs — ID dokumen di-generate otomatis oleh Firestore
  const logsRef = collection(db, 'tenants', tenantId, 'activity_logs');

  // Tulis dokumen baru (APPEND) — tidak pernah overwrite dokumen yang sudah ada
  await addDoc(logsRef, {
    ...data,
    timestamp: serverTimestamp(),
  });
}

/**
 * Mengubah status user menjadi offline di dokumen presence.
 * Dipanggil saat user logout atau saat tab/browser ditutup.
 *
 * @param uid      - UID user yang akan diset offline
 * @param tenantId - ID tenant tempat user beroperasi
 *
 * @example
 * // Dipanggil saat logout
 * await setUserOffline('uid123', 'tenant_erpmediator');
 *
 * // Dipanggil saat tab ditutup (pakai beforeunload event)
 * window.addEventListener('beforeunload', () => {
 *   setUserOffline(uid, tenantId);
 * });
 */
export async function setUserOffline(
  uid: string,
  tenantId: string
): Promise<void> {
  // Referensi dokumen presence yang sama dengan updateUserPresence()
  const presenceRef = doc(db, 'tenants', tenantId, 'user_presence', uid);

  // Update hanya field status — field lain dibiarkan apa adanya
  await updateDoc(presenceRef, {
    status: 'offline',
    last_active: serverTimestamp(),
  });
}
