'use client'
// ARSIP S#218 step 2 — ProvidersClient.tsx POST tambah-provider fix (sebelum sort fix)
// Versi ini: tombol + Tambah Provider sudah ada, tapi useState tidak sync + belum ada sort

import { useState, useCallback }             from 'react'
import { useRouter }                         from 'next/navigation'
import { ProviderTableRow }              from './ProviderTableRow'
import { DialogKonfigurasiKoneksi }      from './DialogKonfigurasiKoneksi'
import { DialogTambahProvider }          from './DialogTambahProvider'
import { ICON_STATUS }                   from '@/lib/constants/icons.constant'
import type { ServiceProvider }          from '@/lib/types/provider.types'

const MONITOR_KAT = new Set(['management', 'queue'])
interface Props { initialProviders: ServiceProvider[] }

export function ProvidersClient({ initialProviders }: Props) {
  const router                              = useRouter()
  const [providers]          = useState<ServiceProvider[]>(initialProviders)  // BUG: tidak sync
  const [activeTab, setTab]  = useState<'app' | 'monitor'>('app')
  const [dialogProv, setDP]  = useState<ServiceProvider | null>(null)
  const [showTambah, setShowTambah] = useState(false)

  const onTambahSuccess = useCallback(() => {
    setShowTambah(false)
    router.refresh()
  }, [router])

  const appList     = providers.filter(p => !MONITOR_KAT.has(p.kategori))
  const monitorList = providers.filter(p =>  MONITOR_KAT.has(p.kategori))
  const configured  = providers.filter(p => p.health_overall !== 'belum_dites').length
  const wajibPending = providers.filter(p => p.tag === 'wajib' && p.health_overall === 'belum_dites').length
  const pct         = Math.round((configured / providers.length) * 100)
  const list        = activeTab === 'app' ? appList : monitorList
  return (<div />)  // truncated for archive
}
