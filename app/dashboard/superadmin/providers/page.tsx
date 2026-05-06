// app/dashboard/superadmin/providers/page.tsx
// Halaman API Provider & Credential — SuperAdmin Dashboard.
// Load daftar provider + instances via Service layer → render ke ProvidersClient.
// Dibuat: Sesi #107 — M3 Credential Management

export const dynamic = 'force-dynamic'

import { listProviders } from '@/lib/services/credential.service'
import { ProvidersClient } from './ProvidersClient'

export default async function ProvidersPage() {
  try {
    const providers = await listProviders()

    return <ProvidersClient initialProviders={providers} />

  } catch {
    return (
      <div className="p-6">
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Gagal memuat data provider. Silakan refresh halaman.
        </div>
      </div>
    )
  }
}
