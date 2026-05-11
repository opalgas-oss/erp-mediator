'use client'

// lib/hooks/useDeleteWithSafetyCheck.ts
// Hook tipis: kelola STATE dialog konfirmasi delete + execute delete.
// TIDAK lagi fetch/cache verdict — verdict dihitung oleh useDeletePermission
// di komponen pemanggil, dan parent decide enable/disable button + open dialog.
//
// CATATAN PENAMAAN FILE:
//   File tetap bernama `useDeleteWithSafetyCheck` untuk minimize disruption,
//   tapi fungsi yang di-export sekarang adalah `useDeleteConfirmDialog`.
//   `useDeleteWithSafetyCheck` di-keep sebagai alias untuk callers existing.
//
// is_shared: true — bisa dipakai modul apapun (dropdown, config, message, dll).
//
// Dibuat: Sesi #122 — original (fetch + cache + dialog)
// Update: Sesi #124 — Refactor toast confirm → Dialog modal
// Update: Sesi #125 — DISEDERHANAKAN. Hapus fetch/cache verdict (sudah di useDeletePermission).
//                     Hook ini sekarang HANYA buka/tutup dialog + execute delete.

import { useState } from 'react'
import { toast }    from 'sonner'

// ─── Config ───────────────────────────────────────────────────────────────────

interface UseDeleteConfirmDialogConfig {
  /** URL API delete berdasarkan id item */
  getDeleteUrl:   (id: string) => string
  /** Method + body untuk fetch delete. Default: DELETE tanpa body. */
  getDeleteInit?: (id: string) => RequestInit
  /** Judul dialog konfirmasi — plain language */
  confirmTitle:   (displayName: string) => string
  /** Deskripsi dialog konfirmasi — plain language */
  confirmDesc:    string
  /** Dipanggil setelah hapus berhasil */
  onDeleted:      () => void
}

interface DeleteConfirmDialogState {
  open:        boolean
  title:       string
  description: string
  loading:     boolean
}

interface UseDeleteConfirmDialogResult {
  /** Buka dialog konfirmasi untuk item tertentu. Parent harus pastikan verdict.action === 'delete' sebelum panggil ini. */
  openDialog:     (item: { id: string; displayName: string }) => void
  /** State untuk pass ke <DeleteConfirmDialog />. */
  dialogState:    DeleteConfirmDialogState
  /** Konfirmasi → eksekusi delete via fetch. */
  confirmDelete:  () => Promise<void>
  /** Cancel → tutup dialog tanpa hapus. */
  cancelDelete:   () => void
}

// ─── Hook (nama baru) ────────────────────────────────────────────────────────

export function useDeleteConfirmDialog(
  config: UseDeleteConfirmDialogConfig
): UseDeleteConfirmDialogResult {
  const { getDeleteUrl, getDeleteInit, confirmTitle, confirmDesc, onDeleted } = config

  const [pendingItem, setPendingItem] = useState<{ id: string; displayName: string } | null>(null)
  const [isDeleting,  setIsDeleting]  = useState(false)

  function openDialog(item: { id: string; displayName: string }) {
    setPendingItem(item)
  }

  function cancelDelete() {
    if (isDeleting) return  // Jangan tutup saat sedang fetch
    setPendingItem(null)
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
      setPendingItem(null)
      onDeleted()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menghapus item')
    } finally {
      setIsDeleting(false)
    }
  }

  const dialogState: DeleteConfirmDialogState = {
    open:        pendingItem !== null,
    title:       pendingItem ? confirmTitle(pendingItem.displayName) : '',
    description: confirmDesc,
    loading:     isDeleting,
  }

  return {
    openDialog,
    dialogState,
    confirmDelete,
    cancelDelete,
  }
}

// ─── Alias backward-compat ────────────────────────────────────────────────────
// Tidak ada caller yang masih pakai signature lama setelah Layer 2 refactor selesai.
// Tapi alias ini dibiarkan untuk transisi gradual jika di masa depan ada modul
// lain (M1/M2/M3) yang belum di-migrate ke pola useDeletePermission.

export { useDeleteConfirmDialog as useDeleteWithSafetyCheck }
