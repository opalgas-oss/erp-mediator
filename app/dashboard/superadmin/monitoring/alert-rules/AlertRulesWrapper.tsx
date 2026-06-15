'use client'
// app/dashboard/superadmin/monitoring/alert-rules/AlertRulesWrapper.tsx
// Client wrapper untuk AlertRulesPanel di halaman M05 (alert-rules/page.tsx)
//
// Alasan file terpisah: AlertRulesPanel membutuhkan onUpdate yang merupakan fungsi —
// fungsi tidak bisa di-pass dari RSC ke Client component secara langsung.
// Wrapper ini mengelola state rules secara lokal di sisi client.
//
// Dibuat: Sesi #283 — fix client/server boundary M05

import { useState }    from 'react'
import { AlertRulesPanel } from '../MonitoringClient.subcomponents'
import type { AlertRule }  from '@/lib/types/monitoring.types'

export function AlertRulesWrapper({ initialRules }: { initialRules: AlertRule[] }) {
  const [rules, setRules] = useState<AlertRule[]>(initialRules)

  return (
    <AlertRulesPanel
      rules={rules}
      onUpdate={(updater) => setRules(updater)}
    />
  )
}
