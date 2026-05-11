// app/api/superadmin/dropdowns/options/route.ts
// POST — Buat opsi baru di sebuah grup dropdown (SuperAdmin only)
//
// Dibuat: Sesi #115 — M4 Master Dropdown FASE 3 Step 3.5

import { NextRequest, NextResponse }           from 'next/server'
import { requireSuperAdmin }                    from '@/lib/auth-server'
import { MasterDropdownService_createOption }   from '@/lib/services/master-dropdown-option.service'
import type { BuatOpsiPayload }                 from '@/lib/types/master-dropdown.types'

// ─── POST — Buat opsi baru ───────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res

    const body = await request.json() as BuatOpsiPayload

    if (!body.group_id || !body.slug || !body.label) {
      return NextResponse.json(
        { success: false, message: 'Field group_id, slug, dan label wajib diisi' },
        { status: 400 }
      )
    }

    const data = await MasterDropdownService_createOption(body, auth.uid)
    return NextResponse.json({ success: true, data }, { status: 201 })

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error'
    console.error('[POST /api/superadmin/dropdowns/options] Error:', error)
    const isNotFound   = message.includes('tidak ditemukan')
    const isValidation = [
      'Slug', 'Label', 'Sort', 'value', 'override', 'aktif', 'karakter',
    ].some(k => message.includes(k))
    const status = isNotFound ? 404 : isValidation ? 400 : 500
    return NextResponse.json({ success: false, message }, { status })
  }
}
