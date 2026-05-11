'use client'

// app/dashboard/superadmin/dropdowns/DropdownGroupsTable.tsx
// Tabel presentational untuk grup dropdown — list + expand row untuk opsi.
// Dipanggil dari DropdownGroupsClient.tsx.
//
// Dibuat: Sesi #115 — M4 Master Dropdown FASE 3 Step 3.6

import { Fragment, type JSX }   from 'react'
import type { GrupDenganOpsi, DropdownCategory } from '@/lib/types/master-dropdown.types'
import { ICON_ACTION, ICON_NAV, ICON_STATUS }    from '@/lib/constants/icons.constant'
import { CATEGORY_LABELS, OVERRIDE_MODE_LABELS } from './DropdownGroupDialogs'
import { DropdownOptionsPanel }                   from './DropdownOptionsPanel'

import { Button } from '@/components/ui/button'
import { Badge }  from '@/components/ui/badge'
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  filtered:       GrupDenganOpsi[]
  grupList:       GrupDenganOpsi[]
  activeTab:      DropdownCategory | 'semua'
  expandedId:     string | null
  onTabChange:    (tab: DropdownCategory | 'semua') => void
  onToggleExpand: (id: string) => void
  onEdit:         (grup: GrupDenganOpsi) => void
  onDeactivate:   (grup: GrupDenganOpsi) => void
  onDataChanged:  () => void
}

// ─── Komponen ────────────────────────────────────────────────────────────────

export function DropdownGroupsTable({
  filtered, grupList, activeTab, expandedId,
  onTabChange, onToggleExpand, onEdit, onDeactivate, onDataChanged,
}: Props): JSX.Element {
  const categories = [...new Set(grupList.map(g => g.category))] as DropdownCategory[]
  const IconEdit    = ICON_ACTION.edit
  const IconDown    = ICON_NAV.chevronDown
  const IconRight   = ICON_NAV.chevronRight
  const IconWarning = ICON_STATUS.warning

  return (
    <>
      {/* Category tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onTabChange('semua')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'semua'
              ? 'bg-primary text-primary-foreground'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Semua ({grupList.length})
        </button>
        {categories.map(cat => (
          <button key={cat} onClick={() => onTabChange(cat)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === cat
                ? 'bg-primary text-primary-foreground'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {CATEGORY_LABELS[cat]} ({grupList.filter(g => g.category === cat).length})
          </button>
        ))}
      </div>

      {/* Tabel */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="w-6" />
              <TableHead>Slug</TableHead>
              <TableHead>Nama Tampilan</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead className="text-center">Opsi</TableHead>
              <TableHead>Tenant Override</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-slate-400 text-sm">
                  Tidak ada grup untuk kategori ini.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(grup => (
                <Fragment key={grup.id}>
                  <TableRow
                    className={`cursor-pointer hover:bg-slate-50 ${!grup.is_active ? 'opacity-50' : ''}`}
                    onClick={() => onToggleExpand(grup.id)}
                  >
                    <TableCell>
                      {expandedId === grup.id
                        ? <IconDown  size={14} className="text-slate-400" />
                        : <IconRight size={14} className="text-slate-400" />}
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">{grup.slug}</code>
                      {grup.is_system && (
                        <Badge variant="outline" className="ml-1.5 text-xs h-4">Sistem</Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-medium text-sm">{grup.display_name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">{CATEGORY_LABELS[grup.category]}</Badge>
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {grup.opsi.filter(o => o.is_active).length}
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {grup.tenant_can_override ? OVERRIDE_MODE_LABELS[grup.tenant_override_mode] : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={grup.is_active ? 'default' : 'secondary'} className="text-xs">
                        {grup.is_active ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                          onClick={() => onEdit(grup)}>
                          <IconEdit size={13} />
                        </Button>
                        {grup.is_active && !grup.is_system && (
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive"
                            onClick={() => onDeactivate(grup)}>
                            <IconWarning size={13} />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  {expandedId === grup.id && (
                    <TableRow>
                      <TableCell colSpan={8} className="p-0">
                        <DropdownOptionsPanel grup={grup} onDataChanged={onDataChanged} />
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
