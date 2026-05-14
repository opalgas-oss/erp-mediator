// ARSIP: TenantTable.tsx kondisi pre-S#141 Fase F (7 kolom dengan Tier, kebab 1-item)
'use client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import type { TenantListItem, TenantLifecycleStatus } from '@/lib/types/tenant.types'
import { TENANT_LIFECYCLE_LABEL } from '@/lib/constants/tenant.constant'
const STATUS_VARIANT: Record<TenantLifecycleStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = { active: 'default', pending: 'secondary', suspended: 'outline', expired: 'outline', terminated: 'destructive' }
interface Props { data: TenantListItem[]; loading: boolean; onRowClick: (id: string) => void }
export function TenantTable({ data, loading, onRowClick }: Props) {
  if (loading) return (<div className="space-y-2">{Array.from({length:5}).map((_,i) => <Skeleton key={i} className="h-12 w-full rounded-md" />)}</div>)
  if (data.length === 0) return (<div className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">Tidak ada tenant.</div>)
  return (<div className="rounded-md border overflow-hidden"><table className="w-full text-sm table-fixed"><colgroup><col className="w-[220px]" /><col className="w-[120px]" /><col className="w-[80px]" /><col className="w-[80px]" /><col className="w-[140px]" /><col className="w-[100px]" /><col className="w-[48px]" /></colgroup><thead className="bg-muted/50"><tr><th className="px-4 py-2.5 text-left">Nama Brand</th><th className="px-4 py-2.5 text-left">Kode</th><th className="px-4 py-2.5 text-left">Tipe</th><th className="px-4 py-2.5 text-left">Tier</th><th className="px-4 py-2.5 text-left">PIC</th><th className="px-4 py-2.5 text-left">Status</th><th /></tr></thead><tbody className="divide-y">{data.map(t => (<tr key={t.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => onRowClick(t.id)}><td className="px-4 py-3 font-medium">{t.nama_brand}</td><td className="px-4 py-3 font-mono text-xs">{t.slug ?? '—'}</td><td className="px-4 py-3 capitalize">{t.tipe ?? '—'}</td><td className="px-4 py-3 capitalize">{t.tier}</td><td className="px-4 py-3">{t.pic_name ?? <span className="italic">Belum ada</span>}</td><td className="px-4 py-3"><Badge variant={STATUS_VARIANT[t.status]}>{TENANT_LIFECYCLE_LABEL[t.status]}</Badge></td><td className="px-2 py-3" onClick={e => e.stopPropagation()}><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8">⋮</Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => onRowClick(t.id)}>Lihat Detail</DropdownMenuItem></DropdownMenuContent></DropdownMenu></td></tr>))}</tbody></table></div>)
}
