// app/dashboard/superadmin/team-contacts/page.tsx
// Page Kontak Tim — Dashboard SuperAdmin. Daftar kontak yang menjadi TUJUAN NYATA
// tautan "hubungi tim kami" di halaman maintenance publik dan halaman error dashboard.
//
// Dibuat: Sesi #423 — Direktori Kontak Tim Tahap A, FASE 3.6d
// Mockup disetujui: 04_Mockup_UI/02_SuperAdmin/Mockup_SA_TeamContacts_v2.html (S#419)
//
// Layer Route (RSC). WAJIB lewat Service — DILARANG query Supabase langsung dari page
// (pattern hidup: RSC = Route layer, lihat POLA_MASALAH "RSC query DB langsung").
//
// ⚠️ JUDUL HALAMAN: body ini SENGAJA tidak merender <h1>. Judul + deskripsi datang dari
//    DashboardHeader lewat `page-meta.constant.ts` (key `page_title_tim_kontak` +
//    `page_desc_tim_kontak` di message_library). Merender <h1> di sini = judul dobel,
//    penyakit yang sama dengan akar bug S#100.
//
// ⚠️ Pasangan wajibnya (guard build-time 2-arah `menu-catalog.guard`): baris
//    `dashboard_menus` menu_key `sa.pengguna.tim_kontak` route_path
//    `/dashboard/superadmin/team-contacts`. Tanpa baris itu, prebuild GAGAL-MERAH.

export const dynamic = 'force-dynamic'

import { TeamContactService_list } from '@/lib/services/team-contact.service'
import { TeamContactsClient }      from './TeamContactsClient'

export default async function TeamContactsPage() {
  const data = await TeamContactService_list('super_admin', null)
  return <TeamContactsClient initialData={data} />
}
