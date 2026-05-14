'use client'
// ARSIP: TabKategori.tsx kondisi pre-S#141 Fase C
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { AssignmentTabData, AssignmentDenganKategori } from '@/lib/types/tenant-category-assignment.types'
interface Props { tenantId: string }
const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = { active: 'default', suspended: 'outline', pending_handover: 'secondary' }
const STATUS_LABEL: Record<string, string> = { active: 'Aktif', suspended: 'Ditangguhkan', pending_handover: 'Proses Serah Terima' }
export function TabKategori({ tenantId }: Props) {
  const [data, setData] = useState<AssignmentTabData | null>(null)
  const [loading, setLoading] = useState(true)
  const fetchData = async () => { setLoading(true); try { const res = await fetch(`/api/superadmin/tenants/${tenantId}/categories`); const json = await res.json(); if (json.success) setData(json.data) } catch { toast.error('Gagal memuat data kategori') } finally { setLoading(false) } }
  useEffect(() => { fetchData() }, [tenantId])
  if (loading) return (<div className="space-y-2 max-w-3xl">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>)
  if (!data) return (<p className="text-sm text-muted-foreground">Gagal memuat data kategori.</p>)
  return (<div className="space-y-4 max-w-3xl"><div className="grid grid-cols-3 gap-3"><div className="rounded-md border p-3"><div className="text-2xl font-semibold">{data.summary.total_aktif}</div><div className="text-xs text-muted-foreground">Kategori Aktif</div></div><div className="rounded-md border p-3"><div className="text-2xl font-semibold">{data.summary.total_override_komisi}</div><div className="text-xs text-muted-foreground">Override Komisi</div></div><div className="rounded-md border p-3"><div className="text-sm font-medium">{data.summary.coverage_summary}</div><div className="text-xs text-muted-foreground">Coverage</div></div></div></div>)
}
