'use client'
// app/dashboard/superadmin/providers/InstanceTable.tsx
// Tabel daftar instances per provider — dipecah dari ProvidersClient.tsx S#151
// Dibuat: Sesi #151 — ATURAN 9 (ProvidersClient melebihi 10 KB setelah split awal)

import { Button }             from '@/components/ui/button'
import { HealthBadge }        from '@/components/superadmin/HealthBadge'
import { ICON_ACTION, ICON_STATUS } from '@/lib/constants/icons.constant'
import { TYPOGRAPHY }         from '@/lib/constants/ui-tokens.constant'
import type { ProviderInstance } from '@/lib/types/provider.types'

interface Props {
  instances:   ProviderInstance[]
  testingId:   string | null
  onTest:      (id: string) => void
  onKonfigurasi:(id: string) => void
}

export function InstanceTable({ instances, testingId, onTest, onKonfigurasi }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '35%' }} /><col style={{ width: '20%' }} />
          <col style={{ width: '18%' }} /><col style={{ width: '27%' }} />
        </colgroup>
        <thead>
          <tr className="border-b border-slate-100">
            <th className={`text-left py-2 px-3 ${TYPOGRAPHY.tableHead}`}>Nama Instance</th>
            <th className={`text-left py-2 px-3 ${TYPOGRAPHY.tableHead}`}>Status</th>
            <th className={`text-left py-2 px-3 ${TYPOGRAPHY.tableHead}`}>Terakhir Dites</th>
            <th className={`text-right py-2 px-3 ${TYPOGRAPHY.tableHead}`}>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {instances.map(inst => (
            <tr key={inst.id} className="border-b border-slate-50 hover:bg-slate-50/50">
              <td className="py-2.5 px-3">
                <p className="font-medium text-slate-800 text-xs">{inst.nama_server}</p>
                {inst.is_default && <span className="text-[10px] text-blue-600 font-medium">Default</span>}
              </td>
              <td className="py-2.5 px-3">
                <HealthBadge status={inst.health_status} size="sm" />
              </td>
              <td className={`py-2.5 px-3 ${TYPOGRAPHY.caption}`}>
                {inst.last_tested_at ? new Date(inst.last_tested_at).toLocaleDateString('id-ID') : '—'}
              </td>
              <td className="py-2.5 px-3">
                <div className="flex items-center justify-end gap-1">
                  <Button size="sm" variant="ghost" onClick={() => onTest(inst.id)} disabled={testingId === inst.id} className="text-xs h-7 px-2">
                    {testingId === inst.id ? <ICON_STATUS.loading size={12} className="animate-spin" /> : <ICON_ACTION.refresh size={12} />}
                    <span className="ml-1">Test</span>
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onKonfigurasi(inst.id)} className="text-xs h-7 px-2">
                    <ICON_ACTION.edit size={12} /><span className="ml-1">Konfigurasi</span>
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
