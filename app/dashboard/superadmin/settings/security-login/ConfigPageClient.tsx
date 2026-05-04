'use client'

// app/dashboard/superadmin/settings/security-login/ConfigPageClient.tsx
// Client component untuk halaman konfigurasi SuperAdmin.
// Menampilkan daftar config items dalam kartu per kategori.
// Mengelola state perubahan, save, dan reset.
//
// PERUBAHAN Sesi #097 — PL-S08 M1:
//   - Ganti local interface ConfigItemData dengan import dari @/components/ConfigItem
//     (DRY — satu definisi type, satu sumber kebenaran)
//   - Tidak ada perubahan logika — hanya type alignment

import { useState }   from 'react'
import { Button }     from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge }      from '@/components/ui/badge'
import { ConfigItem, type ConfigItemData } from '@/components/ConfigItem'

// ConfigItemData diimport dari ConfigItem — tidak didefinisikan ulang di sini (DRY)

interface ConfigGroup {
  title:       string
  feature_key: string
  items:       ConfigItemData[]
}

export function ConfigPageClient({ initialData }: { initialData: ConfigGroup[] }) {
  const [config, setConfig]         = useState<ConfigGroup[]>(initialData)
  const [originalConfig]            = useState<ConfigGroup[]>(JSON.parse(JSON.stringify(initialData)))
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  const handleItemChange = (
    groupIndex: number,
    itemIndex:  number,
    updates:    Partial<ConfigItemData>,
  ): void => {
    const next = JSON.parse(JSON.stringify(config)) as ConfigGroup[]
    next[groupIndex].items[itemIndex] = { ...next[groupIndex].items[itemIndex], ...updates }
    setConfig(next)
    setHasChanges(JSON.stringify(next) !== JSON.stringify(originalConfig))
  }

  const handleReset = (): void => {
    setConfig(JSON.parse(JSON.stringify(originalConfig)))
    setHasChanges(false)
  }

  const handleSave = async (): Promise<void> => {
    try {
      setSaving(true)
      setError(null)

      // Kumpulkan hanya item yang berubah
      const updates: Array<{ id: string; feature_key: string; nilai: string }> = []
      config.forEach((group, gi) => {
        group.items.forEach((item, ii) => {
          const orig = originalConfig[gi]?.items[ii]
          if (!orig || String(item.value) !== String(orig.value)) {
            updates.push({
              id:          item.id,
              feature_key: group.feature_key,
              nilai:       String(item.value),
            })
          }
        })
      })

      if (updates.length === 0) { setHasChanges(false); return }

      // Satu POST bulk — atomic via sp_bulk_update_config
      const res  = await fetch('/api/config/bulk', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ updates }),
      })
      const json = await res.json() as { success: boolean; message?: string }

      if (!json.success) {
        throw new Error(json.message ?? 'Gagal menyimpan konfigurasi')
      }
      setHasChanges(false)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Grid kartu per kategori */}
      <div className="flex-1 overflow-y-auto overflow-x-auto px-8 pt-4 pb-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {config.map((group, groupIndex) => (
            <Card
              key={group.feature_key + groupIndex}
              className="bg-white/80 backdrop-blur-sm border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all"
            >
              <CardHeader className="pt-2 pb-1 px-4 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-slate-900">
                    {group.title}
                  </CardTitle>
                  <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-xs border-0">
                    {group.items.length} item
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-1 pb-1 px-4 overflow-y-auto overflow-x-auto">
                {group.items.map((item, itemIndex) => (
                  <div
                    key={item.id}
                    className={itemIndex > 0 ? 'border-t border-slate-100' : ''}
                  >
                    <ConfigItem
                      item={item}
                      onValueChange={(value) =>
                        handleItemChange(groupIndex, itemIndex, { value })
                      }
                      onUnitChange={(unit) =>
                        handleItemChange(groupIndex, itemIndex, { unit })
                      }
                      onAdminCanChangeToggle={(adminCanChange) =>
                        handleItemChange(groupIndex, itemIndex, { adminCanChange })
                      }
                      onEnabledToggle={(enabled) =>
                        handleItemChange(groupIndex, itemIndex, { enabled })
                      }
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>

        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700 text-xs">{error}</p>
          </div>
        )}
      </div>

      {/* Footer tombol aksi */}
      <div className="flex-shrink-0 flex items-center justify-end gap-2 px-8 py-3 border-t border-slate-200 bg-slate-50/80">
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={!hasChanges || saving}
          className="text-xs border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Reset ke Default
        </Button>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className="text-xs bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
        >
          {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
        </Button>
      </div>
    </div>
  )
}
