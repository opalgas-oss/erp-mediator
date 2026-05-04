'use client'

// components/ConfigItem.tsx
// Komponen satu baris item konfigurasi di dashboard SuperAdmin.
// Mendukung 5 tipe render: toggle, number-unit, select-only, timing, json-per-role.
//
// PERUBAHAN Sesi #097 — PL-S08 M1:
//   - Tambah type 'timing'       → render <TimingInput /> untuk field waktu
//   - Tambah type 'json-per-role' → render <PerRoleJsonEditor /> untuk field JSON per role
//   - Update interface ConfigItemData: tambah field fieldName, valueType, perRoleOptions

import type { JSX }          from 'react'
import { Input }             from '@/components/ui/input'
import { Switch }            from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TimingInput }       from '@/components/TimingInput'
import { PerRoleJsonEditor } from '@/components/PerRoleJsonEditor'

// ─── Tipe ────────────────────────────────────────────────────────────────────

export interface ConfigItemData {
  id:              string
  label:           string
  fieldName?:      string   // nama kolom DB — wajib untuk type 'timing' dan 'json-per-role'
  type:            'toggle' | 'number-unit' | 'select-only' | 'timing' | 'json-per-role'
  value:           number | boolean | string
  unit?:           string
  units?:          string[]
  options?:        string[] // untuk type 'select-only'
  valueType?:      'boolean' | 'number' | 'select' // untuk type 'json-per-role'
  perRoleOptions?: string[] // opsi select per role jika valueType='select'
  option_group_id?: string | null
  adminCanChange:  boolean
  enabled:         boolean
}

interface ConfigItemProps {
  item:                   ConfigItemData
  onValueChange:          (value: number | boolean | string) => void
  onUnitChange:           (unit: string) => void
  onAdminCanChangeToggle: (value: boolean) => void
  onEnabledToggle:        (value: boolean) => void
}

// ─── Sub-komponen baris bawah (Tenant Admin boleh ubah) ──────────────────────

function AdminCanChangeRow({
  checked,
  onToggle,
}: {
  checked: boolean
  onToggle: (v: boolean) => void
}): JSX.Element {
  return (
    <div className="flex items-center justify-between py-0.5 gap-1">
      <span className="text-xs text-slate-500 flex-1">Tenant Admin boleh ubah</span>
      <Switch
        checked={checked}
        onCheckedChange={onToggle}
        className="h-3 w-6 sm:h-4 sm:w-7 data-[state=checked]:bg-green-500 flex-shrink-0"
      />
    </div>
  )
}

// ─── Komponen utama ───────────────────────────────────────────────────────────

