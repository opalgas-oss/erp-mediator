'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfigItem } from '@/components/ConfigItem'

interface ConfigItemData {
  id: string
  label: string
  type: 'toggle' | 'number-unit' | 'select-only'
  value: number | boolean | string
  unit?: string
  units?: string[]
  options?: string[]
  option_group_id?: string | null
  adminCanChange: boolean
  enabled: boolean
}

interface ConfigGroup {
  title: string
  feature_key: string
  items: ConfigItemData[]
}

async function getPilihanOpsi(tenantId: string, optionGroupId: string): Promise<string[]> {
  const mockData: Record<string, string[]> = {
    satuan_waktu_short:    ['Detik', 'Menit'],
    satuan_waktu_medium:   ['Menit', 'Jam'],
    satuan_waktu_long:     ['Jam', 'Hari'],
    satuan_waktu_extended: ['Hari', 'Minggu', 'Bulan'],
  }
  return new Promise((resolve) =>
    setTimeout(() => resolve(mockData[optionGroupId] || []), 100)
  )
}

export default function LoginSettingsPage() {
  const [config, setConfig] = useState<ConfigGroup[]>([])
  const [originalConfig, setOriginalConfig] = useState<ConfigGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  const processConfig = async (raw: ConfigGroup[]): Promise<ConfigGroup[]> => {
    return Promise.all(
      raw.map(async (group) => ({
        ...group,
        items: await Promise.all(
          group.items.map(async (item) => {
            if (item.option_group_id && item.type === 'number-unit') {
              const units = await getPilihanOpsi('default-tenant', item.option_group_id)
              return { ...item, units }
            }
            return item
          })
        ),
      }))
    )
  }

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/config/login_config')
        if (!res.ok) throw new Error('Gagal memuat konfigurasi')
        const data = await res.json()
        if (!data.success) throw new Error('API error')
        const processed = await processConfig(data.data)
        setConfig(processed)
        setOriginalConfig(JSON.parse(JSON.stringify(processed)))
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
      } finally {
        setLoading(false)
      }
    }
    fetchConfig()
  }, [])

  const handleItemChange = (
    groupIndex: number,
    itemIndex: number,
    updates: Partial<ConfigItemData>
  ) => {
    const next = JSON.parse(JSON.stringify(config))
    next[groupIndex].items[itemIndex] = {
      ...next[groupIndex].items[itemIndex],
      ...updates,
    }
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
      const payload = {
        items: config.flatMap((group) =>
          group.items.map((item) => ({
            config_id: item.id,
            value: item.value,
            unit: item.unit ?? null,
            tenant_can_override: item.adminCanChange,
            enabled: item.enabled,
          }))
        ),
      }
      const res = await fetch('/api/config/login_config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Gagal menyimpan')
      const result = await res.json()
      if (!result.success) throw new Error('API error')
      setOriginalConfig(JSON.parse(JSON.stringify(config)))
      setHasChanges(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 p-4 sm:p-5 lg:p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Pengaturan Login</h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">Konfigurasi parameter keamanan dan autentikasi sistem login</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="border-slate-200 shadow-sm animate-pulse">
                <CardHeader className="pt-1 pb-1">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-5 w-12" />
                  </div>
                </CardHeader>
                <CardContent className="pt-1 pb-1 space-y-3">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="space-y-2 pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-4 w-36" />
                        <Skeleton className="h-6 w-24" />
                      </div>
                      <Skeleton className="h-3 w-28" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error && config.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-bold text-slate-900 mb-2">Terjadi Kesalahan</h2>
          <p className="text-slate-500 text-sm mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Muat Ulang</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 p-4 sm:p-5 lg:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Pengaturan Login</h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">Konfigurasi parameter keamanan dan autentikasi sistem login</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 mb-6">
          {config.map((group, groupIndex) => (
            <Card
              key={group.feature_key + groupIndex}
              className="bg-white/80 backdrop-blur-sm border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all"
            >
              <CardHeader className="pt-1 pb-1 px-4 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm sm:text-base text-slate-900">{group.title}</CardTitle>
                  <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-xs border-0">
                    {group.items.length} item
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-1 pb-1 px-4">
                {group.items.map((item, itemIndex) => (
                  <div key={item.id} className={itemIndex > 0 ? 'border-t border-slate-100' : ''}>
                    <ConfigItem
                      item={item}
                      onValueChange={(value) => handleItemChange(groupIndex, itemIndex, { value })}
                      onUnitChange={(unit) => handleItemChange(groupIndex, itemIndex, { unit })}
                      onAdminCanChangeToggle={(adminCanChange) => handleItemChange(groupIndex, itemIndex, { adminCanChange })}
                      onEnabledToggle={(enabled) => handleItemChange(groupIndex, itemIndex, { enabled })}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={!hasChanges || saving}
            className="text-xs sm:text-sm border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Reset ke Default
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="text-xs sm:text-sm bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
          >
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </Button>
        </div>
        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700 text-xs">{error}</p>
          </div>
        )}
      </div>
    </div>
  )
}
