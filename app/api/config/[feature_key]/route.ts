// app/api/config/[feature_key]/route.ts
// GET  — Ambil semua item konfigurasi berdasarkan feature_key, dikelompokkan per kategori
// PATCH — Update nilai satu item konfigurasi berdasarkan feature_key + item id
//
// PERUBAHAN Sesi #039:
//   - GET: hapus auth check — config_registry dibutuhkan halaman publik (login page) sebelum user login
//   - PATCH: tetap butuh JWT + role SUPERADMIN atau ADMIN_TENANT
//
// PERUBAHAN Sesi #045 — Fix Performa (mengacu PERFORMANCE_STANDARDS_v1.md Poin 7):
//   - GET: tambah Redis L1 cache-aside pattern
//     Urutan: Redis (1–10ms) → miss → Supabase (50–150ms) → simpan ke Redis TTL dari DB
//   - GET: TTL Redis dibaca dari config_registry (platform_general.redis_ttl_config_seconds)
//     Tidak hardcode — nilai ada di DB, SuperAdmin bisa ubah via Dashboard
//   - PATCH: tambah Redis explicit invalidation + revalidateTag sidebar-data
//     Saat config diubah: Redis del + Next.js cache revalidate → data baru langsung aktif
//
// FIX Sesi #046:
//   - revalidateTag: Next.js 16.2.1 membutuhkan argumen kedua (profile: string | CacheLifeConfig)
//     Semua pemanggilan revalidateTag ditambah 'default' sebagai profile

import { NextRequest, NextResponse }  from 'next/server'
import { revalidateTag }              from 'next/cache'
import { verifyJWT }                  from '@/lib/auth-server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getConfigValue }             from '@/lib/config-registry'
import { getRedisClient, REDIS_TTL }  from '@/lib/redis'

// ─── Handler GET — PUBLIK, tidak butuh auth ───────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ feature_key: string }> }
) {
  try {
    const { feature_key } = await params
    const cacheKey        = `config:api:${feature_key}`

    // ── L1 Cache: cek Redis dulu (~1–10ms jika hit) ───────────────────────────
    const redis = await getRedisClient()
    if (redis) {
      try {
        const cached = await redis.get<string>(cacheKey)
        if (cached) {
          // Cache hit — kembalikan langsung tanpa sentuh Supabase
          const parsed = typeof cached === 'string' ? JSON.parse(cached) : cached
          return NextResponse.json(parsed)
        }
      } catch (redisErr) {
        // Redis error tidak boleh hentikan request — lanjut ke Supabase
        console.warn('[GET /api/config] Redis get gagal:', redisErr)
      }
    }

    // ── L2: Query Supabase (~50–150ms) ────────────────────────────────────────
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

    // Kelompokkan items per kategori — kompatibel dengan format yang diharapkan UI
    const groupMap = new Map<string, { group_id: string; group_label: string; items: typeof data }>()

    for (const item of data) {
      const kat = item.kategori as string
      if (!groupMap.has(kat)) {
        groupMap.set(kat, {
          group_id:    kat,
          group_label: kat,
          items:       [],
        })
      }
      groupMap.get(kat)!.items.push(item)
    }

    const result = { success: true, data: Array.from(groupMap.values()) }

    // ── Simpan ke Redis — TTL dari config_registry (bukan hardcode) ───────────
    // TTL diambil dari platform_general.redis_ttl_config_seconds
    // getConfigValue() pakai unstable_cache 15 menit — cepat setelah warm
    // Fallback ke REDIS_TTL.CONFIG (600) jika key belum ada di DB
    if (redis) {
      try {
        const ttlStr = await getConfigValue(
          'platform_general',
          'redis_ttl_config_seconds',
          String(REDIS_TTL.CONFIG)
        )
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
    // Verifikasi JWT
    const decoded = await verifyJWT()
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    // Hanya SUPERADMIN dan ADMIN_TENANT yang boleh update config
    const role = decoded.role
    if (role !== 'SUPERADMIN' && role !== 'ADMIN_TENANT') {
      return NextResponse.json({ success: false, message: 'Akses ditolak' }, { status: 403 })
    }

    const { feature_key } = await params
    const payload = await request.json()

    if (!payload.id || payload.nilai === undefined) {
      return NextResponse.json(
        { success: false, message: 'Field id dan nilai wajib ada' },
        { status: 400 }
      )
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

    // ── Invalidasi cache — Next.js server cache ────────────────────────────────
    // Next.js 16.2.1: revalidateTag butuh 2 argumen (tag, profile)
    revalidateTag(`config:${feature_key}`, 'default')
    revalidateTag('config', 'default')
    revalidateTag('sidebar-data', 'default')

    // ── Invalidasi cache — Redis L1 ───────────────────────────────────────────
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
