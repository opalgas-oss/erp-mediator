// app/api/config/bulk/route.ts
// POST — Update banyak config_registry sekaligus via sp_bulk_update_config (atomic).
// Rollback semua jika ada satu item yang gagal.
// Menggantikan pola Promise.all multiple PATCH di ConfigPageClient.
//
// Dibuat: Sesi #097 — PL-S08 M1 Config & Policy Management

import { NextRequest, NextResponse }  from 'next/server'
import { revalidateTag }              from 'next/cache'
import { verifyJWT }                  from '@/lib/auth-server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { invalidateConfigCache }      from '@/lib/config-registry'
import { getRedisClient }             from '@/lib/redis'

// Tipe satu item update
interface UpdateItem {
  id:                   string    // uuid config_registry
  feature_key:          string    // fitur key grup, mis. 'security_login'
  nilai?:               string    // nilai baru (string) — opsional jika hanya ubah is_active/tenant_can_override
  is_active?:           boolean   // aktif/nonaktif item
  tenant_can_override?: boolean   // izin AdminTenant override config ini per-tenant
  // CATATAN: akses_ubah/akses_baca SENGAJA TIDAK ada di sini.
  // Kolom RLS ACL itu di-manage backend (seeder, AdminTenant override flow), bukan dari UI SuperAdmin.
  // Lihat KONSEP_BISNIS_PLATFORM.md.
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Autentikasi — hanya SUPERADMIN
    const decoded = await verifyJWT()
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }
    if (decoded.role !== 'SUPERADMIN') {
      return NextResponse.json({ success: false, message: 'Akses ditolak' }, { status: 403 })
    }

    // Validasi payload
    const payload = await request.json() as { updates?: unknown }
    if (!Array.isArray(payload.updates) || payload.updates.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Field updates wajib berupa array dan tidak boleh kosong' },
        { status: 400 }
      )
    }

    const updates = payload.updates as UpdateItem[]

    // Validasi setiap item — minimal harus punya id + feature_key
    for (const item of updates) {
      if (!item.id || !item.feature_key) {
        return NextResponse.json(
          { success: false, message: 'Setiap item wajib punya id dan feature_key' },
          { status: 400 }
        )
      }
      if (item.nilai === undefined && item.is_active === undefined && item.tenant_can_override === undefined) {
        return NextResponse.json(
          { success: false, message: 'Setiap item wajib mengubah minimal satu field (nilai / is_active / tenant_can_override)' },
          { status: 400 }
        )
      }
    }

    // Panggil sp_bulk_update_config — atomic: rollback semua kalau ada yang gagal
    const db = createServerSupabaseClient()
    const { data, error } = await db.rpc('sp_bulk_update_config', {
      p_updates:  updates,
      p_oleh_uid: decoded.uid,
    })

    if (error) {
      console.error('[POST /api/config/bulk] SP error:', error.message)
      return NextResponse.json(
        { success: false, message: 'Gagal menyimpan konfigurasi: ' + error.message },
        { status: 500 }
      )
    }

    // Invalidasi cache untuk semua feature_key yang diupdate
    const featureKeys = [...new Set(updates.map((u) => u.feature_key))]

    for (const fk of featureKeys) {
      // Module-level Map cache di config-registry.ts
      invalidateConfigCache(fk)

      // Next.js server cache
      revalidateTag(`config:${fk}`, 'default')
    }

    // Cache tag global
    revalidateTag('config', 'default')
    revalidateTag('sidebar-data', 'default')

    // Redis L1 cache — hapus semua key yang terdampak
    const redis = await getRedisClient()
    if (redis) {
      try {
        await Promise.all(
          featureKeys.map((fk) => redis.del(`config:api:${fk}`))
        )
      } catch (redisErr) {
        console.warn('[POST /api/config/bulk] Redis del gagal:', redisErr)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Konfigurasi berhasil disimpan',
      data,
    })

  } catch (error) {
    console.error('[POST /api/config/bulk] Error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
