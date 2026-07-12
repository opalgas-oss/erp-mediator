'use client'

// app/dashboard/superadmin/settings/monitoring/MonitoringSettingsClient.tsx
// Client TERPADU untuk halaman Pengaturan Monitoring (M06).
// Sesuai Mockup_M06_Pengaturan_Monitoring_v2.html: 4 kartu grid 2 kolom + SATU footer di bawah.
//
// Dibuat: Sesi #357 — FIX UI/UX (hapus ruang kosong + satu footer sesuai mockup v2)
// LATAR: ConfigPageClient (shared) + AlertConfigPageClient masing-masing full-height (min-h-full)
//   + footer sticky. Pola itu benar untuk SATU komponen mengisi SATU halaman; saat DITUMPUK di
//   halaman ini (config + recipient) menghasilkan ruang kosong besar + 2 footer. Komponen ini
//   menyatukan render di bawah SATU footer + SATU aksi simpan.
//
// REUSE (tanpa duplikasi unit): ConfigItem (config), AlertConfigItem (recipient multi-input),
//   endpoint /api/config/bulk (feature_key per-item → campur config + recipient dalam satu POST aman).
// Shared ConfigPageClient TIDAK diubah → halaman config lain (Login, Multi Role, dll) tak terpengaruh.
// Scope: SA-only, halaman monitoring saja → tidak didaftarkan cr_functions (bukan shared function).

import { useState }     from 'react'
import { toast }        from 'sonner'
import { Button }       from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge }        from '@/components/ui/badge'
import { ConfigItem, type ConfigItemData } from '@/components/ConfigItem'
import { AlertConfigItem } from './AlertConfigItem'
import { TYPOGRAPHY }   from '@/lib/constants/ui-tokens.constant'
import { ICON_STATUS }  from '@/lib/constants/icons.constant'

// ─── Tipe ──────────────────────────────────────────────────────────────────────

// Grup config (Monitoring / Alert) — dirender via ConfigItem
interface ConfigGroup {
  title:       string
  feature_key: string
  items:       ConfigItemData[]
}

// Satu field penerima (WA / Email) — dirender via AlertConfigItem
interface RecipientField {
  id:          string
  label:       string
  fieldName:   string
  feature_key: string
  values:      string[]
  enabled:     boolean
  placeholder?: string
}

// Grup recipient (satu kartu) — mis. "Penerima Notifikasi Alert"
interface RecipientGroup {
  title:       string
  description: string
  fields:      RecipientField[]
}

interface MonitoringSettingsClientProps {
  configData:      ConfigGroup[]
  recipientGroups: RecipientGroup[]
}

// ─── Deteksi perubahan ─────────────────────────────────────────────────────────

function configChanged(current: ConfigGroup[], original: ConfigGroup[]): boolean {
  return current.some((group, gi) =>
    group.items.some((item, ii) => {
      const orig = original[gi]?.items[ii]
      if (!orig) return false
      return (
        String(item.value)  !== String(orig.value)  ||
        item.enabled        !== orig.enabled         ||
        item.adminCanChange !== orig.adminCanChange
      )
    })
  )
}

function recipientsChanged(current: RecipientGroup[], original: RecipientGroup[]): boolean {
  return current.some((group, gi) =>
    group.fields.some((field, fi) => {
      const orig = original[gi]?.fields[fi]
      if (!orig) return false
      return (
        field.enabled !== orig.enabled ||
        JSON.stringify(field.values) !== JSON.stringify(orig.values)
      )
    })
  )
}

// ─── Komponen ──────────────────────────────────────────────────────────────────

