// app/pending-approval/page.tsx
// Pembungkus SERVER halaman "menunggu persetujuan" — isinya digerbangi maintenance (§4 A1).
//
// Dibuat: Sesi #435 — FASE 3.6e sub-fitur A.
//
// KENAPA BERKAS INI ADA, dan kenapa isinya pindah:
//   `/pending-approval` termasuk permukaan yang §4 A1 tandai 🔒 DIBLOK. Alasannya disebut eksplisit
//   di desain: halaman ini INFORMASI, bukan jalan pulang — ia tidak dipakai siapa pun untuk masuk
//   kembali dan mematikan maintenance, jadi memblokirnya tidak mengunci siapa pun. Bandingkan
//   dengan `/login`, `/sa/masuk`, `/forgot-password` yang justru WAJIB tetap terbuka.
//
//   `MaintenanceGate` ber-`server-only` (ia membaca `config_registry`), sedangkan isi halaman ini
//   ber-`'use client'` — ia memanggil `supabase.auth.signOut()` dan `useRouter()`. Keduanya tidak
//   bisa berdiri di berkas yang sama. Karena itu isi lamanya DIPINDAH UTUH — bukan diketik ulang —
//   ke `components/pending-approval/PendingApprovalClient.tsx` lewat `move_file` (izin Philips
//   S#435, KAMUS 1.4), sehingga NOL karakter isi halaman melewati ketikan Claude.
//
//   Nama fungsi di berkas tujuan sengaja TIDAK diubah (`PendingApprovalPage`).
//
// Arsip byte-exact pra-pemindahan:
//   _arsip/coding-history/sesi-435-gerbang-maintenance/app/pending-approval/

import { MaintenanceGate }   from '@/components/maintenance/MaintenanceGate'
import PendingApprovalClient from '@/components/pending-approval/PendingApprovalClient'

// Gerbang membaca `config_registry` tiap permintaan ⇒ halaman ini tidak boleh di-prerender statis
// (pola yang sama dengan `app/page.tsx`; fix build S#412).
export const dynamic = 'force-dynamic'

export default function PendingApprovalPage() {
  return (
    <MaintenanceGate area="publik">
      <PendingApprovalClient />
    </MaintenanceGate>
  )
}
