'use client'

// components/homepage/StatsBar.tsx
// Komponen stats bar — Client Component
// PERUBAHAN: tidak lagi import langsung dari lib/config-registry (server-only)
// Sekarang fetch via API route /api/config/homepage

import { useState, useEffect } from 'react'

interface StatItem {
  angka: string
  label: string
}

export default function StatsBar() {
  const [stats, setStats] = useState<StatItem[] | null>(null)

  useEffect(() => {
    async function muatStats() {
      try {
        const res  = await fetch('/api/config/homepage')
        const data = await res.json()

        if (!data.success) return

        const items = (data.data ?? [])
          .flatMap((g: { items: { label: string; nilai: string }[] }) => g.items)

        const get = (label: string): string =>
          items.find((i: { label: string }) => i.label === label)?.nilai ?? ''

        const showStatsBar = get('show_stats_bar')
        if (showStatsBar === 'false') return

        const mitraCount   = get('stats_mitra_count')  || '100'
        const kotaCount    = get('stats_kota_count')   || '10'
        const responsMenit = get('stats_respons_menit')|| '30'

        setStats([
          { angka: `${mitraCount}+`,      label: 'Mitra Aktif' },
          { angka: `${kotaCount}+`,       label: 'Kota Terlayani' },
          { angka: `${responsMenit} mnt`, label: 'Rata-rata Respons' },
        ])
      } catch {
        // Gagal fetch config → komponen tidak tampil
      }
    }

    muatStats()
  }, [])

  if (!stats) return null

  return (
    <div className="border-y" style={{ backgroundColor: '#f5f9ff' }}>
      <div className="flex justify-center gap-12 py-3">
        {stats.map((item) => (
          <div key={item.label} className="text-center">
            <p className="text-base font-bold">{item.angka}</p>
            <p className="text-xs text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}