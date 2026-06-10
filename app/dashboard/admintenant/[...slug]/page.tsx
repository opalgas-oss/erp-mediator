// app/dashboard/admintenant/[...slug]/page.tsx
// Catch-all route untuk semua halaman Dashboard AT yang belum diimplementasikan.
// Render halaman placeholder sesuai ACUAN_MOCKUP_DASHBOARD_AT_v1.md Bab 6.
//
// Dibuat: 10 Juni 2026 — CASE SESI-26

import { redirect }  from 'next/navigation'
import { verifyJWT } from '@/lib/auth-server'
import { ROLES }     from '@/lib/constants'

// ─── Mapping slug → metadata halaman ─────────────────────────────────────────

interface PageMeta {
  judul:   string
  ikon:    string
  deskripsi: string
  isPjOnly?: boolean
}

const PAGE_META: Record<string, PageMeta> = {
  // UTAMA
  'lelang':        { judul: 'Permintaan & Lelang',   ikon: 'ti-gavel',                    deskripsi: 'Kelola permintaan masuk, pantau lelang yang sedang berjalan, dan tindak lanjuti bid serta order dari Customer.' },
  'vendor':        { judul: 'Manajemen Vendor',       ikon: 'ti-users-group',              deskripsi: 'Kelola vendor aktif di wilayah Anda, tinjau permintaan bergabung, dan tangani vendor yang bermasalah.' },
  // KEUANGAN
  'keuangan':      { judul: 'Keuangan & Pencairan',  ikon: 'ti-receipt-2',                deskripsi: 'Pantau ringkasan keuangan, riwayat transaksi, kewajiban ke vendor dan SA, serta proses refund dan koreksi.' },
  'laporan':       { judul: 'Laporan & Analitik',     ikon: 'ti-chart-bar',                deskripsi: 'Lihat laporan operasional, keuangan, performa vendor, dan aktivitas bidding di wilayah Anda.' },
  // PENGATURAN
  'profil':        { judul: 'Profil & Tim',            ikon: 'ti-building-store',           deskripsi: 'Kelola profil perusahaan dan anggota tim yang mengelola akun ini. Nonaktifkan akses anggota yang sudah tidak bertugas kapan pun Anda perlu.' },
  'pengaturan':    { judul: 'Pengaturan Operasional', ikon: 'ti-settings-2',               deskripsi: 'Tentukan durasi konfirmasi Customer, jam operasional wilayah, pengaturan vendor, komisi, dan notifikasi.' },
  'notifikasi':    { judul: 'Notifikasi & Log',        ikon: 'ti-bell-ringing-2',           deskripsi: 'Atur preferensi notifikasi dan lihat log aktivitas akun Anda.' },
  // KHUSUS PJ
  'akses':         { judul: 'Kelola Akses Role',      ikon: 'ti-shield-lock',              deskripsi: 'Atur akses menu dan fitur untuk setiap anggota tim. Hanya Penanggung Jawab yang dapat mengubah pengaturan ini.', isPjOnly: true },
  'konfigurasi':   { judul: 'Konfigurasi System',     ikon: 'ti-adjustments-horizontal',   deskripsi: 'Konfigurasi sistem dan integrasi untuk operasional wilayah Anda. Hanya Penanggung Jawab yang dapat mengubah pengaturan ini.', isPjOnly: true },
}

function getPageMeta(slug: string[]): PageMeta {
  const key = slug[slug.length - 1] ?? ''
  return PAGE_META[key] ?? {
    judul:     'Halaman Belum Tersedia',
    ikon:      'ti-tools',
    deskripsi: 'Halaman ini sedang dalam pengembangan dan akan segera tersedia.',
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminTenantPlaceholderPage({
  params,
}: {
  params: Promise<{ slug: string[] }>
}) {
  const payload = await verifyJWT()
  if (!payload || payload.role !== ROLES.ADMIN_TENANT) {
    redirect('/at/masuk')
  }

  const { slug } = await params
  const meta     = getPageMeta(slug)

  return (
    <div className="p-6">
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">

        {/* Badge PJ-only jika berlaku */}
        {meta.isPjOnly && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold mb-2"
            style={{ background: 'rgba(24,95,165,0.1)', color: '#185FA5' }}>
            <i className="ti ti-shield-lock text-[13px]" />
            <span>KHUSUS PENANGGUNG JAWAB</span>
          </div>
        )}

        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: 'var(--color-info-bg)' }}>
          <i className={`ti ${meta.ikon} text-3xl`} style={{ color: 'var(--color-info-text)' }} />
        </div>

        {/* Judul + deskripsi */}
        <div>
          <p className="text-[20px] font-semibold text-[#1f2937]">{meta.judul}</p>
          <p className="text-[12px] text-[#6b7280] mt-1 max-w-sm leading-relaxed">
            {meta.deskripsi}
          </p>
        </div>

        {/* Status pengembangan */}
        <div className="mt-2 text-[12px] text-[#9ca3af] px-4 py-2 rounded-lg"
          style={{ background: 'rgba(0,0,0,0.04)' }}>
          Fitur ini sedang dalam pengembangan.
        </div>

      </div>
    </div>
  )
}
