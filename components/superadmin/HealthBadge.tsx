'use client'
// components/superadmin/HealthBadge.tsx
// Badge status kesehatan provider — dipakai di halaman Providers dan Monitoring.
// Dibuat: Sesi #107 — M3 Credential Management

import { ICON_STATUS }                           from '@/lib/constants/icons.constant'
import { resolveHealthColor, resolveHealthLabel } from '@/lib/constants/ui-tokens.constant'
import type { HealthStatus }                      from '@/lib/types/provider.types'

interface HealthBadgeProps {
  status: HealthStatus
  size?:  'sm' | 'md'
}

export function HealthBadge({ status, size = 'md' }: HealthBadgeProps) {
  const colorCls = resolveHealthColor(status)
  const label    = resolveHealthLabel(status)

  const Icon = {
    sehat:       ICON_STATUS.success,
    peringatan:  ICON_STATUS.warning,
    gagal:       ICON_STATUS.failed,
    belum_dites: ICON_STATUS.info,
  }[status] ?? ICON_STATUS.info

  const iconSize  = size === 'sm' ? 12 : 14
  const textSize  = size === 'sm' ? 'text-[10px]' : 'text-xs'
  const padding   = size === 'sm' ? 'px-1.5 py-0.5' : 'px-2 py-1'

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border font-medium ${colorCls} ${textSize} ${padding}`}>
      <Icon size={iconSize} />
      {label}
    </span>
  )
}
