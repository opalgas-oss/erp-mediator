'use client'

// app/dashboard/superadmin/settings/security-login/ConfigPageClient.tsx
// Client component untuk halaman konfigurasi SuperAdmin.
// Menampilkan daftar config items dalam kartu per kategori.
// Mengelola state perubahan, save, dan reset.
//
// PERUBAHAN Sesi #097 — PL-S08 M1:
//   - Ganti local interface ConfigItemData dengan import dari @/components/ConfigItem
//
// PERUBAHAN Sesi #100 — Sentralisasi UI:
//   - Hapus overflow-y-auto overflow-x-auto dari wrapper grid dan CardContent
//   - Scroll didelegasi ke DashboardShell (<main> dengan SCROLL_CLS.main)
//   - Pakai TYPOGRAPHY.cardTitle dari ui-tokens.constant untuk CardTitle

import { useState }   from 'react'
import { toast }      from 'sonner'
import { Button }     from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge }      from '@/components/ui/badge'
import { ConfigItem, type ConfigItemData } from '@/components/ConfigItem'
import { TYPOGRAPHY } from '@/lib/constants/ui-tokens.constant'

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

      const updates: Array<{
        id:          string
        feature_key: string
        nilai?:      string
        akses_ubah?: string[]
      }> = []

      config.forEach((group, gi) => {
        group.items.forEach((item, ii) => {
          const orig = originalConfig[gi]?.items[ii]
          if (!orig) return

          const valueChanged = String(item.value) !== String(orig.value)
          const adminChanged = item.adminCanChange !== orig.adminCanChange

          // Catatan: item.enabled (toggle Aktif) TIDAK disimpan ke is_active DB.
          // is_active di DB = apakah item TAMPIL di panel (jangan diubah via UI ini).
          // Perubahan enabled hanya berlaku sebagai UX state (disable input fields).
          if (!valueChanged && !adminChanged) return

          const update: typeof updates[number] = {
            id:          item.id,
            feature_key: group.feature_key,
          }

          if (valueChanged) {
            update.nilai = String(item.value)
          }

          if (adminChanged) {
            update.akses_ubah = item.adminCanChange
              ? ['superadmin', 'admintenant']
              : ['superadmin']
          }

          updates.push(update)
        })
      })

      if (updates.length === 0) { setHasChanges(false); return }

      const res  = await fetch('/api/config/bulk', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ updates }),
      })
      const json = await res.json() as { success: boolean; message?: string }

      if (!json.success) {
        throw new Error(json.message ?? 'Gagal menyimpan konfigurasi')
      }

      toast.success(`${updates.length} item konfigurasi berhasil disimpan`)
      setHasChanges(false)

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan'
      setError(msg)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col min-h-full">

      {/* Grid kartu — scroll dihandle DashboardShell, tidak perlu overflow di sini */}
      <div className="flex-1 px-8 pt-4 pb-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {config.map((group, groupIndex) => (
            <Card
              key={group.feature_key + groupIndex}
              className="bg-white/80 backdrop-blur-sm border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all"
            >
              <CardHeader className="pt-2 pb-1 px-4 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <CardTitle className={TYPOGRAPHY.cardTitle}>
                    {group.title}
                  </CardTitle>
                  <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-xs border-0">
                    {group.items.length} item
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-1 pb-1 px-4">
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
            <p className={TYPOGRAPHY.error}>{error}</p>
          </div>
        )}
      </div>

      {/* Footer tombol aksi — sticky di bawah */}
      <div className="sticky bottom-0 flex items-center justify-end gap-2 px-8 py-3 border-t border-slate-200 bg-slate-50/80 backdrop-blur-sm">
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
