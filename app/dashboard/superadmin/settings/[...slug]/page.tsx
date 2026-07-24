import { getMessage } from '@/lib/message-library'

// app/dashboard/superadmin/settings/[...slug]/page.tsx
// Catch-all placeholder untuk sub-menu Konfigurasi SA yang halamannya belum dibangun.
// Teks placeholder dibaca dari message_library (anti-hardcode, ATURAN 8/49) — fallback = teks sama.
// S#407 LANGKAH 2 HUTANG-MENU-VISIBILITAS-GOVERNANCE (SPEC_TABEL_MENU_KATALOG Bagian 8).

export default async function SettingsPlaceholderPage() {
  const teks = await getMessage('placeholder_halaman_pengembangan', 'Halaman sedang dalam pengembangan')

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
        <svg className="w-12 h-12 text-slate-300 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
          <rect x="9" y="3" width="6" height="4" rx="2"/>
        </svg>
        <p className="text-sm text-slate-400 leading-relaxed">
          {teks}
        </p>
      </div>
    </div>
  )
}
