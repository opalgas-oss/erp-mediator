'use client'
// app/dashboard/superadmin/providers/ProvidersClient.tsx
// Halaman API Provider — tabel full-width + tab + progress bar.
// Dibuat: Sesi #107 — Update: Sesi #151, S#218, S#247, S#249, S#288, S#297
//   S#218a: tombol + Tambah Provider + DialogTambahProvider
//   S#218b: fix auto-refresh (useEffect sync) + sort kolom via useSortableTable
//   S#247:  hapus blok h1+deskripsi duplikat
//   S#249:  HUTANG-PROVIDER-INACTIVE — toggle + dialog konfirmasi + fix Kategori 1 UI
//   S#288:  tambah kolom Use Case
//   S#297:  hapus kolom Prioritas + hapus tag belum_dibutuhkan

import { useState, useCallback, useEffect }   from 'react'
import { useRouter }                           from 'next/navigation'
import { toast }                               from 'sonner'
import { useSortableTable }                    from '@/lib/hooks/useSortableTable'
import { ProviderTableRow }                    from './ProviderTableRow'
import { DialogKonfigurasiKoneksi }            from './DialogKonfigurasiKoneksi'
import { DialogTambahProvider }                from './DialogTambahProvider'
import { ICON_STATUS }                         from '@/lib/constants/icons.constant'
import type { ServiceProvider }                from '@/lib/types/provider.types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

// ─── Konstanta ────────────────────────────────────────────────────────────────

const MONITOR_KAT = new Set(['management', 'queue'])

interface ColHeader {
  label:   string
  field:   keyof ServiceProvider | null
  noIcon?: boolean
  right?:  boolean
}

// S#297: hapus kolom Prioritas — 4 kolom: Provider, Status, Use Case, Aksi
const HEADERS: ColHeader[] = [
  { label: 'Provider',  field: 'nama' },
  { label: 'Status',    field: 'health_overall' },
  { label: 'Use Case',  field: null, noIcon: true },
  { label: 'Aksi',      field: null, noIcon: true, right: true },
]

// ─── Komponen ─────────────────────────────────────────────────────────────────

interface Props { initialProviders: ServiceProvider[] }

