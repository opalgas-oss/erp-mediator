// app/api/superadmin/dropdowns/options/[id]/route.ts
// PATCH  — Update opsi dropdown (SuperAdmin only)
// DELETE — 2 mode (S#284, konsisten dgn groups/[id]/route.ts S#124):
//          mode=hard → HARD DELETE permanen — dipakai saat verdict AMAN
//          mode=soft (default) → SOFT DELETE = nonaktifkan (is_active=false)
//
// Dibuat: Sesi #115 — M4 Master Dropdown FASE 3 Step 3.5
// Update: Sesi #284 — tambah DELETE handler (hard delete + soft delete opsi)

import { NextRequest, NextResponse }                        from 'next/server'
import { requireSuperAdmin }                                 from '@/lib/auth-server'
import {
  MasterDropdownService_updateOption,
  MasterDropdownService_destroyOption,
} from '@/lib/services/master-dropdown-option.service'
import {
  UsageTrackingService_getSafetyStatusSingle,
} from '@/lib/services/usage-tracking.service'
import type { UbahOpsiPayload } from '@/lib/types/master-dropdown.types'
import { classifyHttpError }    from '@/lib/utils/http.server'

type RouteContext = { params: Promise<{ id: string }> }

// ─── PATCH — Update opsi ─────────────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res

    const { id } = await params
    const body = await request.json() as UbahOpsiPayload

    const data = await MasterDropdownService_updateOption(id, body, auth.uid)
    return NextResponse.json({ success: true, data })

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error'
    console.error('[PATCH /api/superadmin/dropdowns/options/[id]] Error:', error)
    return NextResponse.json(
      { success: false, message },
      { status: classifyHttpError(message) }
    )
  }
}

// ─── DELETE — Soft delete (Nonaktifkan) atau Hard delete (?mode=hard) ────────
//
// S#284: 2 mode, konsisten dengan pola groups/[id]/route.ts (S#124):
//   - mode=hard → HARD DELETE permanen (DROP row)
//                 Guard: verdict opsi harus AMAN dari registry_safety_status
//   - mode=soft (default) → SOFT DELETE = set is_active=false via PATCH
//                 Guard: verdict bukan TIDAK_BISA
//
// Opsi tidak punya tabel anak, jadi tidak butuh Guard cascade seperti grup.

export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const mode   = searchParams.get('mode') === 'hard' ? 'hard' : 'soft'
    const isHard = mode === 'hard'

    // ── Guard: verdict opsi dari cache ───────────────────────────────────────
    const verdict = await UsageTrackingService_getSafetyStatusSingle('master_dropdown_options', id)

    if (isHard && verdict !== 'AMAN') {
      const msg = verdict === 'TIDAK_AMAN'
        ? 'Opsi ini tidak dapat dihapus permanen — sedang aktif digunakan oleh modul lain.'
        : 'Opsi ini tidak dapat dihapus — masih digunakan dalam kode modul yang sedang dibangun.'
      return NextResponse.json({ success: false, message: msg }, { status: 400 })
    }

    if (!isHard && verdict === 'TIDAK_BISA') {
      return NextResponse.json({
        success: false,
        message: 'Opsi ini tidak dapat dinonaktifkan — masih digunakan dalam kode modul yang sedang dibangun.',
      }, { status: 400 })
    }

    // ── Eksekusi sesuai mode ──────────────────────────────────────────────────
    if (isHard) {
      const result = await MasterDropdownService_destroyOption(id)
      return NextResponse.json({ success: true, data: result, mode: 'hard' })
    } else {
      // Soft delete = nonaktifkan via updateOption
      const data = await MasterDropdownService_updateOption(id, { is_active: false }, auth.uid)
      return NextResponse.json({ success: true, data, mode: 'soft' })
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error'
    console.error('[DELETE /api/superadmin/dropdowns/options/[id]] Error:', error)
    return NextResponse.json(
      { success: false, message },
      { status: classifyHttpError(message) }
    )
  }
}
