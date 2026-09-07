// components/superadmin/PolaIsianClient/PolaIsianClient.hook.ts
// SELURUH keadaan layar "Pola Isian". Dibuat: Sesi #492 — K-488-T1b.
//
// ⛔ Nol validasi bentuk ekspresi dikerjakan di sini: penjaganya SATU, di server
//   (`lib/utils/form-field-pola-patch.util.ts`). Menyalinnya ke layar melahirkan dua
//   sumber kebenaran yang pasti melenceng.

import { useState } from 'react'
import { toast } from 'sonner'
import type { FormFieldPolaRow } from '@/lib/types/form-field-pola.types'
import { FORM_KOSONG, keForm, keMuatan } from './PolaIsianClient.kontrak'
import type { FormPola } from './PolaIsianClient.kontrak'

export function usePolaIsian({ initialData }: { initialData: FormFieldPolaRow[] }) {
  const [dialogBuka, setDialogBuka] = useState(false)
  const [form, setForm]             = useState<FormPola>(FORM_KOSONG)
  const [menyimpan, setMenyimpan]   = useState(false)

  const bukaTambah = (): void => { setForm(FORM_KOSONG); setDialogBuka(true) }
  const bukaSunting = (row: FormFieldPolaRow): void => { setForm(keForm(row)); setDialogBuka(true) }
  const ubah = (medan: keyof FormPola, nilai: string): void =>
    setForm((lama) => ({ ...lama, [medan]: nilai }))

  /** Satu jalan keluar untuk semua penulisan — pesan galat server ditampilkan apa adanya. */
  const kirim = async (url: string, method: string, body?: unknown): Promise<boolean> => {
    const res  = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body:    body ? JSON.stringify(body) : undefined,
    })
    const json = await res.json() as { success: boolean; message?: string }
    if (!res.ok || !json.success) throw new Error(json.message ?? 'Gagal menyimpan')
    return true
  }

  const simpan = async (): Promise<void> => {
    if (menyimpan) return
    setMenyimpan(true)
    try {
      const baru = form.id === null
      await kirim(
        baru ? '/api/form-field-pola' : `/api/form-field-pola/${form.id}`,
        baru ? 'POST' : 'PATCH',
        keMuatan(form, baru),
      )
      toast.success(baru ? 'Jenis pola ditambahkan' : 'Jenis pola disimpan')
      window.location.reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan')
      setMenyimpan(false)
    }
  }

  /** Saklar aktif ditulis SEKETIKA — ia satu medan, dan menahannya di balik dialog menyesatkan. */
  const geserAktif = async (row: FormFieldPolaRow): Promise<void> => {
    try {
      await kirim(`/api/form-field-pola/${row.id}`, 'PATCH', { is_active: !row.is_active })
      window.location.reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengubah saklar')
    }
  }

  const hapus = async (row: FormFieldPolaRow): Promise<void> => {
    try {
      await kirim(`/api/form-field-pola/${row.id}`, 'DELETE')
      toast.success('Jenis pola dihapus')
      window.location.reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menghapus')
    }
  }

  return {
    daftar: initialData,
    dialogBuka, setDialogBuka,
    form, ubah,
    menyimpan,
    bukaTambah, bukaSunting,
    simpan, geserAktif, hapus,
  }
}
