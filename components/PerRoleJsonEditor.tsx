'use client'

// components/PerRoleJsonEditor.tsx
// Editor nilai konfigurasi per-role — untuk field config_registry bertipe JSON
// dengan struktur {customer, vendor, admin_tenant, super_admin}.
// Contoh: require_otp, biometric_mode, max_concurrent_sessions_per_role, notify_multi_device_login.
//
// Dibuat: Sesi #097 — PL-S08 M1 Config & Policy Management
//
// FIX Sesi #184 — HUTANG-SA-CONFIG-SEPARATION:
//   Tambah prop `allowedRoles` untuk filter role yang ditampilkan.
//   Sebelumnya: selalu render 4 role hardcoded → blank dropdown untuk role tidak ada di JSON.
//   Sesudah: hanya render role yang ada di allowedRoles (jika diberikan).
//   Output JSON juga hanya berisi allowedRoles → tidak ada data corruption.

import type { JSX } from 'react'
import { Switch }  from '@/components/ui/switch'
import { Input }   from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// ─── Tipe ────────────────────────────────────────────────────────────────────

// Urutan standar tampilan — allowedRoles akan difilter dari urutan ini
const ALL_ROLES = ['customer', 'vendor', 'admin_tenant', 'super_admin'] as const
type RoleKey = typeof ALL_ROLES[number]

// Label tampil per role
const ROLE_LABEL: Record<RoleKey, string> = {
  customer:     'Customer',
  vendor:       'Vendor',
  admin_tenant: 'Admin Tenant',
  super_admin:  'Super Admin',
}

// Tipe nilai yang didukung per baris
type ValueType = 'boolean' | 'number' | 'select'

// Nilai JSON per role
type PerRoleValue = Partial<Record<RoleKey, boolean | number | string>>

export interface PerRoleJsonEditorProps {
  fieldName:    string
  value:        string
  valueType:    ValueType
  options?:     string[]
  allowedRoles?: ReadonlyArray<RoleKey>  // filter role yang ditampilkan + disimpan
  onChange:     (jsonString: string) => void
  disabled?:    boolean
}

// ─── Helper: parse nilai JSON — hanya untuk allowedRoles ─────────────────────

function parseJsonValue(rawValue: string, rolesToRender: readonly RoleKey[]): PerRoleValue {
  try {
    const parsed = JSON.parse(rawValue) as Record<string, unknown>
    const result: PerRoleValue = {}
    for (const role of rolesToRender) {
      const v = parsed[role]
      if (typeof v === 'boolean' || typeof v === 'number' || typeof v === 'string') {
        result[role] = v
      } else {
        result[role] = false // default fallback hanya untuk role yang diizinkan
      }
    }
    return result
  } catch {
    const fallback: PerRoleValue = {}
    for (const role of rolesToRender) fallback[role] = false
    return fallback
  }
}

// ─── Komponen ────────────────────────────────────────────────────────────────

export function PerRoleJsonEditor({
  fieldName,
  value,
  valueType,
  options = [],
  allowedRoles,
  onChange,
  disabled = false,
}: PerRoleJsonEditorProps): JSX.Element {

  // Tentukan role yang dirender: pakai allowedRoles jika ada, fallback ke semua (backward compat)
  const rolesToRender: readonly RoleKey[] = allowedRoles
    ? ALL_ROLES.filter((r) => allowedRoles.includes(r))
    : ALL_ROLES

  const parsed = parseJsonValue(value, rolesToRender)

  // Update nilai satu role → emit JSON string HANYA untuk rolesToRender
  const handleRoleChange = (role: RoleKey, newVal: boolean | number | string): void => {
    const updated: PerRoleValue = { ...parsed, [role]: newVal }
    // JSON output hanya berisi role yang diizinkan — tidak ada kontaminasi role lain
    const output: Record<string, boolean | number | string> = {}
    for (const r of rolesToRender) {
      if (updated[r] !== undefined) output[r] = updated[r]!
    }
    onChange(JSON.stringify(output))
  }

  return (
    <div className="flex flex-col gap-0.5 w-full">
      {/* Tabel per role */}
      <div className="border border-slate-200 rounded-md overflow-hidden">
        {rolesToRender.map((role, idx) => {
          const roleValue = parsed[role]

          return (
            <div
              key={role}
              className={[
                'flex items-center justify-between px-2 py-1 gap-2',
                idx > 0 ? 'border-t border-slate-100' : '',
                disabled ? 'bg-slate-50' : 'bg-white',
              ].join(' ')}
            >
              {/* Label role */}
              <span className="text-xs text-slate-600 w-24 flex-shrink-0">
                {ROLE_LABEL[role]}
              </span>

              {/* Input sesuai valueType */}
              {valueType === 'boolean' && (
                <Switch
                  checked={Boolean(roleValue)}
                  onCheckedChange={(checked) => handleRoleChange(role, checked)}
                  disabled={disabled}
                  className="h-4 w-8 flex-shrink-0 data-[state=checked]:bg-blue-600"
                />
              )}

              {valueType === 'number' && (
                <Input
                  type="number"
                  value={typeof roleValue === 'number' ? roleValue : 0}
                  onChange={(e) => handleRoleChange(role, Number(e.target.value))}
                  disabled={disabled}
                  min={-1}
                  className="w-16 h-6 px-1 text-center text-xs disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                />
              )}

              {valueType === 'select' && (
                <Select
                  value={String(roleValue ?? '')}
                  onValueChange={(v) => handleRoleChange(role, v)}
                  disabled={disabled}
                >
                  <SelectTrigger className="h-6 w-auto min-w-fit px-2 text-xs disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((opt) => (
                      <SelectItem key={opt} value={opt} className="text-xs">
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )
        })}
      </div>

      {/* Preview JSON output — readonly, hanya tampil saat tidak disabled */}
      {!disabled && (
        <div className="mt-0.5 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-400 font-mono leading-relaxed break-all">
          {value}
        </div>
      )}
    </div>
  )
}
