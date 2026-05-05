// lib/services/message-library.service.ts
// Service layer untuk message_library — SuperAdmin CRUD operations.
//
// ARSITEKTUR:
//   RSC page / API Route → MessageLibraryService_* → messageLibraryRepo_* → DB
//
// Catatan: fungsi cache-based (getMessage, getMessagesByKategori) tetap di lib/message-library.ts
// karena dipakai lintas modul sebagai app-wide message store.
// File ini khusus untuk operasi SuperAdmin yang membutuhkan data lengkap tanpa cache.
//
// Dibuat: Sesi #101 — DRY fix Langkah C

import 'server-only'
import { messageLibraryRepo_getAllForAdmin } from '@/lib/repositories/message-library.repository'
import type { MessageItem }                 from '@/lib/message-library'

/**
 * Ambil semua pesan untuk halaman CRUD SuperAdmin.
 * Tanpa cache — data selalu fresh dari DB.
 *
 * Dipakai oleh:
 *   - app/dashboard/superadmin/messages/page.tsx (RSC)
 *   - app/api/superadmin/messages/route.ts (GET handler)
 *
 * @returns Array MessageItem diurutkan kategori + key
 * @throws Error jika query DB gagal
 */
export async function MessageLibraryService_getAllForAdmin(): Promise<MessageItem[]> {
  return messageLibraryRepo_getAllForAdmin()
}
