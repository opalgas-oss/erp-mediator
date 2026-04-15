// components/config/ConfigRenderer.tsx
// Komponen generik auto-render untuk semua field konfigurasi platform.
// Menerima data dari API GET /api/config/[feature_key] dan merender
// komponen UI yang sesuai berdasarkan field ui_component per item.
//
// Pemetaan ui_component → komponen UI:
//   Toggle        → Switch
//   NumberField   → Input type="number" (min/max dari validation)
//   Select        → Select dengan options dari validation.options
//   TextField     → Input type="text"
//   TextareaField → Textarea
//   SecretField   → Input type="password" + tombol show/hide
//   (default)     → Input type="text"

'use client'

import { useState, useTransition } from 'react'
import { Eye, EyeOff }             from 'lucide-react'

import { Button }   from '@/components/ui/button'
import { Input }    from '@/components/ui/input'
import { Label }    from '@/components/ui/label'
import { Switch }   from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// ─── Tipe Data ────────────────────────────────────────────────────────────────

/** Satu item konfigurasi dari respons API GET /api/config/[feature_key] */
export interface ConfigItem {
  config_id:           string
  label:               string
  description:         string
  type:                string
  ui_component:        string
  value:               unknown
  tenant_can_override: boolean
  validation:          Record<string, unknown>
  access:              Record<string, unknown>
}

/** Payload satu item yang dikirim ke API PATCH /api/config/[feature_key] */
export interface UpdateItem {
  config_id:           string
  value:               unknown
  tenant_can_override: boolean
}

interface ConfigRendererProps {
  items:    ConfigItem[]
  /** Dipanggil saat SuperAdmin klik Simpan — bisa berupa Server Action */
  onSave:   (updates: UpdateItem[]) => Promise<void>
  /** Dari luar: tambahan disable tombol (misal: proses lain sedang berjalan) */
  isSaving: boolean
}

// ─── Label Teks ───────────────────────────────────────────────────────────────
// Semua teks UI dalam Bahasa Indonesia — ubah di sini untuk ganti tampilan
const LABEL_SIMPAN           = 'Simpan Perubahan'
const LABEL_MENYIMPAN        = 'Menyimpan...'
const LABEL_BERHASIL         = 'Perubahan berhasil disimpan.'
const LABEL_GAGAL            = 'Gagal menyimpan. Coba lagi.'
const LABEL_IZINKAN_OVERRIDE = 'Izinkan Tenant Admin ubah'
const LABEL_TAMPILKAN        = 'Tampilkan'
const LABEL_SEMBUNYIKAN      = 'Sembunyikan'
const LABEL_PILIH_OPSI       = 'Pilih opsi...'
const LABEL_TIDAK_ADA_ITEM   = 'Tidak ada konfigurasi yang tersedia untuk fitur ini.'

