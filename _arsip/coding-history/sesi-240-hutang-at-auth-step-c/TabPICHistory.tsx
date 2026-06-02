'use client'

// app/dashboard/superadmin/tenants/[id]/TabPICHistory.tsx
// Tab PIC & Riwayat — 2 kartu PIC aktif + tombol aksi cadangan + timeline
//
// Dibuat: Sesi #132 — M6 FASE 3 Step 3.7
// Diupdate: Sesi #141 — style konsistensi mockup
// Diupdate: Sesi #147 — HUTANG-02: tombol Tambah/Edit/Hapus PIC cadangan + dialog

import { useState, useEffect, useCallback } from 'react'
import { toast }                             from 'sonner'
import type { TenantPICTabData, PICTimelineEntry } from '@/lib/types/tenant-pic.types'
import { S, PICCard, PICTabSkeleton }        from './TabPICHistory.subcomponents'
import { DialogTambahPICCadangan }  from './DialogTambahPICCadangan'
import { DialogHapusPICCadangan }   from './DialogHapusPICCadangan'

interface Props { tenantId: string }

// Label tampilan untuk tipe_event di timeline
const TIPE_EVENT_LABEL: Record<PICTimelineEntry['tipe_event'], string> = {
  awal:              'awal',
  pergantian:        'pergantian',
  resign:            'resign',
  cadangan_ditambah: 'ditambah',
  cadangan_dihapus:  'dihapus',
}

// ─── Mode dialog ──────────────────────────────────────────────────────────────

type DialogMode = 'tambah' | 'edit' | 'hapus' | null

// ─── Komponen utama ───────────────────────────────────────────────────────────

export function TabPICHistory({ tenantId }: Props) {
  const [data,       setData]       = useState<TenantPICTabData | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [dialogMode, setDialogMode] = useState<DialogMode>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch(`/api/superadmin/tenants/${tenantId}/change-pic`)
      const json = await res.json()
      if (json.success) setData(json.data)
    } catch {
      toast.error('Gagal memuat data PIC')
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) return <PICTabSkeleton />

  if (!data) return (
    <div style={{ ...S.card, padding: 24, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
      Gagal memuat data PIC.
    </div>
  )

  return (
    <div>

      {/* Warning bar — jika tidak ada PIC cadangan */}
      {data.ada_peringatan && (
        <div style={{
          background: '#FAEEDA',
          borderWidth: '0.5px', borderStyle: 'solid', borderColor: '#EF9F27',
          borderRadius: 8, padding: '8px 14px', fontSize: 12, color: '#854F0B',
          marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <i className="ti ti-alert-triangle" />
          Tenant ini tidak memiliki PIC cadangan. Disarankan menambah backup PIC untuk kelangsungan operasional.
        </div>
      )}

      {/* Kartu PIC — 2 kolom */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: '1rem' }}>

        {/* PIC Utama — read-only */}
        <PICCard
          title="PIC Utama"
          iconColor="#185FA5"
          iconBg="#E6F1FB"
          pic={data.pic_utama}
          emptyMessage="Belum ada PIC utama"
        />

        {/* PIC Cadangan — dengan tombol aksi */}
        <PICCard
          title="PIC Cadangan"
          iconColor="#534AB7"
          iconBg="#EEEDFE"
          pic={data.pic_cadangan}
          emptyMessage="Disarankan menambah PIC cadangan"
          warning={!data.pic_cadangan}
          onTambah={!data.pic_cadangan ? () => setDialogMode('tambah') : undefined}
          onEdit={data.pic_cadangan    ? () => setDialogMode('edit')   : undefined}
          onHapus={data.pic_cadangan   ? () => setDialogMode('hapus')  : undefined}
        />
      </div>

      {/* Timeline pergantian */}
      <div style={{ ...S.card, overflow: 'hidden' }}>
        <div style={{
          padding: '12px 16px', background: '#f9f9f8',
          borderBottomWidth: '0.5px', borderBottomStyle: 'solid', borderBottomColor: 'rgba(0,0,0,0.12)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: '#F1EFE8', color: '#5F5E5A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
            <i className="ti ti-history" />
          </div>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>Riwayat pergantian PIC</div>
          <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 'auto' }}>{data.timeline.length} entri</span>
        </div>

        {data.timeline.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <i className="ti ti-history" style={{ fontSize: 28, color: '#9ca3af', display: 'block', marginBottom: 8 }} />
            <div style={{ fontSize: 13, color: '#6b7280' }}>Belum ada riwayat pergantian PIC.</div>
          </div>
        ) : (
          <div style={{ padding: '8px 16px 16px' }}>
            {data.timeline.map((entry, idx) => (
              <div key={entry.id} style={{ display: 'flex', gap: 12, padding: '12px 0' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 16, flexShrink: 0 }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: '#97C459', borderWidth: '0.5px', borderStyle: 'solid', borderColor: '#3B6D11',
                    marginTop: 4, zIndex: 1,
                  }} />
                  {idx < data.timeline.length - 1 && (
                    <div style={{ width: 1, background: 'rgba(0,0,0,0.12)', flex: 1, marginTop: 4 }} />
                  )}
                </div>
                <div style={{ flex: 1, paddingBottom: 4 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a', marginBottom: 3 }}>{entry.nama_pic}</div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>
                    {entry.tipe_pic} · {TIPE_EVENT_LABEL[entry.tipe_event] ?? entry.tipe_event}
                    {entry.alasan ? ` · ${entry.alasan}` : ''}
                  </div>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>
                    {new Date(entry.started_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {entry.ended_at && ` – ${new Date(entry.ended_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialog Tambah / Edit PIC Cadangan */}
      <DialogTambahPICCadangan
        tenantId={tenantId}
        open={dialogMode === 'tambah' || dialogMode === 'edit'}
        mode={dialogMode === 'edit' ? 'edit' : 'tambah'}
        existing={data.pic_cadangan}
        onClose={() => setDialogMode(null)}
        onSuccess={fetchData}
      />

      {/* Dialog Hapus PIC Cadangan */}
      <DialogHapusPICCadangan
        tenantId={tenantId}
        open={dialogMode === 'hapus'}
        existing={data.pic_cadangan}
        onClose={() => setDialogMode(null)}
        onSuccess={fetchData}
      />
    </div>
  )
}