export function MonitoringSettingsClient({
  configData,
  recipientGroups,
}: MonitoringSettingsClientProps) {
  const [config, setConfig]         = useState<ConfigGroup[]>(configData)
  const [origConfig, setOrigConfig] = useState<ConfigGroup[]>(
    JSON.parse(JSON.stringify(configData))
  )
  const [groups, setGroups]         = useState<RecipientGroup[]>(recipientGroups)
  const [origGroups, setOrigGroups] = useState<RecipientGroup[]>(
    JSON.parse(JSON.stringify(recipientGroups))
  )
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  const LoadingIcon = ICON_STATUS.loading

  // Recompute hasChanges dari state config + recipient terbaru
  const recompute = (nextConfig: ConfigGroup[], nextGroups: RecipientGroup[]): void => {
    setHasChanges(
      configChanged(nextConfig, origConfig) || recipientsChanged(nextGroups, origGroups)
    )
  }

  // ── Handler config item ──
  const handleItemChange = (
    gi: number,
    ii: number,
    updates: Partial<ConfigItemData>,
  ): void => {
    const next = JSON.parse(JSON.stringify(config)) as ConfigGroup[]
    next[gi].items[ii] = { ...next[gi].items[ii], ...updates }
    setConfig(next)
    recompute(next, groups)
  }

  // ── Handler recipient ──
  const handleRecipValues = (gi: number, fi: number, values: string[]): void => {
    const next = JSON.parse(JSON.stringify(groups)) as RecipientGroup[]
    next[gi].fields[fi].values = values
    setGroups(next)
    recompute(config, next)
  }

  const handleRecipEnabled = (gi: number, fi: number, enabled: boolean): void => {
    const next = JSON.parse(JSON.stringify(groups)) as RecipientGroup[]
    next[gi].fields[fi].enabled = enabled
    setGroups(next)
    recompute(config, next)
  }

  const handleReset = (): void => {
    setConfig(JSON.parse(JSON.stringify(origConfig)))
    setGroups(JSON.parse(JSON.stringify(origGroups)))
    setHasChanges(false)
  }

  // ── Simpan semua (config + recipient) dalam satu POST /api/config/bulk ──
  const handleSave = async (): Promise<void> => {
    try {
      setSaving(true)
      setError(null)

      const updates: Array<{
        id:                   string
        feature_key:          string
        nilai?:               string
        is_active?:           boolean
        tenant_can_override?: boolean
      }> = []

      // Config: value / is_active / tenant_can_override
      config.forEach((group, gi) => {
        group.items.forEach((item, ii) => {
          const orig = origConfig[gi]?.items[ii]
          if (!orig) return

          const valueChanged   = String(item.value) !== String(orig.value)
          const enabledChanged = item.enabled        !== orig.enabled
          const adminChanged   = item.adminCanChange !== orig.adminCanChange

          if (!valueChanged && !enabledChanged && !adminChanged) return

          const update: typeof updates[number] = {
            id:          item.id,
            feature_key: group.feature_key,
          }
          if (valueChanged)   update.nilai               = String(item.value)
          if (enabledChanged) update.is_active           = item.enabled
          if (adminChanged)   update.tenant_can_override = item.adminCanChange

          updates.push(update)
        })
      })

      // Recipient: nilai (join ',') / is_active
      groups.forEach((group, gi) => {
        group.fields.forEach((field, fi) => {
          const orig = origGroups[gi]?.fields[fi]
          if (!orig) return

          const valuesChanged  = JSON.stringify(field.values) !== JSON.stringify(orig.values)
          const enabledChanged = field.enabled !== orig.enabled

          if (!valuesChanged && !enabledChanged) return

          const update: typeof updates[number] = {
            id:          field.id,
            feature_key: field.feature_key,
          }
          if (valuesChanged)  update.nilai     = field.values.join(',')
          if (enabledChanged) update.is_active = field.enabled

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

      // Sinkron baseline setelah sukses
      setOrigConfig(JSON.parse(JSON.stringify(config)))
      setOrigGroups(JSON.parse(JSON.stringify(groups)))
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
      <div className="flex-1 px-8 pt-4 pb-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Kartu config: Monitoring + Alert (via ConfigItem) */}
          {config.map((group, gi) => (
            <Card
              key={group.feature_key + gi}
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
                {group.items.map((item, ii) => (
                  <div
                    key={item.id}
                    className={ii > 0 ? 'border-t border-slate-100' : ''}
                  >
                    <ConfigItem
                      item={item}
                      onValueChange={(value) => handleItemChange(gi, ii, { value })}
                      onUnitChange={(unit) => handleItemChange(gi, ii, { unit })}
                      onAdminCanChangeToggle={(adminCanChange) =>
                        handleItemChange(gi, ii, { adminCanChange })
                      }
                      onEnabledToggle={(enabled) => handleItemChange(gi, ii, { enabled })}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}

          {/* Kartu recipient: Penerima Alert + Penerima Laporan Harian (via AlertConfigItem) */}
          {groups.map((group, gi) => (
            <Card
              key={group.title}
              className="bg-white/80 backdrop-blur-sm border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all"
            >
              <CardHeader className="pt-2 pb-1 px-4 border-b border-slate-100">
                <CardTitle className={TYPOGRAPHY.cardTitle}>
                  {group.title}
                </CardTitle>
                <p className="text-[12px] text-slate-500 mt-1">{group.description}</p>
              </CardHeader>
              <CardContent className="pt-1 pb-2 px-4">
                {group.fields.map((field, fi) => (
                  <div
                    key={field.id}
                    className={fi > 0 ? 'border-t border-slate-100' : ''}
                  >
                    <AlertConfigItem
                      label={field.label}
                      values={field.values}
                      enabled={field.enabled}
                      placeholder={field.placeholder}
                      onChange={(values) => handleRecipValues(gi, fi, values)}
                      onEnabledToggle={(enabled) => handleRecipEnabled(gi, fi, enabled)}
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

      {/* SATU footer untuk seluruh halaman — sesuai mockup v2 */}
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
          className="text-xs bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 flex items-center gap-1.5"
        >
          {saving ? (
            <>
              <LoadingIcon size={13} className="animate-spin" />
              Menyimpan...
            </>
          ) : (
            'Simpan Perubahan'
          )}
        </Button>
      </div>
    </div>
  )
}
