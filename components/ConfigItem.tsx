'use client'

// components/ConfigItem.tsx
// Komponen satu baris item konfigurasi di dashboard SuperAdmin.
// Mendukung 6 tipe: toggle, number-unit, select-only, timing, json-per-role, text-field.
//
// Sesi #097 — tambah timing + json-per-role
// Sesi #163 — tambah text-field
// Sesi #184 — allowedRoles + hideTenantOverrideToggle
// CASE SESI-14 (8 Juni 2026): font Inter 13px (label + input) sesuai STANDAR_UI_UX_MOCKUP_RULES

import type { JSX }          from 'react'
import { Input }             from '@/components/ui/input'
import { Switch }            from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TimingInput }       from '@/components/TimingInput'
import { PerRoleJsonEditor } from '@/components/PerRoleJsonEditor'
import { MaintenanceIllustrationField } from '@/components/maintenance/MaintenanceIllustrationField'

export interface ConfigItemData {
  id:              string
  label:           string
  fieldName?:      string
  type:            'toggle' | 'number-unit' | 'select-only' | 'timing' | 'json-per-role' | 'text-field' | 'illustration'
  value:           number | boolean | string
  unit?:           string
  units?:          string[]
  options?:        string[]
  valueType?:      'boolean' | 'number' | 'select'
  perRoleOptions?: string[]
  allowedRoles?:   ReadonlyArray<'customer' | 'vendor' | 'admin_tenant' | 'super_admin'>
  hideTenantOverrideToggle?: boolean
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

// ─── Sub-komponen: Tenant Admin boleh ubah ───────────────────────────────────

function AdminCanChangeRow({ checked, onToggle }: { checked: boolean; onToggle: (v: boolean) => void }): JSX.Element {
  return (
    <div className="flex items-center justify-between py-0.5 gap-1">
      {/* STANDAR BAB 1: label 12px */}
      <span className="text-[12px] text-[#6b7280] flex-1">Tenant Admin boleh ubah</span>
      <Switch
        checked={checked}
        onCheckedChange={onToggle}
        className="h-4 w-7 data-[state=checked]:bg-green-500 flex-shrink-0"
      />
    </div>
  )
}

// ─── Label item — 13px medium sesuai STANDAR BAB 1 ───────────────────────────

function ItemLabel({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <span className={`flex-1 min-w-0 text-[13px] font-medium ${enabled ? 'text-[#374151]' : 'text-[#9ca3af]'}`}>
      {label}
    </span>
  )
}

// ─── Status text: Aktif / Tidak Aktif ────────────────────────────────────────

function StatusText({ enabled }: { enabled: boolean }) {
  return (
    <span className="text-[12px] text-[#6b7280]">{enabled ? 'Aktif' : 'Tidak Aktif'}</span>
  )
}

// ─── Komponen utama ───────────────────────────────────────────────────────────

export function ConfigItem({ item, onValueChange, onUnitChange, onAdminCanChangeToggle, onEnabledToggle }: ConfigItemProps): JSX.Element | null {

  const showAdminToggle = !item.hideTenantOverrideToggle

  // ── toggle ────────────────────────────────────────────────────────────────
  if (item.type === 'toggle') {
    return (
      <div className="space-y-0.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 py-1">
          <ItemLabel label={item.label} enabled={item.enabled} />
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <StatusText enabled={Boolean(item.value)} />
            <Switch
              checked={Boolean(item.value)}
              onCheckedChange={(checked) => { onEnabledToggle(checked); onValueChange(checked) }}
              className="h-4 w-8 data-[state=checked]:bg-blue-600"
            />
          </div>
        </div>
        {showAdminToggle && <AdminCanChangeRow checked={item.adminCanChange} onToggle={onAdminCanChangeToggle} />}
      </div>
    )
  }

  // ── number-unit ───────────────────────────────────────────────────────────
  if (item.type === 'number-unit') {
    const hasUnitDropdown = item.units && item.units.length > 0
    return (
      <div className="space-y-0.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 py-1">
          <ItemLabel label={item.label} enabled={item.enabled} />
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <StatusText enabled={item.enabled} />
            <Switch checked={item.enabled} onCheckedChange={onEnabledToggle} className="h-4 w-8 data-[state=checked]:bg-blue-600 flex-shrink-0" />
            {/* STANDAR BAB 2.2: input h-9 py-2 px-3 text-[13px]. S#357: w-14->w-20 agar nilai 4-5 digit (3000/30000) tidak terpotong. */}
            <Input
              type="number"
              value={typeof item.value === 'number' ? item.value : 0}
              onChange={(e) => onValueChange(Number(e.target.value))}
              disabled={!item.enabled}
              className="w-20 h-8 px-2 text-center text-[13px] disabled:bg-[#f9f9f8] disabled:text-[#9ca3af] disabled:cursor-not-allowed"
            />
            {hasUnitDropdown ? (
              <Select value={item.unit ?? ''} onValueChange={onUnitChange} disabled={!item.enabled}>
                <SelectTrigger className="h-8 w-auto min-w-fit px-2 text-[13px] disabled:bg-[#f9f9f8] disabled:cursor-not-allowed">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {item.units?.map((u) => (
                    <SelectItem key={u} value={u} className="text-[13px]">{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className={`text-[13px] w-8 flex-shrink-0 ${item.enabled ? 'text-[#6b7280]' : 'text-[#9ca3af]'}`}>
                {item.unit}
              </span>
            )}
          </div>
        </div>
        {showAdminToggle && <AdminCanChangeRow checked={item.adminCanChange} onToggle={onAdminCanChangeToggle} />}
      </div>
    )
  }

  // ── select-only ───────────────────────────────────────────────────────────
  if (item.type === 'select-only') {
    return (
      <div className="space-y-0.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 py-1">
          <ItemLabel label={item.label} enabled={item.enabled} />
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <StatusText enabled={item.enabled} />
            <Switch checked={item.enabled} onCheckedChange={onEnabledToggle} className="h-4 w-8 data-[state=checked]:bg-blue-600 flex-shrink-0" />
            <Select value={String(item.value)} onValueChange={onValueChange} disabled={!item.enabled}>
              <SelectTrigger className="h-8 w-auto min-w-fit px-2 text-[13px] disabled:bg-[#f9f9f8] disabled:cursor-not-allowed">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {item.options?.map((opt) => (
                  <SelectItem key={opt} value={opt} className="text-[13px]">{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {showAdminToggle && <AdminCanChangeRow checked={item.adminCanChange} onToggle={onAdminCanChangeToggle} />}
      </div>
    )
  }

  // ── timing ────────────────────────────────────────────────────────────────
  if (item.type === 'timing') {
    return (
      <div className="space-y-0.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 py-1">
          <ItemLabel label={item.label} enabled={item.enabled} />
          <TimingInput
            fieldName={item.fieldName ?? item.id}
            value={typeof item.value === 'number' ? item.value : Number(item.value)}
            onChange={(canonicalVal) => onValueChange(canonicalVal)}
            disabled={!item.enabled}
          />
        </div>
        {showAdminToggle && <AdminCanChangeRow checked={item.adminCanChange} onToggle={onAdminCanChangeToggle} />}
      </div>
    )
  }

  // ── json-per-role ─────────────────────────────────────────────────────────
  if (item.type === 'json-per-role') {
    return (
      <div className="space-y-0.5 py-1">
        <ItemLabel label={item.label} enabled={item.enabled} />
        <PerRoleJsonEditor
          fieldName={item.fieldName ?? item.id}
          value={String(item.value)}
          valueType={item.valueType ?? 'boolean'}
          options={item.perRoleOptions}
          allowedRoles={item.allowedRoles}
          onChange={(jsonStr) => onValueChange(jsonStr)}
          disabled={!item.enabled}
        />
        {showAdminToggle && <AdminCanChangeRow checked={item.adminCanChange} onToggle={onAdminCanChangeToggle} />}
      </div>
    )
  }

  // ── text-field ────────────────────────────────────────────────────────────
  if (item.type === 'text-field') {
    return (
      <div className="space-y-0.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 py-1">
          <ItemLabel label={item.label} enabled={item.enabled} />
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <StatusText enabled={item.enabled} />
            <Switch checked={item.enabled} onCheckedChange={onEnabledToggle} className="h-4 w-8 data-[state=checked]:bg-blue-600 flex-shrink-0" />
            <Input
              type="text"
              value={String(item.value)}
              onChange={(e) => onValueChange(e.target.value)}
              disabled={!item.enabled}
              className="w-48 h-8 px-3 text-[13px] placeholder:text-[#9ca3af] disabled:bg-[#f9f9f8] disabled:text-[#9ca3af] disabled:cursor-not-allowed"
              placeholder="contoh: PENDING,REVIEW"
            />
          </div>
        </div>
        {showAdminToggle && <AdminCanChangeRow checked={item.adminCanChange} onToggle={onAdminCanChangeToggle} />}
      </div>
    )
  }

  // ── illustration (preset bawaan + upload gambar ke Storage) ────────────────
  if (item.type === 'illustration') {
    return (
      <div className="space-y-0.5">
        <div className="py-1">
          <ItemLabel label={item.label} enabled={item.enabled} />
          <MaintenanceIllustrationField
            value={String(item.value)}
            options={item.options}
            disabled={!item.enabled}
            onValueChange={(v) => onValueChange(v)}
          />
        </div>
        {showAdminToggle && <AdminCanChangeRow checked={item.adminCanChange} onToggle={onAdminCanChangeToggle} />}
      </div>
    )
  }

  return null
}
