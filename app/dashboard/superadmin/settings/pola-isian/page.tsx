// app/dashboard/superadmin/settings/pola-isian/page.tsx
// Pembungkus SERVER layar "Pola Isian" (SuperAdmin). Dibuat: Sesi #492 — K-488-T1b.
//
// 🔴 ALAMAT HALAMAN INI TIDAK DIPILIH BEBAS: `resolveMenuHref` menurunkannya dari
//   `dashboard_menus.feature_flag = 'pola_isian'` dengan `_` → `-`, jadi foldernya WAJIB
//   `pola-isian`. Baris `dashboard_menus`-nya lahir di sesi yang sama — tanpa itu
//   `npm run prebuild` (`vitest run lib/guards`) GAGAL-MERAH dan `next build` tidak pernah jalan.
//
// `force-dynamic`: katalog ini menentukan sah-tidaknya isian pendaftar, dan perubahan yang SA
//   simpan WAJIB terlihat pada permintaan berikutnya — ⛔ bukan sesudah TTL habis (pelajaran #109).

export const dynamic = 'force-dynamic'

import { getKatalogPolaUntukAdmin } from '@/lib/services/form-field-pola.service'
import { PolaIsianClient } from '@/components/superadmin/PolaIsianClient'

export default async function PolaIsianPage() {
  const daftar = await getKatalogPolaUntukAdmin()
  return <PolaIsianClient initialData={daftar} />
}