export function ProvidersClient({ initialProviders }: Props) {
  const router = useRouter()

  const [providers, setProviders] = useState<ServiceProvider[]>(initialProviders)
  useEffect(() => { setProviders(initialProviders) }, [initialProviders])

  const [activeTab, setTab]           = useState<'app' | 'monitor'>('app')
  const [dialogProv, setDP]           = useState<ServiceProvider | null>(null)
  const [showTambah, setShowTambah]   = useState(false)

  // S#249 — state toggle provider is_aktif
  const [toggleTarget, setToggleTarget] = useState<ServiceProvider | null>(null)
  const [toggling, setToggling]         = useState(false)

  const onTambahSuccess = useCallback(() => {
    setShowTambah(false)
    router.refresh()
  }, [router])

  // S#249 — hitung progress hanya dari provider AKTIF (nonaktif tidak relevan untuk setup progress)
  const aktifList    = providers.filter(p =>  p.is_aktif)
  const appList      = providers.filter(p => !MONITOR_KAT.has(p.kategori))
  const monitorList  = providers.filter(p =>  MONITOR_KAT.has(p.kategori))
  const configured   = aktifList.filter(p => p.health_overall !== 'belum_dites').length
  const wajibPending = aktifList.filter(p => p.tag === 'wajib' && p.health_overall === 'belum_dites').length
  const pct          = aktifList.length > 0 ? Math.round((configured / aktifList.length) * 100) : 0

  const baseList = activeTab === 'app' ? appList : monitorList

  const { sorted: list, handleSort, sortIcon, sortIconClass } = useSortableTable(
    baseList,
    'nama',
    'asc',
  )

  // S#249 — eksekusi toggle setelah konfirmasi dialog
  const eksekusiToggle = useCallback(async () => {
    if (!toggleTarget) return
    setToggling(true)
    try {
      const res = await fetch(`/api/superadmin/providers/${toggleTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_aktif: !toggleTarget.is_aktif }),
      }).then(r => r.json())

      if (!res.success) {
        toast.error(res.message ?? 'Gagal mengubah status provider')
      } else {
        toast.success(toggleTarget.is_aktif
          ? `${toggleTarget.nama} dinonaktifkan`
          : `${toggleTarget.nama} diaktifkan kembali`
        )
        router.refresh()
      }
    } catch {
      toast.error('Terjadi error jaringan')
    } finally {
      setToggling(false)
      setToggleTarget(null)
    }
  }, [toggleTarget, router])

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Tombol Tambah Provider */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={() => setShowTambah(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '0.5px solid rgba(0,0,0,0.25)', fontSize: 13, color: '#1a1a1a', background: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500, flexShrink: 0 }}
        >
          + Tambah Provider
        </button>
      </div>

      {/* Progress bar — hanya provider AKTIF */}
      <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.12)', borderRadius:10, padding:'14px 18px', display:'flex', alignItems:'center', gap:16 }}>
        <div style={{ width:40, height:40, borderRadius:'50%', background:'#EAF3DE', display:'flex', alignItems:'center', justifyContent:'center', color:'#3B6D11', flexShrink:0 }}>
          <ICON_STATUS.success size={20} />
        </div>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
            <span style={{ fontSize:13, fontWeight:500, color:'#1a1a1a' }}>Setup Progress Integrasi</span>
            <span style={{ fontSize:13, fontWeight:600, color:'#3B6D11' }}>{configured} / {aktifList.length} dikonfigurasi</span>
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
              style={{
                padding:'10px 18px', fontSize:13, cursor:'pointer',
                background:'transparent', border:'none', fontFamily:'inherit', whiteSpace:'nowrap',
                borderBottom: `2px solid ${activeTab === tab ? '#185FA5' : 'transparent'}`,
                color:        activeTab === tab ? '#185FA5' : '#6b7280',
                fontWeight:   activeTab === tab ? 500 : 400,
              }}
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

        {/* Table — S#297: 4 kolom (Provider, Status, Use Case, Aksi) */}
        <div style={{ background:'#fff', borderRadius:'0 0 12px 12px', border:'0.5px solid rgba(0,0,0,0.12)', borderTop:'none', overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', tableLayout:'fixed', fontSize:13 }}>
            <colgroup>
              <col style={{ width:'38%' }}/>
              <col style={{ width:'18%' }}/>
              <col style={{ width:'28%' }}/>
              <col style={{ width:'16%' }}/>
            </colgroup>
            <thead>
              <tr style={{ background:'#f9f9f8' }}>
                {HEADERS.map(h => (
                  <th
                    key={h.label}
                    onClick={() => h.field && handleSort(h.field)}
                    style={{
                      padding: '10px 14px', fontSize: 11, fontWeight: 500, color: '#6b7280',
                      textAlign: h.right ? 'right' : 'left',
                      cursor: h.field ? 'pointer' : 'default', userSelect: 'none', whiteSpace: 'nowrap',
                    }}
                  >
                    {h.label}
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
                <ProviderTableRow
                  key={p.id}
                  provider={p}
                  onOpen={setDP}
                  onToggle={setToggleTarget}
                  toggling={toggling && toggleTarget?.id === p.id}
                />
              ))}
            </tbody>
          </table>

          {/* Noted: status dikonfigurasi_manual — selalu tampil di tab Monitoring Platform */}
          {activeTab === 'monitor' && (
            <div style={{ padding: '8px 14px 10px', borderTop: '0.5px solid rgba(0,0,0,0.06)', background: '#F0F7FF' }}>
              <p style={{ fontSize: 11, color: '#1e40af', lineHeight: 1.6 }}>
                <span style={{ fontWeight: 600 }}>ⓘ Status &quot;Dikonfigurasi Manual (tanpa test)&quot;</span> — Provider ini tidak memerlukan testing koneksi karena cara kerjanya berbeda dari provider lain.
                Alih-alih kita yang menguji koneksi ke server mereka, justru provider inilah yang memantau sistem kita dari luar.
                Konfigurasi dilakukan cukup sekali melalui halaman <span style={{ fontWeight: 500 }}>Konfigurasi → Monitoring</span>, dan selanjutnya provider bekerja otomatis di background
                — mengirim notifikasi bila sistem kita tidak mengirimkan sinyal &quot;masih hidup&quot; dalam batas waktu yang ditentukan.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Dialog konfirmasi toggle is_aktif */}
      <Dialog open={!!toggleTarget} onOpenChange={o => !o && setToggleTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {toggleTarget?.is_aktif ? 'Nonaktifkan Provider?' : 'Aktifkan Kembali Provider?'}
            </DialogTitle>
            <DialogDescription>
              {toggleTarget?.is_aktif
                ? `Provider "${toggleTarget?.nama}" akan dinonaktifkan. Provider tidak akan dibaca sistem saat runtime, namun credential tetap tersimpan dan bisa diaktifkan kembali kapan saja.`
                : `Provider "${toggleTarget?.nama}" akan diaktifkan kembali. Sistem akan kembali menggunakan provider ini saat runtime.`
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToggleTarget(null)} disabled={toggling}>Batal</Button>
            <Button
              variant={toggleTarget?.is_aktif ? 'destructive' : 'default'}
              onClick={eksekusiToggle}
              disabled={toggling}
            >
              {toggling ? 'Memproses...' : (toggleTarget?.is_aktif ? 'Nonaktifkan' : 'Aktifkan Kembali')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
