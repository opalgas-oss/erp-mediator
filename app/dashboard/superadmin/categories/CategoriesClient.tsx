'use client'

// app/dashboard/superadmin/categories/CategoriesClient.tsx
// Orchestrator halaman List Categories — filter, search, CRUD dialog.
//
// Dibuat: Sesi #132 — M6 FASE 3 Step 3.7

import { useState, useCallback } from 'react'
import { toast }                  from 'sonner'
import { Button }                 from '@/components/ui/button'
import { Input }                  from '@/components/ui/input'
import { Skeleton }               from '@/components/ui/skeleton'
import { Badge }                  from '@/components/ui/badge'
import { DialogBuatKategori }     from './DialogBuatKategori'
import type { CategoryListItem, CategoryStats } from '@/lib/types/category.types'

interface Props {
  initialData:  CategoryListItem[]
  initialStats: CategoryStats
  initialTotal: number
}

export function CategoriesClient({ initialData, initialStats, initialTotal }: Props) {
  const [data,       setData]       = useState<CategoryListItem[]>(initialData)
  const [stats,      setStats]      = useState<CategoryStats>(initialStats)
  const [total,      setTotal]      = useState(initialTotal)
  const [loading,    setLoading]    = useState(false)
  const [search,     setSearch]     = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [expanded,   setExpanded]   = useState<Set<string>>(new Set())

  const fetchData = useCallback(async (q?: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '50' })
      if (q) params.set('search', q)
      const res  = await fetch(`/api/superadmin/categories?${params}`)
      const json = await res.json()
      if (json.success) {
        setData(json.data)
        setStats(json.stats)
        setTotal(json.total)
      }
    } catch {
      toast.error('Gagal memuat data kategori')
    } finally {
      setLoading(false)
    }
  }, [])

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const roots = data.filter(c => c.level === 1)
  const subs  = data.filter(c => c.level === 2)

  return (
    <div className="flex flex-col gap-4 p-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Master Kategori</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {stats.total_root} kategori root · {stats.total_sub} sub-kategori
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>+ Tambah Kategori</Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Root',     value: stats.total_root },
          { label: 'Total Sub',      value: stats.total_sub },
          { label: 'Sudah Assigned', value: stats.total_assigned },
          { label: 'Belum Assigned', value: stats.total_unassigned },
        ].map(s => (
          <div key={s.label} className="rounded-md border p-3">
            <div className="text-2xl font-semibold">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <Input
          placeholder="Cari nama atau slug kategori..."
          value={search}
          onChange={e => { setSearch(e.target.value); fetchData(e.target.value) }}
          className="max-w-xs"
        />
        <Button variant="outline" onClick={() => fetchData(search)}>Refresh</Button>
      </div>

      {/* Tabel hierarki */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <Skeleton key={i} className="h-11 w-full" />)}
        </div>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm table-fixed">
            <colgroup>
              {/* expand      */}<col className="w-8" />
              {/* nama        */}<col />
              {/* slug        */}<col className="w-[180px]" />
              {/* level       */}<col className="w-[80px]" />
              {/* assignments */}<col className="w-[80px]" />
              {/* status      */}<col className="w-[80px]" />
            </colgroup>
            <thead className="bg-muted/50">
              <tr>
                <th />
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Nama</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Slug</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Level</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Tenant</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {roots.map(root => {
                const subList = subs.filter(s => s.parent_id === root.id)
                const isOpen  = expanded.has(root.id)
                return [
                  <tr key={root.id} className="hover:bg-muted/30 font-medium">
                    <td className="pl-2">
                      {subList.length > 0 && (
                        <button onClick={() => toggleExpand(root.id)} className="p-1 text-muted-foreground hover:text-foreground">
                          {isOpen ? '▾' : '▸'}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-2.5">{root.display_name}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{root.slug}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">Root</td>
                    <td className="px-4 py-2.5">{root.total_tenants ?? 0}</td>
                    <td className="px-4 py-2.5">
                      <Badge variant={root.is_active ? 'default' : 'outline'}>
                        {root.is_active ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </td>
                  </tr>,
                  ...(isOpen ? subList.map(sub => (
                    <tr key={sub.id} className="hover:bg-muted/20 bg-muted/5">
                      <td />
                      <td className="px-4 py-2 pl-8 text-muted-foreground">{sub.display_name}</td>
                      <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{sub.slug}</td>
                      <td className="px-4 py-2 text-muted-foreground">Sub</td>
                      <td className="px-4 py-2">{sub.total_tenants ?? 0}</td>
                      <td className="px-4 py-2">
                        <Badge variant={sub.is_active ? 'default' : 'outline'}>
                          {sub.is_active ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                      </td>
                    </tr>
                  )) : []),
                ]
              })}
            </tbody>
          </table>

          {roots.length === 0 && (
            <div className="p-10 text-center text-sm text-muted-foreground">
              Belum ada kategori. Klik &quot;Tambah Kategori&quot; untuk memulai.
            </div>
          )}
        </div>
      )}

      <DialogBuatKategori
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSuccess={() => { setDialogOpen(false); fetchData(search) }}
        existingRoots={roots}
      />
    </div>
  )
}
