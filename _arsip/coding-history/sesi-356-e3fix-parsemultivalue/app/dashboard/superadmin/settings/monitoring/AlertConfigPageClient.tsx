'use client'

// app/dashboard/superadmin/settings/monitoring/AlertConfigPageClient.tsx
// Client component untuk field penerima Alert (WA + Email) — multi-input UI.
// Dipakai oleh: monitoring/page.tsx (render khusus recipient policy_key)
//
// Pola simpan: array join(',') → kirim ke /api/config/bulk sebagai nilai string.
// DB tipe_data='multi_text' — hanya sebagai penanda UI, bukan schema constraint.
//
// Dibuat: Sesi #347 — FIX-B2-MULTI-RECIPIENT
// File terlindungi (TIDAK diubah): ConfigPageClient.tsx, ConfigItem.tsx, config-page.utils.ts

import { useState }       from 'react'
import { toast }          from 'sonner'
import { Button }         from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertConfigItem }  from './AlertConfigItem'
import { TYPOGRAPHY }     from '@/lib/constants/ui-tokens.constant'
import { ICON_STATUS }    from '@/lib/constants/icons.constant'

// Satu field penerima (WA atau Email)
interface RecipientField {
  id:          string   // uuid config_registry
  label:       string   // label tampil di UI
  fieldName:   string   // policy_key — dipakai sebagai key update ke bulk API
  feature_key: string   // dipakai untuk cache invalidation di bulk API
  values:      string[] // array penerima aktif
  enabled:     boolean  // is_active
  placeholder?: string  // hint di input tambah
}

interface AlertConfigPageClientProps {
  initialFields: RecipientField[]
}

// ─── Helper: parse comma-separated string ke array ───────────────────────────
export function parseMultiValue(nilai: string | null | undefined): string[] {
  if (!nilai) return []
  return nilai.split(',').map((s) => s.trim()).filter(Boolean)
}

// ─── Helper: deteksi ada perubahan dari state awal ───────────────────────────
function detectHasChanges(
  current:  RecipientField[],
  original: RecipientField[],
): boolean {
  return current.some((field, i) => {
    const orig = original[i]
    if (!orig) return false
    return (
      field.enabled !== orig.enabled ||
      JSON.stringify(field.values) !== JSON.stringify(orig.values)
    )
  })
}

export function AlertConfigPageClient({ initialFields }: AlertConfigPageClientProps) {
  const [fields, setFields]         = useState<RecipientField[]>(initialFields)
  const [origFields, setOrigFields] = useState<RecipientField[]>(
    JSON.parse(JSON.stringify(initialFields))
  )
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  const LoadingIcon = ICON_STATUS.loading

  // Update nilai array satu field
  const handleValuesChange = (index: number, values: string[]): void => {
    const next = JSON.parse(JSON.stringify(fields)) as RecipientField[]
    next[index].values = values
    setFields(next)
    setHasChanges(detectHasChanges(next, origFields))
  }

  // Toggle enabled satu field
  const handleEnabledToggle = (index: number, enabled: boolean): void => {
    const next = JSON.parse(JSON.stringify(fields)) as RecipientField[]
    next[index].enabled = enabled
    setFields(next)
    setHasChanges(detectHasChanges(next, origFields))
  }

  const handleReset = (): void => {
    setFields(JSON.parse(JSON.stringify(origFields)))
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
        is_active?:  boolean
      }> = []

      fields.forEach((field, i) => {
        const orig = origFields[i]
        if (!orig) return

        const valuesChanged  = JSON.stringify(field.values) !== JSON.stringify(orig.values)
        const enabledChanged = field.enabled !== orig.enabled

        if (!valuesChanged && !enabledChanged) return

        const update: typeof updates[number] = {
          id:          field.id,
          feature_key: field.feature_key,
        }

        if (valuesChanged) {
          // Simpan sebagai comma-separated string — konsisten dengan tipe_data='multi_text'
          update.nilai = field.values.join(',')
        }

        if (enabledChanged) {
          update.is_active = field.enabled
        }

        updates.push(update)
      })

      if (updates.length === 0) { setHasChanges(false); return }

      const res  = await fetch('/api/config/bulk', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ updates }),
      })
      const json = await res.json() as { success: boolean; message?: string }

      if (!json.success) {
        throw new Error(json.message ?? 'Gagal menyimpan konfigurasi penerima')
      }

      toast.success(`${updates.length} konfigurasi penerima berhasil disimpan`)

      // Sinkron baseline setelah save sukses
      setOrigFields(JSON.parse(JSON.stringify(fields)))
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
          <Card className="bg-white/80 backdrop-blur-sm border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all">
            <CardHeader className="pt-2 pb-1 px-4 border-b border-slate-100">
              <CardTitle className={TYPOGRAPHY.cardTitle}>
                Penerima Notifikasi Alert
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-1 pb-2 px-4">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className={index > 0 ? 'border-t border-slate-100' : ''}
                >
                  <AlertConfigItem
                    label={field.label}
                    values={field.values}
                    enabled={field.enabled}
                    placeholder={field.placeholder}
                    onChange={(values) => handleValuesChange(index, values)}
                    onEnabledToggle={(enabled) => handleEnabledToggle(index, enabled)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className={TYPOGRAPHY.error}>{error}</p>
          </div>
        )}
      </div>

      {/* Footer tombol aksi — sticky di bawah, pola identik ConfigPageClient */}
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
