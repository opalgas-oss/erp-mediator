'use client'

// app/dashboard/superadmin/settings/monitoring/AlertConfigItem.tsx
// Komponen multi-input untuk field penerima Alert (WA + Email).
// Setiap field bisa punya banyak nilai — disimpan di DB sebagai comma-separated string.
//
// Dibuat: Sesi #347 — FIX-B2-MULTI-RECIPIENT
// Scope: SA-only. Tidak masuk message_library (teks UI hardcode diizinkan untuk komponen SA-only).
// Tidak perlu didaftarkan ke cr_functions (bukan shared function — komponen ini khusus monitoring).
//
// Style: konsisten dengan ConfigItem.tsx
//   - Label  : text-[13px] font-medium text-[#374151]
//   - Input  : h-8 px-3 text-[13px]
//   - Tombol : text-[12px]

import type { JSX }  from 'react'
import { useState }  from 'react'
import { Input }     from '@/components/ui/input'
import { Button }    from '@/components/ui/button'
import { Switch }    from '@/components/ui/switch'

interface AlertConfigItemProps {
  label:       string
  values:      string[]
  enabled:     boolean
  placeholder?: string
  onChange:    (values: string[]) => void
  onEnabledToggle: (enabled: boolean) => void
}

export function AlertConfigItem({
  label,
  values,
  enabled,
  placeholder,
  onChange,
  onEnabledToggle,
}: AlertConfigItemProps): JSX.Element {
  const [draftValue, setDraftValue] = useState<string>('')

  // Hapus satu entry berdasarkan index
  const handleRemove = (index: number): void => {
    const next = values.filter((_, i) => i !== index)
    onChange(next)
  }

  // Tambah entry baru dari draft
  const handleAdd = (): void => {
    const trimmed = draftValue.trim()
    if (!trimmed) return
    onChange([...values, trimmed])
    setDraftValue('')
  }

  // Enter key di input draft = tambah
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  return (
    <div className="py-2 space-y-1.5">
      {/* Baris label + toggle enabled */}
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[13px] font-medium ${enabled ? 'text-[#374151]' : 'text-[#9ca3af]'}`}>
          {label}
        </span>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[12px] text-[#6b7280]">{enabled ? 'Aktif' : 'Tidak Aktif'}</span>
          <Switch
            checked={enabled}
            onCheckedChange={onEnabledToggle}
            className="h-4 w-8 data-[state=checked]:bg-blue-600"
          />
        </div>
      </div>

      {/* Daftar entry yang sudah ditambahkan */}
      {values.length > 0 && (
        <div className="flex flex-col gap-1">
          {values.map((val, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              {/* JUSTIFIKASI: nilai bukan berasal dari user input langsung di sini — dari state yang sudah tersanitasi */}
              <span className="flex-1 px-3 h-8 flex items-center text-[13px] bg-slate-50 border border-slate-200 rounded-md text-[#374151] truncate">
                {val}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemove(idx)}
                disabled={!enabled}
                className="h-8 px-2 text-[12px] text-red-500 hover:text-red-700 hover:bg-red-50 disabled:opacity-40"
              >
                ×
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Input tambah entry baru */}
      {enabled && (
        <div className="flex items-center gap-1.5">
          <Input
            type="text"
            value={draftValue}
            onChange={(e) => setDraftValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 h-8 px-3 text-[13px] placeholder:text-[#9ca3af]"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAdd}
            disabled={!draftValue.trim()}
            className="h-8 px-3 text-[12px] border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            + Tambah
          </Button>
        </div>
      )}

      {/* Jika tidak ada entry dan tidak enabled — tampilkan placeholder kosong */}
      {values.length === 0 && !enabled && (
        <p className="text-[12px] text-[#9ca3af] italic">Tidak ada penerima terdaftar</p>
      )}
    </div>
  )
}
