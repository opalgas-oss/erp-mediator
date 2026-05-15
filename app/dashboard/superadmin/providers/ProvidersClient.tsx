'use client'
// app/dashboard/superadmin/providers/ProvidersClient.tsx
// Halaman API Provider — tabel full-width + tab + progress bar (Screenshot 1 Philips S#151).
// Dipecah: ProviderTableRow.tsx + DialogKonfigurasi.fields.tsx
// Dibuat: Sesi #107 — Update: Sesi #151

import { useState }                     from 'react'
import { ProviderTableRow }              from './ProviderTableRow'
import { DialogKonfigurasiKoneksi }      from './DialogKonfigurasiKoneksi'
import { ICON_STATUS }                   from '@/lib/constants/icons.constant'
import type { ServiceProvider }          from '@/lib/types/provider.types'

const MONITOR_KAT = new Set(['management', 'queue'])

interface Props { initialProviders: ServiceProvider[] }

export function ProvidersClient({ initialProviders }: Props) {
  const [providers]          = useState<ServiceProvider[]>(initialProviders)
  const [activeTab, setTab]  = useState<'app' | 'monitor'>('app')
  const [dialogProv, setDP]  = useState<ServiceProvider | null>(null)

  const appList     = providers.filter(p => !MONITOR_KAT.has(p.kategori))
  const monitorList = providers.filter(p =>  MONITOR_KAT.has(p.kategori))
  const configured  = providers.filter(p => p.health_overall !== 'belum_dites').length
  const wajibPending = providers.filter(p => p.tag === 'wajib' && p.health_overall === 'belum_dites').length
  const pct         = Math.round((configured / providers.length) * 100)
  const list        = activeTab === 'app' ? appList : monitorList

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Header */}
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: '#1a1a1a' }}>API Provider & Credential</h1>
        <p style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
          Kelola koneksi semua tools — operasional aplikasi dan monitoring otomatis
        </p>
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
                {['Provider','Kategori','Status','Instance','Terakhir Dites','Aksi'].map((h,i) => (
                  <th key={h} style={{ padding:'10px 14px', fontSize:11, fontWeight:500, color:'#6b7280', textAlign:i===5?'right':'left' }}>{h}</th>
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
    </div>
  )
}
