// app/api/superadmin/dropdowns/groups/[id]/route.ts
// GET    — Detail satu grup beserta opsinya (SuperAdmin only)
// PATCH  — Update grup dropdown (SuperAdmin only)
// DELETE — 2 mode (S#124):
//          mode=hard → HARD DELETE (DROP row, cascade options via FK) — Tombol Hapus saat AMAN
//          mode=soft (default) → SOFT DELETE (set is_active=false) — Tombol Nonaktifkan
//
// Dibuat: Sesi #115 — M4 Master Dropdown FASE 3 Step 3.5

import { NextRequest, NextResponse }                     from 'next/server'
import { requireSuperAdmin }                              from '@/lib/auth-server'
import {
  MasterDropdownService_getGroupDetail,
  MasterDropdownService_updateGroup,
  MasterDropdownService_deactivateGroup,
  MasterDropdownService_destroyGroup,
} from '@/lib/services/master-dropdown-group.service'
import {
  UsageTrackingService_getSafetyStatusSingle,
} from '@/lib/services/usage-tracking.service'
import type { UbahGrupPayload } from '@/lib/types/master-dropdown.types'

type RouteContext = { params: Promise<{ id: string }> }

// ─── GET — Detail grup + opsi ────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res

    const { id } = await params
    const data = await MasterDropdownService_getGroupDetail(id)

    if (!data) {
      return NextResponse.json(
        { success: false, message: 'Grup dropdown tidak ditemukan' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data })

  } catch (error) {
    console.error('[GET /api/superadmin/dropdowns/groups/[id]] Error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}

// ─── PATCH — Update grup ─────────────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res

    const { id } = await params
    const body = await request.json() as UbahGrupPayload

    const data = await MasterDropdownService_updateGroup(id, body, auth.uid)
    return NextResponse.json({ success: true, data })

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error'
    console.error('[PATCH /api/superadmin/dropdowns/groups/[id]] Error:', error)
    const isNotFound   = message.includes('tidak ditemukan')
    const isValidation = ['Nama', 'Sort', 'Kategori', 'karakter'].some(k => message.includes(k))
    const status = isNotFound ? 404 : isValidation ? 400 : 500
    return NextResponse.json({ success: false, message }, { status })
  }
}

// ─── DELETE ─ Soft delete (Nonaktifkan) atau Hard delete (?mode=hard) ────────
//
// S#124: Ada 2 mode delete:
//   - mode=hard → HARD DELETE (DROP row dari DB, cascade options via FK)
//                 Dipakai oleh Tombol Hapus saat verdict cache = AMAN.
//                 Required: verdict harus AMAN (semua guard di-enforce).
//   - mode=soft (default) → SOFT DELETE (set is_active=false)
//                 Dipakai oleh Tombol Nonaktifkan.
//                 Required: verdict bukan TIDAK_BISA (boleh AMAN/TIDAK_AMAN).
//
// Cache registry_safety_status selalu up-to-date karena trigger auto-recalc
// saat registry_dependencies berubah.

export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const mode = searchParams.get('mode') === 'hard' ? 'hard' : 'soft'
    const isHard = mode === 'hard'

    // ── Ambil detail grup ─────────────────────────────────────────────────────
    const grupDetail = await MasterDropdownService_getGroupDetail(id)
    if (!grupDetail) {
      return NextResponse.json(
        { success: false, message: 'Grup dropdown tidak ditemukan' },
        { status: 404 }
      )
    }

    // ── Guard 1: verdict grup dari cache ──────────────────────────────────────
    const grupVerdict = await UsageTrackingService_getSafetyStatusSingle('master_dropdown_groups', id)
    if (isHard && grupVerdict !== 'AMAN') {
      const msg = grupVerdict === 'TIDAK_AMAN'
        ? 'Grup ini tidak dapat dihapus permanen — sedang aktif digunakan oleh modul lain. Gunakan tombol Nonaktifkan terlebih dahulu.'
        : 'Grup ini tidak dapat dihapus — masih ada dalam kode modul yang sedang dibangun. Buka panel Pemetaan Pemakaian untuk melihat detail.'
      return NextResponse.json({ success: false, message: msg }, { status: 400 })
    }
    if (!isHard && grupVerdict === 'TIDAK_BISA') {
      return NextResponse.json({
        success: false,
        message: 'Grup ini tidak dapat dinonaktifkan — masih ada dalam kode modul yang sedang dibangun. Hubungi developer untuk update status terlebih dahulu.',
      }, { status: 400 })
    }

    // ── Guard 2: table-level dep options (source_id=null) ─────────────────────
    const tableLevelVerdict = await UsageTrackingService_getSafetyStatusSingle('master_dropdown_options', null)
    if (isHard && tableLevelVerdict !== 'AMAN') {
      const msg = tableLevelVerdict === 'TIDAK_AMAN'
        ? 'Grup ini tidak dapat dihapus permanen — opsi-opsinya sedang aktif digunakan oleh modul lain. Buka panel Pemetaan Pemakaian untuk melihat detail.'
        : 'Grup ini tidak dapat dihapus — opsi-opsinya masih digunakan dalam kode modul yang sedang dibangun. Buka panel Pemetaan Pemakaian untuk melihat detail.'
      return NextResponse.json({ success: false, message: msg }, { status: 400 })
    }
    if (!isHard && tableLevelVerdict === 'TIDAK_BISA') {
      return NextResponse.json({
        success: false,
        message: 'Grup ini tidak dapat dinonaktifkan — opsi-opsinya masih digunakan dalam kode modul yang sedang dibangun.',
      }, { status: 400 })
    }

    // ── Guard 3: verdict masing-masing opsi non-sistem ────────────────────────
    const opsiNonSistem = grupDetail.opsi.filter(o => !o.is_system)
    if (opsiNonSistem.length > 0) {
      const opsiVerdicts = await Promise.all(
        opsiNonSistem.map(o =>
          UsageTrackingService_getSafetyStatusSingle('master_dropdown_options', o.id)
        )
      )
      const blocker = isHard
        ? opsiVerdicts.find(v => v !== 'AMAN')
        : opsiVerdicts.find(v => v === 'TIDAK_BISA')
      if (blocker) {
        const action = isHard ? 'dihapus permanen' : 'dinonaktifkan'
        const msg = blocker === 'TIDAK_AMAN'
          ? `Grup ini tidak dapat ${action} — beberapa opsi sedang aktif digunakan oleh modul lain.`
          : `Grup ini tidak dapat ${action} — beberapa opsi masih digunakan dalam kode modul yang sedang dibangun.`
        return NextResponse.json({ success: false, message: msg }, { status: 400 })
      }
    }

    // ── Eksekusi sesuai mode ──────────────────────────────────────────────────
    if (isHard) {
      const result = await MasterDropdownService_destroyGroup(id, auth.uid)
      return NextResponse.json({ success: true, data: result, mode: 'hard' })
    } else {
      const result = await MasterDropdownService_deactivateGroup(id, auth.uid)
      return NextResponse.json({ success: true, data: result, mode: 'soft' })
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error'
    console.error('[DELETE /api/superadmin/dropdowns/groups/[id]] Error:', error)
    const isSystem = message.includes('sistem')
    const status   = isSystem ? 403 : 500
    return NextResponse.json({ success: false, message }, { status })
  }
}
