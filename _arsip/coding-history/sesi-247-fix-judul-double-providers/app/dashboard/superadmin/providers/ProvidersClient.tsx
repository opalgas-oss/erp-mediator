'use client'
// app/dashboard/superadmin/providers/ProvidersClient.tsx
// Halaman API Provider — tabel full-width + tab + progress bar.
// Dibuat: Sesi #107 — Update: Sesi #151, S#218
//   S#218a: tombol + Tambah Provider + DialogTambahProvider
//   S#218b: fix auto-refresh (useEffect sync) + sort kolom via useSortableTable (konsisten MessageLibrary)

import { useState, useCallback, useEffect }   from 'react'
import { useRouter }                           from 'next/navigation'
import { useSortableTable }                    from '@/lib/hooks/useSortableTable'
import { ProviderTableRow }                    from './ProviderTableRow'
import { DialogKonfigurasiKoneksi }            from './DialogKonfigurasiKoneksi'
import { DialogTambahProvider }                from './DialogTambahProvider'
import { ICON_STATUS }                         from '@/lib/constants/icons.constant'
import type { ServiceProvider }                from '@/lib/types/provider.types'

// ─── Konstanta ────────────────────────────────────────────────────────────────

const MONITOR_KAT = new Set(['management', 'queue'])

// Kolom header — field null = tampilkan icon ⇅ (visual only, tidak clickable)
// Aksi: noIcon = true, tidak perlu sort indicator sama sekali
interface ColHeader {
  label:   string
  field:   keyof ServiceProvider | null
  noIcon?: boolean
  right?:  boolean
}

const HEADERS: ColHeader[] = [
  { label: 'Provider',       field: 'nama' },
  { label: 'Kategori',       field: 'kategori' },
  { label: 'Status',         field: 'health_overall' },
  { label: 'Instance',       field: null },
  { label: 'Terakhir Dites', field: null },
  { label: 'Aksi',           field: null, noIcon: true, right: true },
]

// ─── Komponen ─────────────────────────────────────────────────────────────────

interface Props { initialProviders: ServiceProvider[] }

export function ProvidersClient({ initialProviders }: Props) {
  const router = useRouter()

  // FIX S#218b — sync agar router.refresh() update tampilan tanpa full reload
  const [providers, setProviders] = useState<ServiceProvider[]>(initialProviders)
  useEffect(() => { setProviders(initialProviders) }, [initialProviders])

  const [activeTab, setTab]         = useState<'app' | 'monitor'>('app')
  const [dialogProv, setDP]         = useState<ServiceProvider | null>(null)
  const [showTambah, setShowTambah] = useState(false)

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

  // Sort via useSortableTable — sama persis dengan MessageLibraryClient
  const { sorted: list, handleSort, sortIcon, sortIconClass } = useSortableTable(
    baseList,
    'nama',
    'asc',
  )

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
                    onClick={() => h.field && handleSort(h.field)}
                    style={{
                      padding: '10px 14px',
                      fontSize: 11,
                      fontWeight: 500,
                      color: '#6b7280',
                      textAlign: h.right ? 'right' : 'left',
                      cursor: h.field ? 'pointer' : 'default',
                      userSelect: 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h.label}
                    {/* Icon sort — ⇅/↑/↓ konsisten dengan MessageLibraryClient */}
                    {!h.noIcon && (
                      h.field
                        ? <span className={sortIconClass(h.field)}>{sortIcon(h.field)}</span>
                        : <span className="ml-1 text-slate-400 select-none">⇅</span>
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
        onSuccess={() => { setDP(null); router.refresh() }}
      />

      <DialogTambahProvider
        open={showTambah}
        onClose={() => setShowTambah(false)}
        onSuccess={onTambahSuccess}
      />
    </div>
  )
}
