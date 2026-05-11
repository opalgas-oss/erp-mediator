// lib/hooks/useGroupDeleteCheck.ts
// ⚠️ DEPRECATED — Sesi #122
// Digantikan oleh: useDeleteWithSafetyCheck (lib/hooks/useDeleteWithSafetyCheck.ts)
// File ini disimpan sebagai backward-compat shim selama transisi.
// Hapus file ini setelah semua caller sudah migrasi ke useDeleteWithSafetyCheck.

import { useDeleteWithSafetyCheck } from '@/lib/hooks/useDeleteWithSafetyCheck'
import type { GrupDenganOpsi }       from '@/lib/types/master-dropdown.types'
import type { SafetyVerdict }        from '@/lib/types/usage-tracking.types'

/** @deprecated Pakai useDeleteWithSafetyCheck langsung */
export function useGroupDeleteCheck(onDeleted: () => void): {
  deleteVerdicts:    Record<string, SafetyVerdict | 'loading'>
  handleDeleteClick: (grup: GrupDenganOpsi) => Promise<void>
} {
  const { deleteVerdicts, handleDeleteClick: genericClick } = useDeleteWithSafetyCheck({
    sourceTable:  'master_dropdown_groups',
    getDeleteUrl: (id) => `/api/superadmin/dropdowns/groups/${id}`,
    confirmTitle: (name) => `Hapus grup "${name}"?`,
    confirmDesc:  'Semua opsinya juga akan dinonaktifkan. Data yang sudah ada tetap aman.',
    onDeleted,
  })

  async function handleDeleteClick(grup: GrupDenganOpsi) {
    await genericClick({ id: grup.id, displayName: grup.display_name })
  }

  return { deleteVerdicts, handleDeleteClick }
}
