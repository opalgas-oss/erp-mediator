'use client'

// Komponen stats bar — Client Component
// Logika fetch config dijalankan di browser via useEffect, bukan saat build
// Default state: null (tidak tampil) sampai config berhasil dibaca
import { useState, useEffect } from 'react'
import { getConfigValue } from '@/lib/config-registry'

interface StatItem {
  angka: string
  label: string
}

export default function StatsBar() {
  // null = belum ada data atau config tidak mengizinkan → tidak render apapun
  const [stats, setStats] = useState<StatItem[] | null>(null)

  useEffect(() => {
    async function muatStats() {
      try {
        // Cek apakah stats bar diizinkan tampil
        const showStatsBar = await getConfigValue('homepage', 'show_stats_bar')
        if (!showStatsBar) return

        // Baca nilai statistik — kalau salah satu gagal, lempar ke catch → tetap null
        const mitraCount   = await getConfigValue('homepage', 'stats_mitra_count') as string
        const kotaCount    = await getConfigValue('homepage', 'stats_kota_count') as string
        const responsMenit = await getConfigValue('homepage', 'stats_respons_menit') as string

        setStats([
          { angka: `${mitraCount}+`,    label: 'Mitra Aktif' },
          { angka: `${kotaCount}+`,     label: 'Kota Terlayani' },
          { angka: `${responsMenit} mnt`, label: 'Rata-rata Respons' },
        ])
      } catch {
        // Gagal fetch config → state tetap null → komponen tidak tampil
      }
    }

    muatStats()
  }, []) // hanya jalan sekali saat komponen mount

  // Selama config belum dimuat atau tidak diizinkan → tidak render apapun
  if (!stats) return null

  return (
    <div
      className="border-y"
      style={{ backgroundColor: '#f5f9ff' }}
    >
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
