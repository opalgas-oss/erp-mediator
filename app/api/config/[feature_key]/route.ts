// app/api/config/[feature_key]/route.ts
// GET  — Ambil semua item konfigurasi berdasarkan feature_key, dikelompokkan per kategori
// PATCH — Update nilai satu item konfigurasi berdasarkan feature_key + item id
//
// PERUBAHAN dari versi Firebase:
//   - Hapus import getAdminDb dari firebase-admin
//   - Query Firestore nested → query tabel config_registry PostgreSQL
//   - GET: kembalikan items dikelompokkan per kategori (kompatibel dengan UI)
//   - PATCH: update row config_registry + invalidate cache via revalidateTag

import { NextRequest, NextResponse }  from 'next/server'
import { revalidateTag }              from 'next/cache'
import { verifyJWT }                  from '@/lib/auth-server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// ─── Handler GET ──────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ feature_key: string }> }
) {
  try {
    // Verifikasi JWT — verifyJWT() baca cookie sendiri
    const decoded = await verifyJWT()
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const { feature_key } = await params
    const db = createServerSupabaseClient()

    // Ambil semua item config untuk feature_key ini
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

    const groups = Array.from(groupMap.values())

    return NextResponse.json({ success: true, data: groups })

  } catch (error) {
    console.error('[GET /api/config] Error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}

// ─── Handler PATCH ────────────────────────────────────────────────────────────

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

    // payload berisi: { id: string, nilai: string }
    // id = UUID row yang akan diupdate
    // nilai = nilai baru
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

    // Invalidate cache agar data baru langsung terlihat tanpa tunggu TTL
    revalidateTag(`config:${feature_key}`, 'page')

    return NextResponse.json({ success: true, message: 'Konfigurasi berhasil disimpan' })

  } catch (error) {
    console.error('[PATCH /api/config] Error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}