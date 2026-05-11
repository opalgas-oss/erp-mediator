'use client'

// app/dashboard/superadmin/dropdowns/DropdownGroupsTable.tsx
// Tabel grup dropdown: sort kolom + expand opsi + kebab menu aksi.
//
// PERAN SETELAH S#127 REFACTOR (L3.3):
//   - Kolom Aksi: kebab menu (⋮) gantikan tombol ⓘ/✏️/⚠️/🗑️ yang berjajar
//   - "Lihat Pemetaan" di kebab → trigger onOpenDrawer (side peek drawer)
//   - Inline UsageTrackingPanel accordion DIHAPUS (penyebab bug Sk 2)
//   - Expand row untuk OPSI LIST tetap (parent-child UX, bukan panel info)
//   - Verdict layer tetap via useDeletePermission
//
// HAPUS DI S#127:
//   - openUsagePanelId state + inline UsageTrackingPanel accordion row
//   - Tombol ⓘ / ✏️ / ⚠️ berjajar di kolom Aksi
//   - onOpenUsage / onCloseUsage props di GroupRow
//
// Dibuat S#115. Update S#122/S#124. REFACTOR S#125: verdict layer.
// REFACTOR S#127 (L3.3): kebab menu + side peek drawer (hapus inline panel).

import { Fragment, type JSX }                    from 'react'
import type { GrupDenganOpsi, DropdownCategory } from '@/lib/types/master-dropdown.types'
import type { SafetyStatusFullMap }              from '@/lib/types/usage-tracking.types'
import { useDeletePermission }                   from '@/lib/hooks/useDeletePermission'
import { getOptionVerdict }                      from '@/lib/dropdowns/verdict'
import { useSortableTable }                      from '@/lib/hooks/useSortableTable'
import { DeleteActionButton }                    from '@/components/dropdowns/DeleteActionButton'
import type { DrawerTarget }                     from '@/components/dropdowns/DropdownDetailDrawer'
import { ICON_ACTION, ICON_NAV }                 from '@/lib/constants/icons.constant'
import { CATEGORY_LABELS, OVERRIDE_MODE_LABELS } from './DropdownGroupDialogs'
import { DropdownOptionsPanel }                  from './DropdownOptionsPanel'
import { Button }      from '@/components/ui/button'
import { Badge }       from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  /** Buka side peek drawer untuk item ini */
  onOpenDrawer:     (target: DrawerTarget) => void
  /** Safety status map dari parent — kunci `${source_table}:${id}` */
  safetyMap:        SafetyStatusFullMap
  /** True saat parent masih fetch safetyMap — DeleteActionButton tampil spinner */
  safetyMapLoading: boolean
}

// ─── Komponen ────────────────────────────────────────────────────────────────

export function DropdownGroupsTable({
  filtered, grupList, activeTab, expandedId,
  onTabChange, onToggleExpand, onEdit, onDeactivate,
  onDeleteClick, onDataChanged, onOpenDrawer,
  safetyMap, safetyMapLoading,
}: Props): JSX.Element {

  const categories = [...new Set(grupList.map(g => g.category))] as DropdownCategory[]
  const { sorted, handleSort, sortIcon, sortIconClass } = useSortableTable(filtered, 'slug', 'asc')

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
              <TableHead className="w-12 text-right">Aksi</TableHead>
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
                safetyMap={safetyMap}
                safetyMapLoading={safetyMapLoading}
                onToggleExpand={onToggleExpand}
                onOpenDrawer={onOpenDrawer}
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
  safetyMap:        SafetyStatusFullMap
  safetyMapLoading: boolean
  onToggleExpand:   (id: string) => void
  onOpenDrawer:     (target: DrawerTarget) => void
  onEdit:           (grup: GrupDenganOpsi) => void
  onDeactivate:     (grup: GrupDenganOpsi) => void
  onDeleteClick:    (grup: GrupDenganOpsi) => void
  onDataChanged:    () => void
}

function GroupRow({
  grup, expandedId,
  safetyMap, safetyMapLoading,
  onToggleExpand, onOpenDrawer,
  onEdit, onDeactivate, onDeleteClick, onDataChanged,
}: GroupRowProps): JSX.Element {

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

  const IMore  = ICON_ACTION.more
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

        {/* Kolom Aksi — kebab menu (⋮) menggantikan tombol berjajar */}
        <TableCell className="text-right w-12">
          <div onClick={e => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700">
                  <IMore size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {/* Lihat Pemetaan — buka side peek drawer */}
                <DropdownMenuItem onClick={() => onOpenDrawer({
                  sourceTable: 'master_dropdown_groups',
                  sourceId:    grup.id,
                  itemLabel:   grup.display_name,
                  verdict:     groupVerdict,
                  isSystem:    grup.is_system,
                })}>
                  Lihat Pemetaan
                </DropdownMenuItem>

                {/* Edit */}
                <DropdownMenuItem onClick={() => onEdit(grup)}>
                  Edit
                </DropdownMenuItem>

                {/* Nonaktifkan */}
                {grup.is_active && !grup.is_system && (
                  <DropdownMenuItem
                    onClick={() => onDeactivate(grup)}
                    className="text-amber-600 focus:text-amber-600"
                  >
                    Nonaktifkan
                  </DropdownMenuItem>
                )}

                {/* Hapus — konsumsi verdict, disabled kalau tidak aman */}
                {!grup.is_system && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => { if (groupVerdict.action !== 'disabled') onDeleteClick(grup) }}
                      disabled={groupVerdict.action === 'disabled' || safetyMapLoading}
                      className="text-destructive focus:text-destructive"
                    >
                      Hapus
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </TableCell>
      </TableRow>

      {/* Panel Opsi — expand row untuk parent-child UX (TETAP, bukan panel info) */}
      {expandedId === grup.id && (
        <TableRow>
          <TableCell colSpan={8} className="p-0">
            <DropdownOptionsPanel
              grup={grup}
              onDataChanged={onDataChanged}
              safetyMap={safetyMap}
              safetyMapLoading={safetyMapLoading}
              onOpenDrawer={onOpenDrawer}
            />
          </TableCell>
        </TableRow>
      )}
    </Fragment>
  )
}