// ─── Komponen Utama ───────────────────────────────────────────────────────────
export default function ConfigRenderer({ items, onSave, isSaving }: ConfigRendererProps) {
  // State nilai setiap field — inisialisasi dari props.value per item
  const [values, setValues] = useState<Record<string, unknown>>(
    () => Object.fromEntries(items.map(item => [item.config_id, item.value]))
  )

  // State flag tenant_can_override per field — inisialisasi dari props
  const [overrides, setOverrides] = useState<Record<string, boolean>>(
    () => Object.fromEntries(items.map(item => [item.config_id, item.tenant_can_override]))
  )

  // State visibilitas teks untuk SecretField
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({})

  // Status feedback simpan: idle | success | error
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')

  // useTransition agar UI tidak freeze saat Server Action berjalan
  // isPending = true selama Server Action sedang dieksekusi
  const [isPending, startTransition] = useTransition()

  // ── Helper: ubah nilai satu field ─────────────────────────────────────────
  function setValue(configId: string, newValue: unknown) {
    setValues(prev => ({ ...prev, [configId]: newValue }))
  }

  // ── Helper: ubah flag override satu field ─────────────────────────────────
  function setOverride(configId: string, allowed: boolean) {
    setOverrides(prev => ({ ...prev, [configId]: allowed }))
  }

  // ── Helper: toggle visibilitas SecretField ────────────────────────────────
  function togglePassword(configId: string) {
    setShowPasswords(prev => ({ ...prev, [configId]: !prev[configId] }))
  }

  // ── Render field berdasarkan nilai ui_component ───────────────────────────
  function renderField(item: ConfigItem) {
    const currentValue = values[item.config_id]
    const comp         = item.ui_component

    // Toggle — Switch boolean
    if (comp === 'Toggle') {
      return (
        <Switch
          checked={currentValue === true}
          onCheckedChange={checked => setValue(item.config_id, checked)}
        />
      )
    }

    // NumberField — Input type="number" dengan min/max dari validation
    if (comp === 'NumberField') {
      const min = typeof item.validation.min === 'number' ? item.validation.min : undefined
      const max = typeof item.validation.max === 'number' ? item.validation.max : undefined

      return (
        <Input
          type="number"
          min={min}
          max={max}
          value={typeof currentValue === 'number' ? currentValue : (Number(currentValue) || '')}
          onChange={e =>
            setValue(item.config_id, e.target.value === '' ? null : Number(e.target.value))
          }
          className="max-w-xs"
        />
      )
    }

    // Select — dropdown dengan options dari validation.options
    if (comp === 'Select') {
      const options = Array.isArray(item.validation.options)
        ? item.validation.options.filter((o): o is string => typeof o === 'string')
        : []

      return (
        <Select
          value={typeof currentValue === 'string' ? currentValue : ''}
          onValueChange={val => setValue(item.config_id, val)}
        >
          <SelectTrigger className="max-w-xs">
            <SelectValue placeholder={LABEL_PILIH_OPSI} />
          </SelectTrigger>
          <SelectContent>
            {options.map(opt => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }

    // TextareaField — Textarea multi-baris
    if (comp === 'TextareaField') {
      return (
        <Textarea
          value={typeof currentValue === 'string' ? currentValue : String(currentValue ?? '')}
          onChange={e => setValue(item.config_id, e.target.value)}
          rows={4}
        />
      )
    }

    // SecretField — Input password dengan tombol show/hide
    if (comp === 'SecretField') {
      const isVisible = showPasswords[item.config_id] === true

      return (
        <div className="flex items-center gap-2 max-w-xs">
          <Input
            type={isVisible ? 'text' : 'password'}
            value={typeof currentValue === 'string' ? currentValue : String(currentValue ?? '')}
            onChange={e => setValue(item.config_id, e.target.value)}
            className="flex-1"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => togglePassword(item.config_id)}
            title={isVisible ? LABEL_SEMBUNYIKAN : LABEL_TAMPILKAN}
          >
            {isVisible
              ? <EyeOff className="size-4" />
              : <Eye    className="size-4" />
            }
          </Button>
        </div>
      )
    }

    // TextField / default — Input type="text"
    return (
      <Input
        type="text"
        value={typeof currentValue === 'string' ? currentValue : String(currentValue ?? '')}
        onChange={e => setValue(item.config_id, e.target.value)}
        className="max-w-xs"
      />
    )
  }

  // ── Handler klik Simpan ───────────────────────────────────────────────────
  function handleSave() {
    // Bangun array update dari state saat ini
    const updates: UpdateItem[] = items.map(item => ({
      config_id:           item.config_id,
      value:               values[item.config_id] ?? null,
      tenant_can_override: overrides[item.config_id] ?? false,
    }))

    // useTransition: React 19 mendukung async callback di startTransition
    startTransition(async () => {
      try {
        await onSave(updates)
        setSaveStatus('success')
        // Reset pesan sukses setelah 3 detik
        setTimeout(() => setSaveStatus('idle'), 3000)
      } catch {
        setSaveStatus('error')
        // Reset pesan error setelah 5 detik
        setTimeout(() => setSaveStatus('idle'), 5000)
      }
    })
  }

  // ── Render kosong jika tidak ada item ─────────────────────────────────────
  if (items.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-gray-400">
        {LABEL_TIDAK_ADA_ITEM}
      </p>
    )
  }

  const isDisabled = isPending || isSaving

  return (
    <div className="space-y-4">

      {/* Daftar field konfigurasi */}
      {items.map(item => {
        const canOverride = overrides[item.config_id] === true

        return (
          <div
            key={item.config_id}
            className={[
              'rounded-xl border p-5 transition-colors',
              canOverride
                ? 'border-blue-200 bg-blue-50'
                : 'border-gray-200 bg-white',
            ].join(' ')}
          >
            {/* Baris atas: label + toggle izin override tenant */}
            <div className="mb-3 flex items-start justify-between gap-4">

              {/* Label + deskripsi */}
              <div className="min-w-0 flex-1">
                <Label className="text-sm font-medium text-gray-900">
                  {item.label || item.config_id}
                </Label>
                {item.description ? (
                  <p className="mt-0.5 text-xs leading-relaxed text-gray-500">
                    {item.description}
                  </p>
                ) : null}
              </div>

              {/* Toggle override tenant */}
              <div className="flex shrink-0 items-center gap-2">
                <span className="whitespace-nowrap text-xs text-gray-500">
                  {LABEL_IZINKAN_OVERRIDE}
                </span>
                <Switch
                  checked={canOverride}
                  onCheckedChange={checked => setOverride(item.config_id, checked)}
                />
              </div>

            </div>

            {/* Input field sesuai ui_component */}
            {renderField(item)}
          </div>
        )
      })}

      {/* Pesan feedback setelah simpan */}
      {saveStatus === 'success' && (
        <p className="text-sm font-medium text-green-600">{LABEL_BERHASIL}</p>
      )}
      {saveStatus === 'error' && (
        <p className="text-sm font-medium text-red-600">{LABEL_GAGAL}</p>
      )}

      {/* Tombol Simpan */}
      <div className="pt-2">
        <Button onClick={handleSave} disabled={isDisabled}>
          {isPending ? LABEL_MENYIMPAN : LABEL_SIMPAN}
        </Button>
      </div>

    </div>
  )
}
