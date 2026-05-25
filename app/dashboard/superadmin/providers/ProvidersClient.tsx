'use client'
// app/dashboard/superadmin/providers/ProvidersClient.tsx
// Halaman API Provider — tabel full-width + tab + progress bar.
// Dibuat: Sesi #107 — Update: Sesi #151, S#218
//   S#218a: tombol + Tambah Provider + DialogTambahProvider
//   S#218b: fix auto-refresh (useEffect sync initialProviders) + sort per kolom

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useRouter }                                  from 'next/navigation'
import { ProviderTableRow }                           from './ProviderTableRow'
import { DialogKonfigurasiKoneksi }                   from './DialogKonfigurasiKoneksi'
import { DialogTambahProvider }                       from './DialogTambahProvider'
import { ICON_STATUS }                                from '@/lib/constants/icons.constant'
import type { ServiceProvider }                       from '@/lib/types/provider.types'

// ─── Konstanta ────────────────────────────────────────────────────────────────

const MONITOR_KAT = new Set(['management', 'queue'])

type SortKey = 'nama' | 'kategori' | 'health_overall' | 'tag'
type SortDir = 'asc' | 'desc'

// Urutan sort: angka kecil = tampil atas saat asc
const HEALTH_ORDER: Record<string, number> = { gagal: 0, peringatan: 1, belum_dites: 2, sehat: 3 }
const TAG_ORDER:    Record<string, number> = { wajib: 0, disarankan: 1, opsional: 2 }

interface ColHeader { label: string; key: SortKey | null; right?: boolean }
const HEADERS: ColHeader[] = [
  { label: 'Provider',       key: 'nama' },
  { label: 'Kategori',       key: 'kategori' },
  { label: 'Status',         key: 'health_overall' },
  { label: 'Instance',       key: null },
  { label: 'Terakhir Dites', key: null },
  { label: 'Aksi',           key: null, right: true },
]

// ─── Komponen ─────────────────────────────────────────────────────────────────

interface Props { initialProviders: ServiceProvider[] }

