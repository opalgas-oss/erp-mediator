export default function SettingsPlaceholderPage() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
        <svg className="w-12 h-12 text-slate-300 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
          <rect x="9" y="3" width="6" height="4" rx="2"/>
        </svg>
        <p className="text-sm text-slate-400 leading-relaxed">
          Konfigurasi untuk modul ini<br />belum tersedia
        </p>
      </div>
    </div>
  )
}
