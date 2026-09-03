// components/superadmin/FormFieldRegistryClient/FormFieldRegistryClient.hook.ts
// ---------------------------------------------------------------------------
// Lahir: Sesi #489 - pemecahan `components/superadmin/FormFieldRegistryClient.tsx`
//   (13.266 B = 129,55% plafon kode 10.240 B, hutang #97). Commit tersendiri,
//   NOL perubahan perilaku. Bentuk folder + `index.ts` sebagai MASTER: ATURAN 50.5
//   (>=3 pecahan WAJIB folder + MASTER; pasal itu menyebut kode secara eksplisit).
//   Isi di bawah DIPINDAH byte-exact oleh program dari berkas asal - nol karakter
//   diketik ulang, nol kalimat diringkas, urutan asli dipertahankan.
//   Arsip byte-exact asal: _arsip/coding-history/sesi-489-pecah-form-field-registry-client/
// ISI BERKAS INI: baris 112-207 berkas asal - SELURUH keadaan panel, satu blok utuh.
// ---------------------------------------------------------------------------
//   R1: baris 112-207 dipindah sebagai SATU blok - urutan pemanggilan hook React
//   tidak boleh berubah. R2: `geser` dan `simpan` sengaja TIDAK dimemoisasi, persis
//   seperti asalnya - menambah useCallback di sini adalah perubahan perilaku.

import { useMemo, useState } from 'react'
import { toast }             from 'sonner'
import type { FormFieldRow } from '@/lib/types/form-field-registry.types'
import { SAKLAR, judulSaklar } from './FormFieldRegistryClient.kontrak'
import type { FormFieldGroupData, SaklarKey, PeringatanBaris } from './FormFieldRegistryClient.kontrak'

export function useFormFieldRegistry({
  formKey,
  initialData,
}: {
  formKey:     string
  initialData: FormFieldGroupData[]
}) {
  const [groups, setGroups]   = useState<FormFieldGroupData[]>(initialData)
  const [asli]                = useState<FormFieldGroupData[]>(
    () => JSON.parse(JSON.stringify(initialData)) as FormFieldGroupData[]
  )
  const [saving, setSaving]   = useState(false)

  // Peta baris asli, supaya perbandingan tidak bergantung posisi indeks.
  const petaAsli = useMemo(() => {
    const peta = new Map<string, FormFieldRow>()
    for (const g of asli) for (const f of g.fields) peta.set(f.id, f)
    return peta
  }, [asli])

  const semuaField = useMemo(() => groups.flatMap(g => g.fields), [groups])

  /** Baris yang berubah, beserta saklar mana saja yang berubah. */
  const perubahan = useMemo(() => {
    const hasil: { field: FormFieldRow; saklar: SaklarKey[] }[] = []
    for (const field of semuaField) {
      const awal = petaAsli.get(field.id)
      if (!awal) continue
      const berubah = SAKLAR.map(s => s.key).filter(k => field[k] !== awal[k])
      if (berubah.length > 0) hasil.push({ field, saklar: berubah })
    }
    return hasil
  }, [semuaField, petaAsli])

  /**
   * Kolom ber-dasar-hukum yang sedang DIMATIKAN (Tampil/Wajib/Verifikasi/Aktif dari true ke false),
   * berikut NAMA saklar yang dimatikan. Inilah yang memunculkan peringatan — bukan setiap perubahan.
   * Syarat masuknya SAMA PERSIS dengan versi S#483; yang ditambah hanya nama saklarnya.
   */
  const peringatan = useMemo<PeringatanBaris[]>(() => {
    const hasil: PeringatanBaris[] = []
    for (const { field, saklar } of perubahan) {
      if (!field.dasar_hukum) continue
      const dimatikan: string[] = []
      for (const k of saklar) if (field[k] === false) dimatikan.push(judulSaklar(k))
      if (dimatikan.length > 0) hasil.push({ field, dimatikan })
    }
    return hasil
  }, [perubahan])

  /** Id baris yang diberi penanda ⚠ — H-484-A. Sel pertama menempel kiri, jadi selalu terlihat. */
  const idDitandai = useMemo(() => {
    const set = new Set<string>()
    for (const p of peringatan) set.add(p.field.id)
    return set
  }, [peringatan])

  /** Jumlah SAKLAR yang berubah — sengaja dipisah dari jumlah KOLOM FORMULIR (H-484-B). */
  const jumlahSaklarBerubah = useMemo(() => {
    let n = 0
    for (const p of perubahan) n += p.saklar.length
    return n
  }, [perubahan])

  const adaPerubahan = perubahan.length > 0

  const geser = (fieldId: string, key: SaklarKey, nilai: boolean): void => {
    setGroups(prev =>
      prev.map(g => ({
        ...g,
        fields: g.fields.map(f => (f.id === fieldId ? { ...f, [key]: nilai } : f)),
      }))
    )
  }

  const simpan = async (): Promise<void> => {
    if (!adaPerubahan || saving) return
    setSaving(true)
    try {
      const body = {
        perubahan: perubahan.map(({ field, saklar }) => {
          const patch: Record<string, unknown> = { id: field.id }
          for (const k of saklar) patch[k] = field[k]
          return patch
        }),
      }
      const res  = await fetch(`/api/form-fields/${formKey}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.message ?? 'Gagal menyimpan')

      toast.success(`${json.jumlah} kolom formulir disimpan`)
      // Muat ulang dari server supaya layar memakai keadaan yang benar-benar tersimpan,
      // bukan tebakan optimistis di sisi klien.
      window.location.reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan')
      setSaving(false)
    }
  }

  return {
    groups,
    saving,
    perubahan,
    peringatan,
    idDitandai,
    jumlahSaklarBerubah,
    adaPerubahan,
    geser,
    simpan,
  }
}
