// lib/services/session.service.ts
// Service layer untuk session log — server-side only.
// Panggil repository B-02 (session-log).
// Dibuat: Sesi #052 — BLOK C-05 TODO_ARSITEKTUR_LAYER_v1
//
// ARSITEKTUR:
//   Route Handler → SessionService → SessionLogRepository → DB
//   Ini MENGGANTIKAN writeSessionLog di lib/session.ts (client-side) untuk server usage.

import 'server-only'
import {
  create,
  markLogout as repoMarkLogout,
  findActiveByUid,
  type SessionLogRow,
  type CreateSessionParams,
} from '@/lib/repositories/session-log.repository'

// ─── Tipe untuk writeSessionLog ──────────────────────────────────────────────

export interface WriteSessionLogParams {
  uid:       string
  tenantId:  string | null
  role:      string
  device:    string
  gpsKota:   string
}

// ─── FUNGSI: writeSessionLog ─────────────────────────────────────────────────
// Buat session log baru — generate sessionId, insert via repository.
/**
 * Buat session log baru saat login berhasil — generate sessionId + insert via repository.
 * @param params - WriteSessionLogParams berisi uid, tenantId, role, device, gpsKota
 * @returns sessionId yang dihasilkan (UUID)
 * @throws Error jika insert DB gagal
 */
export async function writeSessionLog(params: WriteSessionLogParams): Promise<string> {
  const sessionId = crypto.randomUUID()

  const createParams: CreateSessionParams = {
    uid:       params.uid,
    tenantId:  params.tenantId,
    role:      params.role,
    device:    params.device,
    gpsKota:   params.gpsKota,
    sessionId,
  }

  await create(createParams)
  return sessionId
}

// ─── FUNGSI: markLogout ──────────────────────────────────────────────────────
// Tandai semua sesi aktif user sebagai logout (set logout_at).
/**
 * Tandai semua sesi aktif user sebagai logout.
 * Non-throwing: logout harus tetap lanjut meski log gagal.
 * @param uid - UID user yang logout
 */
export async function markLogout(uid: string): Promise<void> {
  try {
    await repoMarkLogout(uid)
  } catch (err) {
    console.error('[SessionService] markLogout gagal:', err)
    // Tidak throw — logout harus tetap lanjut meski log gagal
  }
}

// ─── FUNGSI: findActiveSessions ──────────────────────────────────────────────
// Cari semua sesi aktif user (logout_at IS NULL).
// Dipakai untuk concurrent session check.
/**
 * Cari semua sesi aktif user — dipakai untuk concurrent session check.
 * @param uid - UID user yang dicari
 * @param tenantId - Tenant ID, null untuk SUPERADMIN
 * @returns Array SessionLogRow. Kosong jika tidak ada sesi aktif atau query gagal.
 */
export async function findActiveSessions(
  uid: string,
  tenantId: string | null
): Promise<SessionLogRow[]> {
  try {
    return await findActiveByUid({ uid, tenantId })
  } catch (err) {
    console.error('[SessionService] findActiveSessions gagal:', err)
    return []
  }
}

// ─── Re-export tipe dari repository ──────────────────────────────────────────
export type { SessionLogRow }