export function ProvidersClient({ initialProviders }: Props) {
  const router = useRouter()

  // FIX S#218b — sync agar router.refresh() update tampilan tanpa full reload
  // useState(initialProviders) hanya init sekali saat mount — useEffect sync ketika prop berubah
  const [providers, setProviders] = useState<ServiceProvider[]>(initialProviders)
  useEffect(() => { setProviders(initialProviders) }, [initialProviders])

  const [activeTab, setTab]         = useState<'app' | 'monitor'>('app')
  const [dialogProv, setDP]         = useState<ServiceProvider | null>(null)
  const [showTambah, setShowTambah] = useState(false)

  // Sort state — default: nama asc
  const [sortKey, setSortKey] = useState<SortKey>('nama')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const toggleSort = useCallback((key: SortKey) => {
    setSortKey(prev => {
      if (prev === key) {
        setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        return key
      }
      setSortDir('asc')
      return key
    })
  }, [])

  const onTambahSuccess = useCallback(() => {
    setShowTambah(false)
    router.refresh()
  }, [router])

  // Derived lists
  const appList      = providers.filter(p => !MONITOR_KAT.has(p.kategori))
  const monitorList  = providers.filter(p =>  MONITOR_KAT.has(p.kategori))
  const configured   = providers.filter(p => p.health_overall !== 'belum_dites').length
  const wajibPending = providers.filter(p => p.tag === 'wajib' && p.health_overall === 'belum_dites').length
  const pct          = Math.round((configured / providers.length) * 100)

  const baseList = activeTab === 'app' ? appList : monitorList

  // Sort memoized — hanya recompute ketika baseList / sortKey / sortDir berubah
  const list = useMemo(() => {
    return [...baseList].sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'nama':          cmp = a.nama.localeCompare(b.nama, 'id'); break
        case 'kategori':      cmp = a.kategori.localeCompare(b.kategori, 'id'); break
        case 'health_overall': cmp = (HEALTH_ORDER[a.health_overall] ?? 99) - (HEALTH_ORDER[b.health_overall] ?? 99); break
        case 'tag':           cmp = (TAG_ORDER[a.tag] ?? 99) - (TAG_ORDER[b.tag] ?? 99); break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [baseList, sortKey, sortDir])

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: '#1a1a1a' }}>API Provider & Credential</h1>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
            Kelola koneksi semua tools — operasional aplikasi dan monitoring otomatis
          </p>
        </div>
        <button
          onClick={() => setShowTambah(true)}
          style={{ marginTop: 2, display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '0.5px solid rgba(0,0,0,0.25)', fontSize: 13, color: '#1a1a1a', background: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500, flexShrink: 0 }}
        >
          + Tambah Provider
        </button>
      </div>

      {/* Progress bar */}
      <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.12)', borderRadius:10, padding:'14px 18px', display:'flex', alignItems:'center', gap:16 }}>
        <div style={{ width:40, height:40, borderRadius:'50%', background:'#EAF3DE', display:'flex', alignItems:'center', justifyContent:'center', color:'#3B6D11', flexShrink:0 }}>
          <ICON_STATUS.success size={20} />
        </div>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
            <span style={{ fontSize:13, fontWeight:500, color:'#1a1a1a' }}>Setup Progress Integrasi</span>
            <span style={{ fontSize:13, fontWeight:600, color:'#3B6D11' }}>{configured} / {providers.length} dikonfigurasi</span>
          </div>
          <div style={{ background:'#f3f4f6', borderRadius:100, height:8, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${pct}%`, background:'#3B6D11', borderRadius:100, transition:'width .3s' }} />
          </div>
          {wajibPending > 0 && (
            <p style={{ fontSize:11, color:'#6b7280', marginTop:4 }}>
              {wajibPending} provider WAJIB belum dikonfigurasi — aplikasi tidak akan berjalan sempurna
            </p>
          )}
        </div>
      </div>

      {/* Tabs + Table */}
      <div>
        {/* Tab bar */}
        <div style={{ background:'#fff', borderRadius:'12px 12px 0 0', border:'0.5px solid rgba(0,0,0,0.12)', borderBottom:'none', display:'flex' }}>
          {([['app','Koneksi Aplikasi',appList.length,false],['monitor','Monitoring Platform',monitorList.length,true]] as const).map(([tab, label, count, isMon]) => (
            <button key={tab} onClick={() => setTab(tab as 'app'|'monitor')}
              style={{ padding:'10px 18px', fontSize:13, cursor:'pointer', background:'transparent', border:'none', borderBottom:`2px solid ${activeTab===tab?'#1a1a1a':'transparent'}`, color:activeTab===tab?'#1a1a1a':'#6b7280', fontWeight:activeTab===tab?500:400, fontFamily:'inherit', whiteSpace:'nowrap' }}
            >
              {label}
              <span style={{ marginLeft:6, fontSize:10, padding:'1px 7px', borderRadius:100, background:isMon&&count?'#E6F1FB':'#f3f4f6', color:isMon&&count?'#185FA5':'#6b7280' }}>
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* Monitoring info strip */}
        {activeTab === 'monitor' && (
          <div style={{ background:'#E6F1FB', border:'0.5px solid rgba(0,0,0,0.12)', borderTop:0, padding:'8px 14px', fontSize:11, color:'#185FA5' }}>
            Credential ini dipakai sistem monitoring otomatis setiap 1–15 menit — konfigurasi sekali, sistem bekerja di background.
          </div>
        )}

        {/* Table */}
        <div style={{ background:'#fff', borderRadius:'0 0 12px 12px', border:'0.5px solid rgba(0,0,0,0.12)', borderTop:'none', overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', tableLayout:'fixed', fontSize:13 }}>
            <colgroup>
              <col style={{ width:'28%' }}/><col style={{ width:'14%' }}/>
              <col style={{ width:'16%' }}/><col style={{ width:'13%' }}/>
              <col style={{ width:'15%' }}/><col style={{ width:'14%' }}/>
            </colgroup>
            <thead>
              <tr style={{ background:'#f9f9f8' }}>
                {HEADERS.map(h => (
                  <th
                    key={h.label}
                    onClick={() => h.key && toggleSort(h.key)}
                    style={{
                      padding: '10px 14px', fontSize: 11, fontWeight: 500,
                      color: h.key && sortKey === h.key ? '#1a1a1a' : '#6b7280',
                      textAlign: h.right ? 'right' : 'left',
                      cursor: h.key ? 'pointer' : 'default',
                      userSelect: 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h.label}
                    {h.key && (
                      <span style={{ marginLeft: 4, fontSize: 9, opacity: sortKey === h.key ? 1 : 0.25 }}>
                        {sortKey === h.key && sortDir === 'desc' ? '▼' : '▲'}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map(p => (
                <ProviderTableRow key={p.id} provider={p} onOpen={setDP} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <DialogKonfigurasiKoneksi
        open={!!dialogProv}
        provider={dialogProv}
        onClose={() => setDP(null)}
        onSuccess={() => setDP(null)}
      />

      <DialogTambahProvider
        open={showTambah}
        onClose={() => setShowTambah(false)}
        onSuccess={onTambahSuccess}
      />
    </div>
  )
}