export function ConfigItem({
  item,
  onValueChange,
  onUnitChange,
  onAdminCanChangeToggle,
  onEnabledToggle,
}: ConfigItemProps): JSX.Element | null {

  // ── toggle ────────────────────────────────────────────────────────────────
  if (item.type === 'toggle') {
    return (
      <div className="space-y-0.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 py-1">
          <span className="flex-1 min-w-0 text-xs sm:text-sm font-medium text-slate-700">
            {item.label}
          </span>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-xs text-slate-500">
              {item.value ? 'Aktif' : 'Tidak Aktif'}
            </span>
            <Switch
              checked={Boolean(item.value)}
              onCheckedChange={(checked) => {
                onEnabledToggle(checked)
                onValueChange(checked)
              }}
              className="h-4 w-8 sm:h-5 sm:w-9 data-[state=checked]:bg-blue-600"
            />
          </div>
        </div>
        <AdminCanChangeRow checked={item.adminCanChange} onToggle={onAdminCanChangeToggle} />
      </div>
    )
  }

  // ── number-unit ───────────────────────────────────────────────────────────
  if (item.type === 'number-unit') {
    const hasUnitDropdown = item.units && item.units.length > 0
    return (
      <div className="space-y-0.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 py-1">
          <span className="flex-1 min-w-0 text-xs sm:text-sm font-medium text-slate-700">
            {item.label}
          </span>
          <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
            <span className="text-xs text-slate-500">
              {item.enabled ? 'Aktif' : 'Tidak Aktif'}
            </span>
            <Switch
              checked={item.enabled}
              onCheckedChange={onEnabledToggle}
              className="h-4 w-8 sm:h-5 sm:w-9 data-[state=checked]:bg-blue-600 flex-shrink-0"
            />
            <Input
              type="number"
              value={typeof item.value === 'number' ? item.value : 0}
              onChange={(e) => onValueChange(Number(e.target.value))}
              disabled={!item.enabled}
              className="w-12 h-7 px-1 text-center text-xs disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
            />
            {hasUnitDropdown ? (
              <Select value={item.unit ?? ''} onValueChange={onUnitChange} disabled={!item.enabled}>
                <SelectTrigger className="h-7 w-auto min-w-fit px-2 text-xs disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {item.units?.map((u) => (
                    <SelectItem key={u} value={u} className="text-xs">{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className={`text-xs w-8 flex-shrink-0 ${item.enabled ? 'text-slate-600' : 'text-slate-400'}`}>
                {item.unit}
              </span>
            )}
          </div>
        </div>
        <AdminCanChangeRow checked={item.adminCanChange} onToggle={onAdminCanChangeToggle} />
      </div>
    )
  }

  // ── select-only ───────────────────────────────────────────────────────────
  if (item.type === 'select-only') {
    return (
      <div className="space-y-0.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 py-1">
          <span className="flex-1 min-w-0 text-xs sm:text-sm font-medium text-slate-700">
            {item.label}
          </span>
          <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
            <span className="text-xs text-slate-500">
              {item.enabled ? 'Aktif' : 'Tidak Aktif'}
            </span>
            <Switch
              checked={item.enabled}
              onCheckedChange={onEnabledToggle}
              className="h-4 w-8 sm:h-5 sm:w-9 data-[state=checked]:bg-blue-600 flex-shrink-0"
            />
            <Select value={String(item.value)} onValueChange={onValueChange} disabled={!item.enabled}>
              <SelectTrigger className="h-7 w-auto min-w-fit px-2 text-xs disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {item.options?.map((opt) => (
                  <SelectItem key={opt} value={opt} className="text-xs">{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <AdminCanChangeRow checked={item.adminCanChange} onToggle={onAdminCanChangeToggle} />
      </div>
    )
  }

  // ── timing — input angka + dropdown unit dengan auto-convert ──────────────
  if (item.type === 'timing') {
    // fieldName wajib untuk timing — fallback ke id agar tidak crash
    const fieldName = item.fieldName ?? item.id
    return (
      <div className="space-y-0.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 py-1">
          <span className="flex-1 min-w-0 text-xs sm:text-sm font-medium text-slate-700">
            {item.label}
          </span>
          <TimingInput
            fieldName={fieldName}
            value={typeof item.value === 'number' ? item.value : Number(item.value)}
            onChange={(canonicalVal) => onValueChange(canonicalVal)}
            disabled={!item.enabled}
          />
        </div>
        <AdminCanChangeRow checked={item.adminCanChange} onToggle={onAdminCanChangeToggle} />
      </div>
    )
  }

  // ── json-per-role — editor nilai per role (customer/vendor/admin_tenant/super_admin) ──
  if (item.type === 'json-per-role') {
    return (
      <div className="space-y-0.5 py-1">
        <span className="text-xs sm:text-sm font-medium text-slate-700 block mb-1">
          {item.label}
        </span>
        <PerRoleJsonEditor
          fieldName={item.fieldName ?? item.id}
          value={String(item.value)}
          valueType={item.valueType ?? 'boolean'}
          options={item.perRoleOptions}
          onChange={(jsonStr) => onValueChange(jsonStr)}
          disabled={!item.enabled}
        />
        <AdminCanChangeRow checked={item.adminCanChange} onToggle={onAdminCanChangeToggle} />
      </div>
    )
  }

  return null
}
