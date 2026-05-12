// app/dashboard/superadmin/categories/page.tsx
// Halaman List Categories — SuperAdmin Dashboard (BAB 8.3 PAGE_SPEC_SUPERADMIN_v2)
//
// Dibuat: Sesi #132 — M6 FASE 3 Step 3.7

export const dynamic = 'force-dynamic'

import { CategoryService_list } from '@/lib/services/category.service'
import { CategoriesClient }     from './CategoriesClient'

export default async function CategoriesPage() {
  try {
    const result = await CategoryService_list({ page: 1, limit: 50 })

    return (
      <CategoriesClient
        initialData={result.data}
        initialStats={result.stats}
        initialTotal={result.total}
      />
    )
  } catch {
    return (
      <div className="p-6">
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Gagal memuat data kategori. Silakan refresh halaman.
        </div>
      </div>
    )
  }
}
