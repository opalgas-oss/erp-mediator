'use client'

// app/dashboard/superadmin/dropdowns/DropdownGroupsTable.tsx
// Tabel grup dropdown: sort kolom + expand opsi + Pemetaan Pemakaian + tombol Hapus.
//
// PERAN SETELAH S#125 REFACTOR:
//   - Terima safetyMap dari parent (single source of truth)
//   - Sub-komponen GroupRow pakai useDeletePermission untuk hitung verdict grup
//   - Render DeleteActionButton — komponen pure yang konsumsi verdict
//   - Verdict layer = SATU tempat decision boleh/tidak hapus
//     → tidak ada lagi inline state logic untuk warna/disabled/tooltip
//
// HAPUS DI S#125 (lihat _arsip/sesi-125-refactor-verdict-dropdown/):
//   - deleteVerdicts prop (Record<id, SafetyVerdict | 'loading'>)
//   - isDelBlocked / isDelLoading inline logic
//   - Tooltip text manual berdasarkan delVerdict
//
// Dibuat S#115. Update S#122/S#124. REFACTOR S#125: konsumsi verdict layer.

import { Fragment, useState, type JSX }          from 'react'
import type { GrupDenganOpsi, DropdownCategory } from '@/lib/types/master-dropdown.types'
import type { SafetyStatusFullMap }              from '@/lib/types/usage-tracking.types'
import { useDeletePermission }                   from '@/lib/hooks/useDeletePermission'
import { getOptionVerdict }                      from '@/lib/dropdowns/verdict'
import { useSortableTable }                      from '@/lib/hooks/useSortableTable'
import { DeleteActionButton }                    from '@/components/dropdowns/DeleteActionButton'
import UsageTrackingPanel                        from '@/components/superadmin/UsageTrackingPanel'
import { ICON_ACTION, ICON_NAV, ICON_STATUS }    from '@/lib/constants/icons.constant'
import { CATEGORY_LABELS, OVERRIDE_MODE_LABELS } from './DropdownGroupDialogs'
import { DropdownOptionsPanel }                  from './DropdownOptionsPanel'
import { Button } from '@/components/ui/button'
import { Badge }  from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  filtered:         GrupDenganOpsi[]
  grupList:         GrupDenganOpsi[]
  activeTab:        DropdownCategory | 'semua'
  expandedId:       string | null
  onTabChange:      (tab: DropdownCategory | 'semua') => void
  onToggleExpand:   (id: string) => void
  onEdit:           (grup: GrupDenganOpsi) => void
  onDeactivate:     (grup: GrupDenganOpsi) => void
  onDeleteClick:    (grup: GrupDenganOpsi) => void
  onDataChanged:    () => void
  /** Safety status map dari parent — kunci `${source_table}:${id}` */
  safetyMap:        SafetyStatusFullMap
  /** True saat parent masih fetch safetyMap — DeleteActionButton tampil spinner */
  safetyMapLoading: boolean
}

// ─── Komponen ────────────────────────────────────────────────────────────────

