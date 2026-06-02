'use client'

// app/dashboard/superadmin/tenants/[id]/TabAdminTenantHistory.tsx
// Tab AdminTenant — orchestrator: state, fetch, dialog control.
// Render komponen ada di tab-admintenant-history.parts.tsx
// Acuan: mockup_11_b2_tab_admintenant_v2.html (APPROVED S#236)
// K-27: 1 tombol Edit per baris → buka DialogKelolaAksesAdminTenant (B4)
// Dibuat S#239, dirampingkan S#240 (split — 14 KB → orchestrator)

import { useState, useEffect, useCallback } from 'react'
import type { AdminTenantKartu, AdminTenantHistory } from '@/lib/types/admin-tenant.types'
import { cs } from './tab-admintenant-history.styles'
import { TabelAktif, TimelineRiwayat } from './tab-admintenant-history.parts'
import { DialogTambahAdminTenant } from './DialogTambahAdminTenant'
import { DialogKelolaAksesAdminTenant } from './DialogKelolaAksesAdminTenant'

interface Props { tenantId: string; tenantNama: string }

export function TabAdminTenantHistory({ tenantId, tenantNama }: Props) {
  const [loading,       setLoading]       = useState(true)
  const [aktif,         setAktif]         = useState<AdminTenantKartu[]>([])
  const [riwayat,       setRiwayat]       = useState<AdminTenantHistory[]>([])
  const [adaPeringatan, setAdaPeringatan] = useState(false)
  const [showTambah,    setShowTambah]    = useState(false)
  const [editTarget,    setEditTarget]    = useState<AdminTenantKartu | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch(`/api/superadmin/tenants/${tenantId}/admin-tenant`)
      const json = await res.json()
      if (json.success) {
        setAktif(json.data.aktif ?? [])
        setRiwayat(json.data.riwayat ?? [])
        setAdaPeringatan(json.data.ada_peringatan ?? false)
      }
    } catch { /* silent */ }
    setLoading(false)
  }, [tenantId])

  useEffect(() => { load() }, [load])

  return (
    <div>
      {/* Peringatan tidak ada PJ */}
      {!loading && adaPeringatan && (
        <div style={cs.errNote}>
          <i className="ti ti-alert-circle" style={{ flexShrink: 0, fontSize: 15, marginTop: 1 }} />
          <div>
            Tenant ini <strong>belum memiliki AdminTenant</strong>. Tambahkan Penanggung Jawab
            agar operasional dan akses dashboard dapat berjalan.
          </div>
        </div>
      )}

      <TabelAktif
        loading={loading}
        aktif={aktif}
        tenantId={tenantId}
        tenantNama={tenantNama}
        onEdit={at => setEditTarget(at)}
        onTambah={() => setShowTambah(true)}
        onRefresh={load}
      />

      <TimelineRiwayat loading={loading} riwayat={riwayat} />

      {showTambah && (
        <DialogTambahAdminTenant
          tenantId={tenantId}
          tenantNama={tenantNama}
          onClose={() => setShowTambah(false)}
          onSuccess={load}
        />
      )}
      {editTarget && (
        <DialogKelolaAksesAdminTenant
          tenantId={tenantId}
          tenantNama={tenantNama}
          at={editTarget}
          onClose={() => setEditTarget(null)}
          onSuccess={load}
        />
      )}
    </div>
  )
}
