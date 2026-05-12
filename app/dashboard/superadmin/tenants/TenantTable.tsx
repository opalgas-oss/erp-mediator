'use client'

// app/dashboard/superadmin/tenants/TenantTable.tsx
// Tabel List Tenants — 7 kolom + status badge + kebab menu
//
// Dibuat: Sesi #132 — M6 FASE 3 Step 3.7

import { Badge }             from '@/components/ui/badge'
import { Button }            from '@/components/ui/button'
import { Skeleton }          from '@/components/ui/skeleton'
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { TenantListItem, TenantLifecycleStatus } from '@/lib/types/tenant.types'
import { TENANT_LIFECYCLE_LABEL } from '@/lib/constants/tenant.constant'

// ─── Status badge color ───────────────────────────────────────────────────────

const STATUS_VARIANT: Record<TenantLifecycleStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active:     'default',
  pending:    'secondary',
  suspended:  'outline',
  expired:    'outline',
  terminated: 'destructive',
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  data:       TenantListItem[]
  loading:    boolean
  onRowClick: (id: string) => void
}

// ─── Komponen ─────────────────────────────────────────────────────────────────

export function TenantTable({ data, loading, onRowClick }: Props) {

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-md" />
        ))}
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
        Tidak ada tenant yang sesuai filter.
      </div>
    )
  }

  return (
    <div className="rounded-md border overflow-hidden">
      <table className="w-full text-sm table-fixed">
        <colgroup>
          {/* Nama Brand  */}<col className="w-[220px]" />
          {/* Kode        */}<col className="w-[120px]" />
          {/* Tipe        */}<col className="w-[80px]" />
          {/* Tier        */}<col className="w-[80px]" />
          {/* PIC         */}<col className="w-[140px]" />
          {/* Status      */}<col className="w-[100px]" />
          {/* Aksi        */}<col className="w-[48px]" />
        </colgroup>
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Nama Brand</th>
            <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Kode</th>
            <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Tipe</th>
            <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Tier</th>
            <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">PIC</th>
            <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Status</th>
            <th className="px-2 py-2.5" />
          </tr>
        </thead>
        <tbody className="divide-y">
          {data.map(tenant => (
            <tr
              key={tenant.id}
              className="hover:bg-muted/30 cursor-pointer transition-colors"
              onClick={() => onRowClick(tenant.id)}
            >
              <td className="px-4 py-3 font-medium truncate">
                <div className="truncate">{tenant.nama_brand}</div>
                {tenant.nama_legal && (
                  <div className="text-xs text-muted-foreground truncate">{tenant.nama_legal}</div>
                )}
              </td>
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground truncate">
                {tenant.slug ?? '—'}
              </td>
              <td className="px-4 py-3 text-muted-foreground capitalize">
                {tenant.tipe ?? '—'}
              </td>
              <td className="px-4 py-3 capitalize">
                {tenant.tier}
              </td>
              <td className="px-4 py-3 truncate">
                {tenant.pic_name ?? <span className="text-muted-foreground italic">Belum ada</span>}
              </td>
              <td className="px-4 py-3">
                <Badge variant={STATUS_VARIANT[tenant.status]}>
                  {TENANT_LIFECYCLE_LABEL[tenant.status]}
                </Badge>
              </td>
              <td
                className="px-2 py-3"
                onClick={e => e.stopPropagation()}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      ⋮
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onRowClick(tenant.id)}>
                      Lihat Detail
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
