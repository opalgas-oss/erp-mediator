import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT } from '@/lib/auth-server'
import { getAdminDb } from '@/lib/firebase-admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ feature_key: string }> }
) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    if (!sessionCookie) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }
    const decoded = await verifyJWT(sessionCookie)
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Token tidak valid' }, { status: 401 })
    }
    const { feature_key } = await params
    const db = getAdminDb()
    const docSnap = await db.collection('platform_config').doc('config_registry').collection('items').doc(feature_key).get()
    if (!docSnap.exists) {
      return NextResponse.json({ success: false, message: `Config '${feature_key}' tidak ditemukan` }, { status: 404 })
    }
    const docData = docSnap.data()
    return NextResponse.json({ success: true, data: docData?.groups ?? [] })
  } catch (error) {
    console.error('[GET /api/config] Error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ feature_key: string }> }
) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    if (!sessionCookie) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }
    const decoded = await verifyJWT(sessionCookie)
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Token tidak valid' }, { status: 401 })
    }
    const role = decoded.role
    if (role !== 'SUPERADMIN' && role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Akses ditolak' }, { status: 403 })
    }
    const { feature_key } = await params
    const payload = await request.json()
    const db = getAdminDb()
    await db.collection('platform_config').doc('config_registry').collection('items').doc(feature_key).set(
      { values: payload, updated_at: new Date().toISOString(), updated_by: decoded.uid },
      { merge: true }
    )
    return NextResponse.json({ success: true, message: 'Konfigurasi berhasil disimpan' })
  } catch (error) {
    console.error('[PATCH /api/config] Error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}

