'use client'

import { useState } from 'react'
import { Button }      from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge }       from '@/components/ui/badge'
import { ConfigItem }  from '@/components/ConfigItem'

interface ConfigItemData {
  id:             string
  label:          string
  type:           'toggle' | 'number-unit' | 'select-only'
  value:          number | boolean | string
  unit?:          string
  units?:         string[]
  options?:       string[]
  option_group_id?: string | null
  adminCanChange: boolean
  enabled:        boolean
}

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

  const handleItemChange = (groupIndex: number, itemIndex: number, updates: Partial<ConfigItemData>) => {
    const next = JSON.parse(JSON.stringify(config))
    next[groupIndex].items[itemIndex] = { ...next[groupIndex].items[itemIndex], ...updates }
    setConfig(next)
    setHasChanges(JSON.stringify(next) !== JSON.stringify(originalConfig))
  }

  const handleReset = () => {
    setConfig(JSON.parse(JSON.stringify(originalConfig)))
    setHasChanges(false)
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)

      const changedItems: Array<{ feature_key: string; id: string; nilai: string }> = []
      config.forEach((group, gi) => {
        group.items.forEach((item, ii) => {
          const orig = originalConfig[gi]?.items[ii]
          if (!orig || String(item.value) !== String(orig.value)) {
            changedItems.push({ feature_key: group.feature_key, id: item.id, nilai: String(item.value) })
          }
        })
      })

      if (changedItems.length === 0) { setHasChanges(false); return }

      const results = await Promise.all(
        changedItems.map(({ feature_key, id, nilai }) =>
          fetch(`/api/config/${feature_key}`, {
            method:  'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ id, nilai }),
          }).then(res => res.json())
        )
      )

      if (results.some(r => !r.success)) throw new Error('Sebagian konfigurasi gagal disimpan')
      setHasChanges(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Konten utama — judul + deskripsi sudah dipindah ke DashboardHeader */}
      <div className="flex-1 overflow-y-auto overflow-x-auto px-8 pt-4 pb-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {config.map((group, groupIndex) => (
            <Card key={group.feature_key + groupIndex} className="bg-white/80 backdrop-blur-sm border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all">
              <CardHeader className="pt-2 pb-1 px-4 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-slate-900">{group.title}</CardTitle>
                  <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-xs border-0">{group.items.length} item</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-1 pb-1 px-4 overflow-y-auto overflow-x-auto">
                {group.items.map((item, itemIndex) => (
                  <div key={item.id} className={itemIndex > 0 ? 'border-t border-slate-100' : ''}>
                    <ConfigItem
                      item={item}
                      onValueChange={(value)           => handleItemChange(groupIndex, itemIndex, { value })}
                      onUnitChange={(unit)             => handleItemChange(groupIndex, itemIndex, { unit })}
                      onAdminCanChangeToggle={(adminCanChange) => handleItemChange(groupIndex, itemIndex, { adminCanChange })}
                      onEnabledToggle={(enabled)       => handleItemChange(groupIndex, itemIndex, { enabled })}
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
        <Button variant="outline" onClick={handleReset} disabled={!hasChanges || saving}
          className="text-xs border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          Reset ke Default
        </Button>
        <Button onClick={handleSave} disabled={!hasChanges || saving}
          className="text-xs bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50">
          {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
        </Button>
      </div>
    </div>
  )
}
