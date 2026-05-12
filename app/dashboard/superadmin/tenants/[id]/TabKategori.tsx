'use client'

// app/dashboard/superadmin/tenants/[id]/TabKategori.tsx
// Tab Kategori — summary + list assignment kategori tenant
// Referensi: PAGE_SPEC_SUPERADMIN_v2 BAB 8.2.3
//
// Dibuat: Sesi #132 — M6 FASE 3 Step 3.7

import { useState, useEffect } from 'react'
import { toast }               from 'sonner'
import { Badge }               from '@/components/ui/badge'
import { Button }              from '@/components/ui/button'
import { Skeleton }            from '@/components/ui/skeleton'
import type { AssignmentTabData, AssignmentDenganKategori } from '@/lib/types/tenant-category-assignment.types'

interface Props { tenantId: string }

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  active:          'default',
  suspended:       'outline',
  pending_handover: 'secondary',
}

const STATUS_LABEL: Record<string, string> = {
  active:          'Aktif',
  suspended:       'Ditangguhkan',
  pending_handover: 'Proses Serah Terima',
}

export function TabKategori({ tenantId }: Props) {
  const [data,    setData]    = useState<AssignmentTabData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res  = await fetch(`/api/superadmin/tenants/${tenantId}/categories`)
      const json = await res.json()
      if (json.success) setData(json.data)
    } catch {
      toast.error('Gagal memuat data kategori')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [tenantId])

  if (loading) return (
    <div className="space-y-2 max-w-3xl">
      {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
    </div>
  )

  if (!data) return (
    <p className="text-sm text-muted-foreground">Gagal memuat data kategori.</p>
  )

  return (
    <div className="space-y-4 max-w-3xl">

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-md border p-3">
          <div className="text-2xl font-semibold">{data.summary.total_aktif}</div>
          <div className="text-xs text-muted-foreground">Kategori Aktif</div>
        </div>
        <div className="rounded-md border p-3">
          <div className="text-2xl font-semibold">{data.summary.total_override_komisi}</div>
          <div className="text-xs text-muted-foreground">Override Komisi</div>
        </div>
        <div className="rounded-md border p-3">
          <div className="text-sm font-medium">{data.summary.coverage_summary}</div>
          <div className="text-xs text-muted-foreground">Coverage</div>
        </div>
      </div>

      {/* List assignment */}
      <div className="rounded-md border overflow-hidden">
        <div className="px-4 py-2.5 bg-muted/50 text-xs font-medium text-muted-foreground flex justify-between">
          <span>Daftar Kategori ({data.assignments.length})</span>
          <Button variant="outline" size="sm" className="h-6 text-xs" onClick={fetchData}>
            Refresh
          </Button>
        </div>

        {data.assignments.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Belum ada kategori yang ditugaskan ke tenant ini.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-t">
              <tr className="bg-muted/30">
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Kategori</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Komisi</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Sejak</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.assignments.map((a: AssignmentDenganKategori) => (
                <tr key={a.id} className="hover:bg-muted/20">
                  <td className="px-4 py-2.5">
                    <div className="font-medium">{a.kategori.display_name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{a.kategori.slug}</div>
                  </td>
                  <td className="px-4 py-2.5 text-sm">{a.tampil_komisi}</td>
                  <td className="px-4 py-2.5">
                    <Badge variant={STATUS_VARIANT[a.status] ?? 'secondary'}>
                      {STATUS_LABEL[a.status] ?? a.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {new Date(a.assigned_at).toLocaleDateString('id-ID')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
