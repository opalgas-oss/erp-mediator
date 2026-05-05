// ARSIP sesi-101-dry-fix — lib/auth-server.ts
// Sebelum: tambah requireSuperAdmin() + RequireSuperAdminResult
import 'server-only'
import { cache } from 'react'
import { cookies, headers } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export interface JWTPayload {
  uid:           string
  role:          string
  tenantId:      string
  displayName:   string
  vendorStatus?: string
}

export const verifyJWT = cache(async (): Promise<JWTPayload | null> => {
  try {
    const headerStore   = await headers()
    const xUserId       = headerStore.get('x-user-id')
    const xUserRole     = headerStore.get('x-user-role')
    const xTenantId     = headerStore.get('x-tenant-id')
    const xDisplayName  = headerStore.get('x-user-display-name')
    const xVendorStatus = headerStore.get('x-vendor-status')
    if (xUserId && xUserRole) {
      return { uid: xUserId, role: xUserRole, tenantId: xTenantId ?? '', displayName: xDisplayName ?? xUserId, vendorStatus: xVendorStatus ?? undefined }
    }
    const cookieStore = await cookies()
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } })
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return null
    const appMeta = user.app_metadata || {}
    let role = typeof appMeta['app_role'] === 'string' ? appMeta['app_role'] : ''
    let tenantId = typeof appMeta['tenant_id'] === 'string' ? appMeta['tenant_id'] : ''
    let vendorStatus = typeof appMeta['vendor_status'] === 'string' ? appMeta['vendor_status'] : undefined
    if (!role || !vendorStatus) {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        try {
          const parts = session.access_token.split('.')
          if (parts.length === 3) {
            const pad = parts[1].replace(/-/g, '+').replace(/_/g, '/')
            const payload = JSON.parse(Buffer.from(pad, 'base64').toString('utf-8'))
            if (!role && typeof payload['app_role'] === 'string') role = payload['app_role']
            if (!tenantId && typeof payload['tenant_id'] === 'string') tenantId = payload['tenant_id']
            if (!vendorStatus && typeof payload['vendor_status'] === 'string') vendorStatus = payload['vendor_status']
          }
        } catch { }
      }
    }
    return { uid: user.id, role, tenantId, displayName: typeof user.user_metadata?.['nama'] === 'string' ? user.user_metadata['nama'] : user.email ?? user.id, vendorStatus }
  } catch { return null }
})
