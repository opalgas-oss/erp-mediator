'use client'

// components/maintenance/MaintenanceIllustrationField.tsx
// Field khusus untuk memilih ilustrasi halaman maintenance: preset bawaan ATAU upload gambar sendiri.
// Upload → POST /api/superadmin/maintenance-illustration → Supabase Storage (bucket maintenance-assets)
// → URL publik disimpan sebagai nilai config (anti-hardcode: config simpan URL, bukan file).
//
// Dibuat: Sesi #412 — HUTANG-PAGE-CONFIG-SA field maintenance_illustration (tipe_data='illustration').
// Dipakai oleh: components/ConfigItem.tsx (branch type==='illustration'), hanya di page config `sistem`.

import { useRef, useState } from 'react'

const PRESET_LABEL: Record<string, string> = {
  preset_wrench: 'Kunci Inggris',
  preset_gear:   'Roda Gigi',
  preset_rocket: 'Roket',
}

interface Props {
  value:         string
  options?:      string[]
  disabled?:     boolean
  onValueChange: (v: string) => void
}

export function MaintenanceIllustrationField({ value, options, disabled, onValueChange }: Props) {
  const presets   = (options ?? []).filter((o) => o.startsWith('preset_'))
  const isUrl     = value.startsWith('http')
  const [uploading, setUploading] = useState(false)
  const [err, setErr]             = useState<string | null>(null)
  const inputRef                  = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File): Promise<void> => {
    setErr(null)
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res  = await fetch('/api/superadmin/maintenance-illustration', { method: 'POST', body: fd })
      const json = await res.json() as { success: boolean; url?: string; message?: string }
      if (!json.success || !json.url) throw new Error(json.message ?? 'Gagal upload')
      onValueChange(json.url)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Gagal upload')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-2 py-1">
      <div className="flex flex-wrap items-center gap-2">
        {presets.map((p) => (
          <button
            key={p}
            type="button"
            disabled={disabled}
            onClick={() => onValueChange(p)}
            className={`px-2 py-1 rounded border text-[12px] transition-colors disabled:opacity-50 ${
              value === p ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {PRESET_LABEL[p] ?? p}
          </button>
        ))}
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
          className={`px-2 py-1 rounded border text-[12px] transition-colors disabled:opacity-50 ${
            isUrl ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
          }`}
        >
          {uploading ? 'Mengunggah…' : isUrl ? 'Ganti gambar' : 'Upload sendiri'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f) }}
        />
      </div>

      {isUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" className="h-16 w-16 object-contain rounded border border-slate-200" />
      )}
      {err && <p className="text-[12px] text-red-600">{err}</p>}
    </div>
  )
}
