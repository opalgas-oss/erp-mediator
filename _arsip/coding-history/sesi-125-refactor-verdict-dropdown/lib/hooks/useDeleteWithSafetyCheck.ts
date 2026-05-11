// lib/hooks/useDeleteWithSafetyCheck.ts
// Hook GENERIC: delete item dengan safety check USAGE_TRACKING.
// Fetch verdict registry_safety_status sebelum izinkan hapus.
// Konfirmasi via Dialog modal di tengah layar (bukan toast — lebih visible).
//
// is_shared: true — dipakai oleh komponen manapun yang butuh delete + usage check
// process_type: TRACKING — domain: dropdown (pilot M4, akan dipakai M1/M2/M3/dll)
//
// Dibuat: Sesi #122 — M4 integrasi USAGE_TRACKING
// Update: Sesi #124 — Refactor toast confirm → Dialog modal (toast tidak terlihat
//                     karena berada di pojok atas, user lebih nyaman dengan modal di tengah)

import { useState }           from 'react'
import { toast }              from 'sonner'
import type { SafetyVerdict } from '@/lib/types/usage-tracking.types'

interface UseDeleteWithSafetyCheckConfig {
  sourceTable:    string
  getDeleteUrl:   (id: string) => string
  getDeleteInit?: (id: string) => RequestInit
  confirmTitle:   (displayName: string) => string
  confirmDesc:    string
  onDeleted:      () => void
}

interface UseDeleteWithSafetyCheckResult {
  deleteVerdicts:    Record<string, SafetyVerdict | 'loading'>
  prefetchVerdicts:  (ids: string[]) => Promise<void>
  setVerdict:        (id: string, verdict: SafetyVerdict) => void
  handleDeleteClick: (item: { id: string; displayName: string }) => Promise<void>
  dialogState:       {
    open:        boolean
    title:       string
    description: string
    loading:     boolean
  }
  confirmDelete:     () => Promise<void>
  cancelDelete:      () => void
}

export function useDeleteWithSafetyCheck(
  config: UseDeleteWithSafetyCheckConfig
): UseDeleteWithSafetyCheckResult {
  const {
    sourceTable, getDeleteUrl, getDeleteInit,
    confirmTitle, confirmDesc, onDeleted,
  } = config

  const [deleteVerdicts, setDeleteVerdicts] = useState<Record<string, SafetyVerdict | 'loading'>>({})
  const [pendingItem, setPendingItem]       = useState<{ id: string; displayName: string } | null>(null)
  const [isDeleting,  setIsDeleting]        = useState(false)

  async function prefetchVerdicts(ids: string[]) {
    const toFetch = ids.filter(id => !deleteVerdicts[id])
    if (toFetch.length === 0) return
    setDeleteVerdicts(prev => {
      const loading: Record<string, SafetyVerdict | 'loading'> = {}
      toFetch.forEach(id => { loading[id] = 'loading' })
      return { ...prev, ...loading }
    })
    await Promise.all(toFetch.map(async (id) => {
      try {
        const q    = new URLSearchParams({ table: sourceTable, id })
        const res  = await fetch(`/api/superadmin/usage/check?${q}`)
        const json = await res.json()
        const verdict: SafetyVerdict = json.data?.safety_verdict ?? 'AMAN'
        setDeleteVerdicts(prev => ({ ...prev, [id]: verdict }))
      } catch {
        setDeleteVerdicts(prev => { const n = { ...prev }; delete n[id]; return n })
      }
    }))
  }

  function openConfirmDialog(item: { id: string; displayName: string }) {
    setPendingItem(item)
  }

  async function confirmDelete() {
    if (!pendingItem) return
    setIsDeleting(true)
    try {
      const url  = getDeleteUrl(pendingItem.id)
      const init = getDeleteInit ? getDeleteInit(pendingItem.id) : { method: 'DELETE' }
      const res  = await fetch(url, init)
      const json = await res.json() as { success: boolean; message?: string }
      if (!json.success) throw new Error(json.message ?? 'Gagal menghapus')

      toast.success(`"${pendingItem.displayName}" berhasil dihapus`)
      setDeleteVerdicts(prev => {
        const n = { ...prev }
        delete n[pendingItem.id]
        return n
      })
      setPendingItem(null)
      onDeleted()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menghapus item')
    } finally {
      setIsDeleting(false)
    }
  }

  function cancelDelete() {
    if (isDeleting) return
    setPendingItem(null)
  }

  async function handleDeleteClick(item: { id: string; displayName: string }) {
    const cached = deleteVerdicts[item.id]
    if (cached && cached !== 'loading') {
      if (cached === 'AMAN') { openConfirmDialog(item); return }
      toast.error(cached === 'TIDAK_BISA'
        ? 'Tidak bisa dihapus — item ada di kode modul yang sedang dibangun.'
        : 'Tidak aman — item sedang aktif dipakai oleh data user.')
      return
    }
    setDeleteVerdicts(prev => ({ ...prev, [item.id]: 'loading' }))
    try {
      const q    = new URLSearchParams({ table: sourceTable, id: item.id })
      const res  = await fetch(`/api/superadmin/usage/check?${q}`)
      const json = await res.json()
      const verdict: SafetyVerdict = json.data?.safety_verdict ?? 'TIDAK_AMAN'
      setDeleteVerdicts(prev => ({ ...prev, [item.id]: verdict }))
      if (verdict === 'AMAN') openConfirmDialog(item)
      else toast.error(verdict === 'TIDAK_BISA'
        ? 'Tidak bisa dihapus — item ada di kode modul yang sedang dibangun.'
        : 'Tidak aman — item sedang aktif dipakai modul lain.')
    } catch {
      setDeleteVerdicts(prev => { const n = { ...prev }; delete n[item.id]; return n })
      toast.error('Gagal memeriksa status pemakaian. Coba lagi.')
    }
  }

  function setVerdict(id: string, verdict: SafetyVerdict) {
    setDeleteVerdicts(prev => ({ ...prev, [id]: verdict }))
  }

  const dialogState = {
    open:        pendingItem !== null,
    title:       pendingItem ? confirmTitle(pendingItem.displayName) : '',
    description: confirmDesc,
    loading:     isDeleting,
  }

  return {
    deleteVerdicts,
    prefetchVerdicts,
    setVerdict,
    handleDeleteClick,
    dialogState,
    confirmDelete,
    cancelDelete,
  }
}
