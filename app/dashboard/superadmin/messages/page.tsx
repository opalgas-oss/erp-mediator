// app/dashboard/superadmin/messages/page.tsx
// Halaman Message Library — SuperAdmin Dashboard.
// Load semua pesan dari message_library via Service layer, render ke client component.
// Filter (kategori, search) dikerjakan client-side — tidak perlu re-fetch.
//
// Dibuat: Sesi #098 — PL-S08 M2 Message Library
// Updated: Sesi #101 — DRY fix Langkah C:
//   Sebelumnya: query DB langsung (createServerSupabaseClient) — melanggar layer architecture.
//   Sekarang: Route (RSC) → MessageLibraryService_getAllForAdmin() → Repository → DB

export const dynamic = 'force-dynamic'

import { MessageLibraryService_getAllForAdmin } from '@/lib/services/message-library.service'
import { MessageLibraryClient }                from './MessageLibraryClient'

export default async function MessageLibraryPage() {
  try {
    const messages    = await MessageLibraryService_getAllForAdmin()
    const kategoriList = [...new Set(messages.map(m => m.kategori))].sort()

    return (
      <MessageLibraryClient
        initialData={messages}
        kategoriList={kategoriList}
      />
    )
  } catch {
    return (
      <div className="p-6">
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Gagal memuat data pesan. Silakan refresh halaman.
        </div>
      </div>
    )
  }
}