export function DropdownGroupsTable({
  filtered, grupList, activeTab, expandedId,
  onTabChange, onToggleExpand, onEdit, onDeactivate,
  onDeleteClick, onDataChanged,
  safetyMap, safetyMapLoading,
}: Props): JSX.Element {

  const categories = [...new Set(grupList.map(g => g.category))] as DropdownCategory[]
  const { sorted, handleSort, sortIcon, sortIconClass } = useSortableTable(filtered, 'slug', 'asc')
  const [openUsagePanelId, setOpenUsagePanelId] = useState<string | null>(null)

  return (
    <>
      {/* Filter kategori */}
      <div className="flex items-center gap-2">
        <Select value={activeTab} onValueChange={v => onTabChange(v as DropdownCategory | 'semua')}>
          <SelectTrigger className="w-[240px]"><SelectValue placeholder="Pilih kategori..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua ({grupList.length})</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat} value={cat}>
                {CATEGORY_LABELS[cat]} ({grupList.filter(g => g.category === cat).length})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabel */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="w-6" />
              <TableHead className="cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('slug')}>
                Slug <span className={sortIconClass('slug')}>{sortIcon('slug')}</span>
              </TableHead>
              <TableHead className="cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('display_name')}>
                Nama Tampilan <span className={sortIconClass('display_name')}>{sortIcon('display_name')}</span>
              </TableHead>
              <TableHead className="cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('category')}>
                Kategori <span className={sortIconClass('category')}>{sortIcon('category')}</span>
              </TableHead>
              <TableHead className="text-center">Opsi</TableHead>
              <TableHead>Tenant Override</TableHead>
              <TableHead className="cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('is_active')}>
                Status <span className={sortIconClass('is_active')}>{sortIcon('is_active')}</span>
              </TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-slate-400 text-sm">
                  Tidak ada grup untuk kategori ini.
                </TableCell>
              </TableRow>
            ) : sorted.map(grup => (
              <GroupRow
                key={grup.id}
                grup={grup}
                expandedId={expandedId}
                openUsagePanelId={openUsagePanelId}
                safetyMap={safetyMap}
                safetyMapLoading={safetyMapLoading}
                onToggleExpand={onToggleExpand}
                onOpenUsage={(id) => setOpenUsagePanelId(p => p === id ? null : id)}
                onCloseUsage={() => setOpenUsagePanelId(null)}
                onEdit={onEdit}
                onDeactivate={onDeactivate}
                onDeleteClick={onDeleteClick}
                onDataChanged={onDataChanged}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}

// ─── Sub-komponen GroupRow ───────────────────────────────────────────────────
// Dipecah supaya bisa pakai useDeletePermission hook (hook hanya boleh di top-level).

interface GroupRowProps {
  grup:             GrupDenganOpsi
  expandedId:       string | null
  openUsagePanelId: string | null
  safetyMap:        SafetyStatusFullMap
  safetyMapLoading: boolean
  onToggleExpand:   (id: string) => void
  onOpenUsage:      (id: string) => void
  onCloseUsage:     () => void
  onEdit:           (grup: GrupDenganOpsi) => void
  onDeactivate:     (grup: GrupDenganOpsi) => void
  onDeleteClick:    (grup: GrupDenganOpsi) => void
  onDataChanged:    () => void
}

function GroupRow({
  grup, expandedId, openUsagePanelId,
  safetyMap, safetyMapLoading,
  onToggleExpand, onOpenUsage, onCloseUsage,
  onEdit, onDeactivate, onDeleteClick, onDataChanged,
}: GroupRowProps): JSX.Element {

  const isUsageOpen = openUsagePanelId === grup.id

  // ── Hitung verdict opsi (rollup ke grup) ──────────────────────────────────
  const optionVerdicts = grup.opsi
    .filter(o => !o.is_system)
    .map(o => getOptionVerdict(o, grup, safetyMap[`master_dropdown_options:${o.id}`] ?? null))

  // ── Hitung verdict grup via hook ──────────────────────────────────────────
  const groupVerdict = useDeletePermission({
    type:           'group',
    group:          grup,
    optionVerdicts,
    safetyMap,
  })

  const IEdit  = ICON_ACTION.edit
  const IInfo  = ICON_STATUS.info
  const IWarn  = ICON_STATUS.warning
  const IDown  = ICON_NAV.chevronDown
  const IRight = ICON_NAV.chevronRight

  return (
    <Fragment>
      <TableRow
        className="cursor-pointer hover:bg-slate-50"
        onClick={() => onToggleExpand(grup.id)}
      >
        <TableCell className={!grup.is_active ? 'opacity-50' : ''}>
          {expandedId === grup.id
            ? <IDown size={14} className="text-slate-400" />
            : <IRight size={14} className="text-slate-400" />}
        </TableCell>
        <TableCell className={!grup.is_active ? 'opacity-50' : ''}>
          <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">{grup.slug}</code>
          {grup.is_system && <Badge variant="outline" className="ml-1.5 text-xs h-4">Sistem</Badge>}
        </TableCell>
        <TableCell className={`font-medium text-sm ${!grup.is_active ? 'opacity-50' : ''}`}>
          {grup.display_name}
        </TableCell>
        <TableCell className={!grup.is_active ? 'opacity-50' : ''}>
          <Badge variant="secondary" className="text-xs">{CATEGORY_LABELS[grup.category]}</Badge>
        </TableCell>
        <TableCell className={`text-center text-sm ${!grup.is_active ? 'opacity-50' : ''}`}>
          {grup.opsi.filter(o => o.is_active).length}
        </TableCell>
        <TableCell className={`text-sm text-slate-500 ${!grup.is_active ? 'opacity-50' : ''}`}>
          {grup.tenant_can_override ? OVERRIDE_MODE_LABELS[grup.tenant_override_mode] : '—'}
        </TableCell>
        <TableCell className={!grup.is_active ? 'opacity-50' : ''}>
          <Badge variant={grup.is_active ? 'default' : 'secondary'} className="text-xs">
            {grup.is_active ? 'Aktif' : 'Nonaktif'}
          </Badge>
        </TableCell>
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
            {/* Pemetaan Pemakaian */}
            <Button size="sm" variant="ghost" title="Pemetaan Pemakaian"
              className={`h-7 w-7 p-0 ${isUsageOpen ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:text-slate-600'}`}
              onClick={() => onOpenUsage(grup.id)}>
              <IInfo size={13} />
            </Button>
            {/* Edit */}
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onEdit(grup)}>
              <IEdit size={13} />
            </Button>
            {/* Nonaktifkan */}
            {grup.is_active && !grup.is_system && (
              <Button size="sm" variant="ghost" title="Nonaktifkan"
                className="h-7 w-7 p-0 text-amber-500 hover:text-amber-600"
                onClick={() => onDeactivate(grup)}>
                <IWarn size={13} />
              </Button>
            )}
            {/* Hapus — konsumsi verdict via DeleteActionButton */}
            {!grup.is_system && (
              <DeleteActionButton
                verdict={groupVerdict}
                onClick={() => onDeleteClick(grup)}
                size="md"
                loading={safetyMapLoading}
              />
            )}
          </div>
        </TableCell>
      </TableRow>

      {/* Panel Pemetaan Pemakaian — inline accordion per baris */}
      {isUsageOpen && (
        <TableRow>
          <TableCell colSpan={8} className="p-0">
            <div className="px-4 py-3 bg-blue-50/30 border-t border-blue-100">
              <UsageTrackingPanel
                sourceTable="master_dropdown_groups"
                sourceId={grup.id}
                isOpen={true}
                onClose={onCloseUsage}
                itemLabel={grup.display_name}
              />
            </div>
          </TableCell>
        </TableRow>
      )}

      {/* Panel Opsi — expand */}
      {expandedId === grup.id && (
        <TableRow>
          <TableCell colSpan={8} className="p-0">
            <DropdownOptionsPanel
              grup={grup}
              onDataChanged={onDataChanged}
              safetyMap={safetyMap}
              safetyMapLoading={safetyMapLoading}
            />
          </TableCell>
        </TableRow>
      )}
    </Fragment>
  )
}
