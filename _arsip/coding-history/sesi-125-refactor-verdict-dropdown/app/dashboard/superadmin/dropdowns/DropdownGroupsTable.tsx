'use client'

// app/dashboard/superadmin/dropdowns/DropdownGroupsTable.tsx
// Tabel grup dropdown: sort kolom + expand opsi + Pemetaan Pemakaian + tombol Hapus.
// Delete state/handlers di DropdownGroupsClient. Komponen ini hanya render + emit events.
// Dibuat S#115. Update S#122: sort + UsageTrackingPanel + delete button.

import { Fragment, useState, type JSX }          from 'react'
import type { GrupDenganOpsi, DropdownCategory } from '@/lib/types/master-dropdown.types'
import type { SafetyVerdict }                     from '@/lib/types/usage-tracking.types'
import { useSortableTable }                       from '@/lib/hooks/useSortableTable'
import UsageTrackingPanel                         from '@/components/superadmin/UsageTrackingPanel'
import { ICON_ACTION, ICON_NAV, ICON_STATUS }     from '@/lib/constants/icons.constant'
import { CATEGORY_LABELS, OVERRIDE_MODE_LABELS }  from './DropdownGroupDialogs'
import { DropdownOptionsPanel }                   from './DropdownOptionsPanel'
import { Button } from '@/components/ui/button'
import { Badge }  from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface Props {
  filtered:        GrupDenganOpsi[]
  grupList:        GrupDenganOpsi[]
  activeTab:       DropdownCategory | 'semua'
  expandedId:      string | null
  onTabChange:     (tab: DropdownCategory | 'semua') => void
  onToggleExpand:  (id: string) => void
  onEdit:          (grup: GrupDenganOpsi) => void
  onDeactivate:    (grup: GrupDenganOpsi) => void
  onDeleteClick:   (grup: GrupDenganOpsi) => void
  onDataChanged:   () => void
  deleteVerdicts:  Record<string, SafetyVerdict | 'loading'>
}

export function DropdownGroupsTable({
  filtered, grupList, activeTab, expandedId,
  onTabChange, onToggleExpand, onEdit, onDeactivate,
  onDeleteClick, onDataChanged, deleteVerdicts,
}: Props): JSX.Element {

  const categories = [...new Set(grupList.map(g => g.category))] as DropdownCategory[]
  const { sorted, handleSort, sortIcon, sortIconClass } = useSortableTable(filtered, 'slug', 'asc')
  const [openUsagePanelId, setOpenUsagePanelId] = useState<string | null>(null)

  const IEdit = ICON_ACTION.edit,    IDel   = ICON_ACTION.delete
  const IInfo = ICON_STATUS.info,    IWarn  = ICON_STATUS.warning, ILoad = ICON_STATUS.loading
  const IDown = ICON_NAV.chevronDown, IRight = ICON_NAV.chevronRight

  return (
    <>
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
            ) : sorted.map(grup => {
              const isUsageOpen  = openUsagePanelId === grup.id
              const delVerdict   = deleteVerdicts[grup.id]
              const isDelLoading = delVerdict === 'loading'
              const isDelBlocked = delVerdict !== 'AMAN'
              return (
                <Fragment key={grup.id}>
                  <TableRow className="cursor-pointer hover:bg-slate-50" onClick={() => onToggleExpand(grup.id)}>
                    <TableCell className={!grup.is_active ? 'opacity-50' : ''}>
                      {expandedId === grup.id
                        ? <IDown size={14} className="text-slate-400" />
                        : <IRight size={14} className="text-slate-400" />}
                    </TableCell>
                    <TableCell className={!grup.is_active ? 'opacity-50' : ''}>
                      <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">{grup.slug}</code>
                      {grup.is_system && <Badge variant="outline" className="ml-1.5 text-xs h-4">Sistem</Badge>}
                    </TableCell>
                    <TableCell className={`font-medium text-sm ${!grup.is_active ? 'opacity-50' : ''}`}>{grup.display_name}</TableCell>
                    <TableCell className={!grup.is_active ? 'opacity-50' : ''}>
                      <Badge variant="secondary" className="text-xs">{CATEGORY_LABELS[grup.category]}</Badge>
                    </TableCell>
                    <TableCell className={`text-center text-sm ${!grup.is_active ? 'opacity-50' : ''}`}>{grup.opsi.filter(o => o.is_active).length}</TableCell>
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
                        <Button size="sm" variant="ghost" title="Pemetaan Pemakaian"
                          className={`h-7 w-7 p-0 ${isUsageOpen ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:text-slate-600'}`}
                          onClick={() => setOpenUsagePanelId(p => p === grup.id ? null : grup.id)}>
                          <IInfo size={13} />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onEdit(grup)}>
                          <IEdit size={13} />
                        </Button>
                        {grup.is_active && !grup.is_system && (
                          <Button size="sm" variant="ghost" title="Nonaktifkan"
                            className="h-7 w-7 p-0 text-amber-500 hover:text-amber-600"
                            onClick={() => onDeactivate(grup)}>
                            <IWarn size={13} />
                          </Button>
                        )}
                        {!grup.is_system && (
                          <Button size="sm" variant="ghost" disabled={isDelBlocked}
                            className={`h-7 w-7 p-0 ${isDelBlocked ? 'text-slate-300 cursor-not-allowed' : 'text-red-400 hover:text-red-600'}`}
                            title={
                              isDelLoading                  ? 'Memeriksa pemakaian...' :
                              delVerdict === undefined      ? 'Memeriksa status pemakaian...' :
                              grup.opsi.some(o => o.is_default && o.is_active) ? 'Tidak aman dihapus — grup memiliki opsi default. Pindahkan data lalu hapus default dulu.' :
                              delVerdict === 'TIDAK_BISA'   ? 'Tidak aman dihapus — ada di kode modul yang sedang dibangun' :
                              delVerdict === 'TIDAK_AMAN'   ? 'Tidak bisa dihapus — sedang aktif dipakai modul lain' :
                              'Hapus grup'
                            }
                            onClick={() => onDeleteClick(grup)}>
                            {isDelLoading ? <ILoad size={13} className="animate-spin" /> : <IDel size={13} />}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>

                  {isUsageOpen && (
                    <TableRow>
                      <TableCell colSpan={8} className="p-0">
                        <div className="px-4 py-3 bg-blue-50/30 border-t border-blue-100">
                          <UsageTrackingPanel
                            sourceTable="master_dropdown_groups"
                            sourceId={grup.id}
                            isOpen={true}
                            onClose={() => setOpenUsagePanelId(null)}
                            itemLabel={grup.display_name}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  )}

                  {expandedId === grup.id && (
                    <TableRow>
                      <TableCell colSpan={8} className="p-0">
                        <DropdownOptionsPanel grup={grup} onDataChanged={onDataChanged} />
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
