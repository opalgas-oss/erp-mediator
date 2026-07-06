'use client'

// ARSIP — TabKategori.tsx pra-fix kebab dropdown terpotong + tabel full height (S#324)
// Original path: app/dashboard/superadmin/tenants/[id]/TabKategori.tsx
// Dibuat: Sesi #132 — Diupdate: Sesi #141, S#323 (chevron)

import { useState, useEffect } from 'react'
import { toast }               from 'sonner'
import type { AssignmentTabData, AssignmentDenganKategori } from '@/lib/types/tenant-category-assignment.types'
import { DialogTambahKategori }  from './DialogTambahKategori'
import { S }                     from './_shared/tenant-tab-ui'
import { formatDateIdShort }     from '@/lib/utils-client'

interface Props { tenantId: string }

const ASSIGNMENT_STATUS_STYLE: Record<string, { bg: string; text: string; border: string; icon: string; label: string }> = {
  active:           { bg: '#EAF3DE', text: '#3B6D11', border: '#97C459', icon: 'ti-circle-check',    label: 'Aktif' },
  suspended:        { bg: '#FAEEDA', text: '#854F0B', border: '#EF9F27', icon: 'ti-player-pause',    label: 'Ditangguhkan' },
  revoked:          { bg: '#FCEBEB', text: '#A32D2D', border: '#F09595', icon: 'ti-x',               label: 'Dicabut' },
  pending_handover: { bg: '#FAEEDA', text: '#854F0B', border: '#EF9F27', icon: 'ti-arrows-exchange', label: 'Proses Serah Terima' },
}

function StatusBadge({ status }: { status: string }) {
  const st = ASSIGNMENT_STATUS_STYLE[status] ?? ASSIGNMENT_STATUS_STYLE.active
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 100, fontSize: 11, fontWeight: 500, background: st.bg, color: st.text, borderWidth: '0.5px', borderStyle: 'solid', borderColor: st.border }}>
      <i className={`ti ${st.icon}`} style={{ fontSize: 11 }} />{st.label}
    </span>
  )
}

export function TabKategori({ tenantId }: Props) {
  // ... (isi lengkap tersimpan di arsip filesystem — lihat git history atau arsip S#323)
  return <div />
}
