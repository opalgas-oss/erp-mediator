'use client'

// app/dashboard/superadmin/tenants/[id]/TabPICHistory.tsx
// Tab PIC & Riwayat — 2 kartu PIC aktif + timeline pergantian
// Referensi: PAGE_SPEC_SUPERADMIN_v2 BAB 8.2.4
//
// Dibuat: Sesi #132 — M6 FASE 3 Step 3.7

import { useState, useEffect } from 'react'
import { toast }               from 'sonner'
import { Badge }               from '@/components/ui/badge'
import { Skeleton }            from '@/components/ui/skeleton'
import type { TenantPICTabData } from '@/lib/types/tenant-pic.types'

interface Props { tenantId: string }

export function TabPICHistory({ tenantId }: Props) {
  const [data,    setData]    = useState<TenantPICTabData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch_ = async () => {
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
    }
    fetch_()
  }, [tenantId])

  if (loading) return (
    <div className="space-y-3 max-w-3xl">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  )

  if (!data) return <p className="text-sm text-muted-foreground">Gagal memuat data PIC.</p>

  return (
    <div className="space-y-4 max-w-3xl">

      {/* Kartu PIC */}
      <div className="grid grid-cols-2 gap-3">
        {/* PIC Utama */}
        <div className="rounded-md border p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase">PIC Utama</span>
            {data.pic_utama ? (
              <Badge variant="default">Aktif</Badge>
            ) : (
              <Badge variant="outline">Kosong</Badge>
            )}
          </div>
          {data.pic_utama ? (
            <div className="space-y-1">
              <div className="font-medium">{data.pic_utama.user_name}</div>
              <div className="text-xs text-muted-foreground">{data.pic_utama.user_email}</div>
              <div className="text-xs text-muted-foreground">{data.pic_utama.user_wa}</div>
              {data.pic_utama.jabatan && (
                <div className="text-xs text-muted-foreground">{data.pic_utama.jabatan}</div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">Belum ada PIC utama</p>
          )}
        </div>

        {/* PIC Cadangan */}
        <div className={`rounded-md border p-4 space-y-2 ${data.ada_peringatan ? 'border-amber-300 bg-amber-50' : ''}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase">PIC Cadangan</span>
            {data.pic_cadangan ? (
              <Badge variant="secondary">Aktif</Badge>
            ) : (
              <Badge variant="outline" className="border-amber-400 text-amber-700">Tidak ada</Badge>
            )}
          </div>
          {data.pic_cadangan ? (
            <div className="space-y-1">
              <div className="font-medium">{data.pic_cadangan.user_name}</div>
              <div className="text-xs text-muted-foreground">{data.pic_cadangan.user_email}</div>
              <div className="text-xs text-muted-foreground">{data.pic_cadangan.user_wa}</div>
            </div>
          ) : (
            <p className="text-sm text-amber-700 italic">Disarankan menambah PIC cadangan</p>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="rounded-md border">
        <div className="px-4 py-2.5 bg-muted/50 text-xs font-medium text-muted-foreground">
          Riwayat Pergantian PIC ({data.timeline.length} entri)
        </div>
        {data.timeline.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            Belum ada riwayat pergantian PIC.
          </div>
        ) : (
          <div className="divide-y">
            {data.timeline.map(entry => (
              <div key={entry.id} className="px-4 py-3 flex gap-3">
                <div className="w-2 h-2 rounded-full bg-muted-foreground mt-1.5 shrink-0" />
                <div className="space-y-0.5 min-w-0">
                  <div className="text-sm font-medium">{entry.nama_pic}</div>
                  <div className="text-xs text-muted-foreground">
                    {entry.tipe_pic} · {entry.tipe_event}
                    {entry.alasan && ` · ${entry.alasan}`}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(entry.started_at).toLocaleDateString('id-ID')}
                    {entry.ended_at && ` – ${new Date(entry.ended_at).toLocaleDateString('id-ID')}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
