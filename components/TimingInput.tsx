'use client'

// components/TimingInput.tsx
// Komponen input nilai timing dengan konversi unit otomatis.
// Dipakai untuk semua field config_registry bertipe waktu (detik/menit/jam/hari).
// Nilai di DB selalu disimpan dalam canonical unit (sesuai suffix nama field).
// Contoh: otp_expiry_seconds → canonical = detik. User input "5 Menit" → simpan 300 detik.
//
// Dibuat: Sesi #097 — PL-S08 M1 Config & Policy Management

import { useState }    from 'react'
import type { JSX }    from 'react'
import { Input }       from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// ─── Tipe ────────────────────────────────────────────────────────────────────

type UnitLabel     = 'Detik' | 'Menit' | 'Jam' | 'Hari'
type CanonicalUnit = 'seconds' | 'minutes' | 'hours' | 'days'

interface UnitOption {
  label:         UnitLabel
  toCanonical:   (displayVal: number) => number // display → canonical
  fromCanonical: (canonicalVal: number) => number // canonical → display
}

export interface TimingInputProps {
  fieldName:  string  // nama kolom DB, mis. "otp_expiry_seconds"
  value:      number  // nilai dalam canonical unit (yang tersimpan di DB)
  onChange:   (canonicalValue: number) => void
  disabled?:  boolean
}

// ─── Konfigurasi unit per canonical unit ─────────────────────────────────────

const UNIT_OPTIONS: Record<CanonicalUnit, UnitOption[]> = {
  seconds: [
    { label: 'Detik', toCanonical: (v) => v,            fromCanonical: (v) => v },
    { label: 'Menit', toCanonical: (v) => v * 60,       fromCanonical: (v) => v / 60 },
    { label: 'Jam',   toCanonical: (v) => v * 3_600,    fromCanonical: (v) => v / 3_600 },
    { label: 'Hari',  toCanonical: (v) => v * 86_400,   fromCanonical: (v) => v / 86_400 },
  ],
  minutes: [
    { label: 'Menit', toCanonical: (v) => v,            fromCanonical: (v) => v },
    { label: 'Jam',   toCanonical: (v) => v * 60,       fromCanonical: (v) => v / 60 },
    { label: 'Hari',  toCanonical: (v) => v * 1_440,    fromCanonical: (v) => v / 1_440 },
  ],
  hours: [
    { label: 'Jam',  toCanonical: (v) => v,             fromCanonical: (v) => v },
    { label: 'Hari', toCanonical: (v) => v * 24,        fromCanonical: (v) => v / 24 },
  ],
  days: [
    { label: 'Hari', toCanonical: (v) => v,             fromCanonical: (v) => v },
  ],
}

const CANONICAL_LABEL: Record<CanonicalUnit, string> = {
  seconds: 'detik',
  minutes: 'menit',
  hours:   'jam',
  days:    'hari',
}

// Pemetaan label unit ke canonical unit untuk cek preview
const UNIT_LABEL_TO_CANONICAL: Record<UnitLabel, CanonicalUnit> = {
  Detik: 'seconds',
  Menit: 'minutes',
  Jam:   'hours',
  Hari:  'days',
}

// ─── Helper: deteksi canonical unit dari nama field ──────────────────────────

function detectCanonicalUnit(fieldName: string): CanonicalUnit {
  if (fieldName.endsWith('_seconds')) return 'seconds'
  if (fieldName.endsWith('_minutes')) return 'minutes'
  if (fieldName.endsWith('_hours'))   return 'hours'
  if (fieldName.endsWith('_days'))    return 'days'
  return 'seconds' // fallback
}

// ─── Helper: pilih unit display paling natural dari nilai canonical ──────────
// Cek dari unit terbesar ke terkecil — pilih yang menghasilkan bilangan bulat positif

function detectNaturalUnit(canonicalValue: number, canonical: CanonicalUnit): UnitLabel {
  const options = [...UNIT_OPTIONS[canonical]].reverse() // terbesar dulu
  for (const opt of options) {
    const display = opt.fromCanonical(canonicalValue)
    if (Number.isFinite(display) && display > 0 && Number.isInteger(display)) {
      return opt.label
    }
  }
  return UNIT_OPTIONS[canonical][0].label // fallback ke canonical unit
}

// ─── Komponen ────────────────────────────────────────────────────────────────

export function TimingInput({
  fieldName,
  value,
  onChange,
  disabled = false,
}: TimingInputProps): JSX.Element {
  const canonicalUnit = detectCanonicalUnit(fieldName)
  const unitOptions   = UNIT_OPTIONS[canonicalUnit]

  // Unit yang dipilih user di UI (bisa berbeda dari canonical)
  const [selectedUnit, setSelectedUnit] = useState<UnitLabel>(() =>
    detectNaturalUnit(value, canonicalUnit)
  )

  // Hitung nilai display dari canonical value + selected unit
  const currentOption  = unitOptions.find((u) => u.label === selectedUnit) ?? unitOptions[0]
  const rawDisplay     = currentOption.fromCanonical(value)

  // Bulatkan ke 4 desimal untuk hindari floating point noise (mis. 5.0000000000001)
  const displayValue   = parseFloat(rawDisplay.toFixed(4))

  // Preview hanya tampil jika unit display berbeda dari canonical unit
  const selectedUnitIsCanonical = UNIT_LABEL_TO_CANONICAL[selectedUnit] === canonicalUnit
  const showPreview             = !selectedUnitIsCanonical && !disabled

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const parsed = parseFloat(e.target.value)
    if (!isNaN(parsed) && parsed >= 0) {
      onChange(currentOption.toCanonical(parsed))
    }
  }

  const handleUnitChange = (newUnitLabel: string): void => {
    // Ganti unit display — nilai canonical tidak berubah
    setSelectedUnit(newUnitLabel as UnitLabel)
  }

  return (
    <div className="flex flex-col gap-0.5">
      {/* Input angka + dropdown unit */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <Input
          type="number"
          value={displayValue}
          onChange={handleValueChange}
          disabled={disabled}
          min={0}
          step="any"
          className="w-16 h-7 px-1 text-center text-xs disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
        />
        <Select
          value={selectedUnit}
          onValueChange={handleUnitChange}
          disabled={disabled}
        >
          <SelectTrigger className="h-7 w-auto min-w-fit px-2 text-xs disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {unitOptions.map((opt) => (
              <SelectItem key={opt.label} value={opt.label} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Preview konversi — mis. "5 Menit = 300 detik" */}
      {showPreview && (
        <span className="text-xs text-slate-400 leading-none">
          {displayValue} {selectedUnit} = {value} {CANONICAL_LABEL[canonicalUnit]}
        </span>
      )}
    </div>
  )
}
