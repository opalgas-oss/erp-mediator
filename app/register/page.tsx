// app/register/page.tsx
// Pembungkus SERVER halaman pendaftaran — isinya digerbangi maintenance (§4 A1).
//
// Dibuat: Sesi #435 — FASE 3.6e sub-fitur A.
//
// KENAPA BERKAS INI ADA, dan kenapa isinya pindah:
//   `/register` termasuk permukaan yang §4 A1 tandai 🔒 DIBLOK saat maintenance menyala —
//   alasannya bisnis, bukan teknis: pendaftaran baru yang masuk selagi platform diperbaiki
//   menghasilkan data setengah jadi yang harus dibereskan manual sesudahnya. Sebelum sesi ini
//   halaman ini TIDAK punya gerbang sama sekali.
//
//   `MaintenanceGate` ber-`server-only` (ia membaca `config_registry`), sedangkan isi halaman
//   pendaftaran ber-`'use client'`. Keduanya tidak bisa berdiri di berkas yang sama. Karena itu
//   isi lamanya DIPINDAH UTUH — bukan diketik ulang — ke
//   `components/register/RegisterClient.tsx` lewat `move_file` (izin Philips S#435, KAMUS 1.4),
//   sehingga NOL karakter isi halaman melewati ketikan Claude. Berkas ini murni pembungkus.
//
//   Nama fungsi di berkas tujuan sengaja TIDAK diubah (`RegisterPage`) — impor bawaan boleh diberi
//   nama apa pun di sisi pemanggil, jadi tidak ada alasan menyentuh satu byte pun isinya.
//
// Arsip byte-exact pra-pemindahan: _arsip/coding-history/sesi-435-gerbang-maintenance/app/register/

import { MaintenanceGate } from '@/components/maintenance/MaintenanceGate'
import RegisterClient      from '@/components/register/RegisterClient'

// Gerbang membaca `config_registry` tiap permintaan ⇒ halaman ini tidak boleh di-prerender statis
// (pola yang sama dengan `app/page.tsx`; fix build S#412).
export const dynamic = 'force-dynamic'

export default function RegisterPage() {
  return (
    <MaintenanceGate area="publik">
      <RegisterClient />
    </MaintenanceGate>
  )
}
