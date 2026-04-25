// app/api/config/[feature_key]/route.ts
// GET  — Ambil semua item konfigurasi berdasarkan feature_key, dikelompokkan per kategori
// PATCH — Update nilai satu item konfigurasi berdasarkan feature_key + item id
//
// PERUBAHAN Sesi #039:
//   - GET: hapus auth check — config_registry dibutuhkan halaman publik (login page) sebelum user login
//   - PATCH: tetap butuh JWT + role SUPERADMIN atau ADMIN_TENANT
//
// PERUBAHAN Sesi #045 — Fix Performa:
//   - GET: tambah Redis L1 cache-aside pattern
//   - PATCH: tambah Redis explicit invalidation + revalidateTag sidebar-data
//
// FIX Sesi #046:
//   - revalidateTag: Next.js butuh argumen kedua (profile)
//
// UPDATE Sesi #060:
//   - PATCH: tambah invalidateConfigCache(feature_key) — clear module-level Map cache
//     di config-registry.ts agar login action tidak baca nilai lama setelah config diubah SA

import { NextRequest, NextResponse }  from 'next/server'
import { revalidateTag }              from 'next/cache'
import { verifyJWT }                  from '@/lib/auth-server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getConfigValue, invalidateConfigCache } from '@/lib/config-registry'
import { getRedisClient, REDIS_TTL }  from '@/lib/redis'

// ─── Handler GET — PUBLIK, tidak butuh auth ───────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ feature_key: string }> }
) {
  try {
    const { feature_key } = await params
    const cacheKey        = `config:api:${feature_key}`

    // L1 Cache: cek Redis dulu (~1–10ms jika hit)
    const redis = await getRedisClient()
    if (redis) {
      try {
        const cached = await redis.get<string>(cacheKey)
        if (cached) {
          const parsed = typeof cached === 'string' ? JSON.parse(cached) : cached
          return NextResponse.json(parsed)
        }
      } catch (redisErr) {
        console.warn('[GET /api/config] Redis get gagal:', redisErr)
      }
    }

    // L2: Query Supabase
    const db = createServerSupabaseClient()
    const { data, error } = await db
      .from('config_registry')
      .select('*')
      .eq('feature_key', feature_key)
      .eq('is_active', true)
      .order('label', { ascending: true })

    if (error) throw error

    if (!data || data.length === 0) {
      return NextResponse.json(
        { success: false, message: `Config '${feature_key}' tidak ditemukan` },
        { status: 404 }
      )
    }

    const groupMap = new Map<string, { group_id: string; group_label: string; items: typeof data }>()
    for (const item of data) {
      const kat = item.kategori as string
      if (!groupMap.has(kat)) {
        groupMap.set(kat, { group_id: kat, group_label: kat, items: [] })
      }
      groupMap.get(kat)!.items.push(item)
    }

    const result = { success: true, data: Array.from(groupMap.values()) }

    // Simpan ke Redis
    if (redis) {
      try {
        const ttlStr = await getConfigValue('platform_general', 'redis_ttl_config_seconds', String(REDIS_TTL.CONFIG))
        const ttl = Number(ttlStr) || REDIS_TTL.CONFIG
        await redis.set(cacheKey, JSON.stringify(result), { ex: ttl })
      } catch (redisErr) {
        console.warn('[GET /api/config] Redis set gagal:', redisErr)
      }
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('[GET /api/config] Error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}

// ─── Handler PATCH — Butuh JWT + role ─────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ feature_key: string }> }
) {
  try {
    const decoded = await verifyJWT()
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const role = decoded.role
    if (role !== 'SUPERADMIN' && role !== 'ADMIN_TENANT') {
      return NextResponse.json({ success: false, message: 'Akses ditolak' }, { status: 403 })
    }

    const { feature_key } = await params
    const payload = await request.json()

    if (!payload.id || payload.nilai === undefined) {
      return NextResponse.json({ success: false, message: 'Field id dan nilai wajib ada' }, { status: 400 })
    }

    const db = createServerSupabaseClient()
    const { error } = await db
      .from('config_registry')
      .update({
        nilai:      String(payload.nilai),
        updated_at: new Date().toISOString(),
        updated_by: decoded.uid,
      })
      .eq('id', payload.id)
      .eq('feature_key', feature_key)

    if (error) throw error

    // Invalidasi semua layer cache — wajib dilakukan setelah update config

    // 1. Module-level Map cache di config-registry.ts (untuk login action)
    invalidateConfigCache(feature_key)

    // 2. Next.js server cache
    revalidateTag(`config:${feature_key}`, 'default')
    revalidateTag('config', 'default')
    revalidateTag('sidebar-data', 'default')

    // 3. Redis L1 cache
    const redis    = await getRedisClient()
    const cacheKey = `config:api:${feature_key}`
    if (redis) {
      try {
        await redis.del(cacheKey)
      } catch (redisErr) {
        console.warn('[PATCH /api/config] Redis del gagal:', redisErr)
      }
    }

    return NextResponse.json({ success: true, message: 'Konfigurasi berhasil disimpan' })

  } catch (error) {
    console.error('[PATCH /api/config] Error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
