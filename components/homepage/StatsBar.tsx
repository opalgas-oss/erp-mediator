// Komponen stats bar — KONDISIONAL, hanya render kalau config mengizinkan
// Server Component — tidak ada interaktivitas, gunakan async/await
import { getConfigValue } from '@/lib/config-registry'

export default async function StatsBar() {
  try {
    // Cek apakah stats bar diizinkan tampil
    // getConfigValue(configId, fieldKey) — configId = 'homepage', fieldKey = nama field
    const showStatsBar = await getConfigValue('homepage', 'show_stats_bar')
    if (!showStatsBar) return null

    // Baca nilai statistik dari config dengan fallback '0' kalau field tidak ada
    const mitraCount = await getConfigValue('homepage', 'stats_mitra_count').catch(() => '0') as string
    const kotaCount = await getConfigValue('homepage', 'stats_kota_count').catch(() => '0') as string
    const responsMenit = await getConfigValue('homepage', 'stats_respons_menit').catch(() => '0') as string

    // Data stats yang akan ditampilkan
    const stats = [
      { angka: `${mitraCount}+`, label: 'Mitra Aktif' },
      { angka: `${kotaCount}+`, label: 'Kota Terlayani' },
      { angka: `${responsMenit} mnt`, label: 'Rata-rata Respons' },
    ]

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
  } catch {
    // Kalau terjadi error apapun, jangan render apapun
    return null
  }
}
