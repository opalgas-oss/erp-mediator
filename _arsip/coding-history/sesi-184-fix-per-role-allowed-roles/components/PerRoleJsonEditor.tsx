'use client'

// components/PerRoleJsonEditor.tsx
// ARSIP PRE-FIX sesi-184-fix-per-role-allowed-roles
// Dibuat: Sesi #097. Masalah: ROLES hardcoded 4 role, tidak ada allowedRoles filter.

import type { JSX } from 'react'
import { Switch }  from '@/components/ui/switch'
import { Input }   from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const ROLES = ['customer', 'vendor', 'admin_tenant', 'super_admin'] as const
type RoleKey = typeof ROLES[number]

const ROLE_LABEL: Record<RoleKey, string> = {
  customer:     'Customer',
  vendor:       'Vendor',
  admin_tenant: 'Admin Tenant',
  super_admin:  'Super Admin',
}

type ValueType = 'boolean' | 'number' | 'select'
type PerRoleValue = Record<RoleKey, boolean | number | string>

export interface PerRoleJsonEditorProps {
  fieldName:  string
  value:      string
  valueType:  ValueType
  options?:   string[]
  onChange:   (jsonString: string) => void
  disabled?:  boolean
}

function parseJsonValue(rawValue: string): PerRoleValue {
  try {
    const parsed = JSON.parse(rawValue) as Record<string, unknown>
    const result: Record<string, boolean | number | string> = {}
    for (const role of ROLES) {
      const v = parsed[role]
      if (typeof v === 'boolean' || typeof v === 'number' || typeof v === 'string') {
        result[role] = v
      } else {
        result[role] = false
      }
    }
    return result as PerRoleValue
  } catch {
    const fallback: Record<string, boolean | number | string> = {}
    for (const role of ROLES) fallback[role] = false
    return fallback as PerRoleValue
  }
}

export function PerRoleJsonEditor({
  fieldName,
  value,
  valueType,
  options = [],
  onChange,
  disabled = false,
}: PerRoleJsonEditorProps): JSX.Element {
  const parsed = parseJsonValue(value)

  const handleRoleChange = (role: RoleKey, newVal: boolean | number | string): void => {
    const updated = { ...parsed, [role]: newVal }
    onChange(JSON.stringify(updated))
  }

  return (
    <div className="flex flex-col gap-0.5 w-full">
      <div className="border border-slate-200 rounded-md overflow-hidden">
        {ROLES.map((role, idx) => {
          const roleValue = parsed[role]
          return (
            <div key={role} className={['flex items-center justify-between px-2 py-1 gap-2', idx > 0 ? 'border-t border-slate-100' : '', disabled ? 'bg-slate-50' : 'bg-white'].join(' ')}>
              <span className="text-xs text-slate-600 w-24 flex-shrink-0">{ROLE_LABEL[role]}</span>
              {valueType === 'boolean' && (<Switch checked={Boolean(roleValue)} onCheckedChange={(checked) => handleRoleChange(role, checked)} disabled={disabled} className="h-4 w-8 flex-shrink-0 data-[state=checked]:bg-blue-600" />)}
              {valueType === 'number' && (<Input type="number" value={typeof roleValue === 'number' ? roleValue : 0} onChange={(e) => handleRoleChange(role, Number(e.target.value))} disabled={disabled} min={-1} className="w-16 h-6 px-1 text-center text-xs disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed" />)}
              {valueType === 'select' && (<Select value={String(roleValue)} onValueChange={(v) => handleRoleChange(role, v)} disabled={disabled}><SelectTrigger className="h-6 w-auto min-w-fit px-2 text-xs disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"><SelectValue /></SelectTrigger><SelectContent>{options.map((opt) => (<SelectItem key={opt} value={opt} className="text-xs">{opt}</SelectItem>))}</SelectContent></Select>)}
            </div>
          )
        })}
      </div>
      {!disabled && (<div className="mt-0.5 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-400 font-mono leading-relaxed break-all">{value}</div>)}
    </div>
  )
}
