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
//
// ---------------------------------------------------------------------------
// PEMECAHAN KEDUA — Sesi #493. Seluruh PERHITUNGAN MURNI "apa yang berbeda dari
//   keadaan awal" pindah ke `FormFieldRegistryClient.perubahan.ts`; berkas ini tinggal
//   memegang keadaan React dan penyimpanan ke server. Sebabnya diukur sebelum satu
//   baris fitur ditambahkan: 7.226 B = 70,6% + dialog sunting ±1.500 B ⇒ ±85%, DI ATAS
//   ambang tindakan 8.192 B (ATURAN 53.1 + 50.2). NOL perubahan perilaku; uji baliknya
//   DOM panel sebelum vs sesudah IDENTIK.
//   ⚠️ R1 TETAP BERLAKU: yang pindah hanya ISI tiap `useMemo`, bukan `useMemo`-nya —
//   urutan pemanggilan hook React di bawah sama persis dengan sebelum pemecahan.
// ---------------------------------------------------------------------------

import { useMemo, useState } from 'react'
import { toast }             from 'sonner'
import type { FormFieldRow } from '@/lib/types/form-field-registry.types'
import { naikkan, pindahkanBaris, turunkan } from './FormFieldRegistryClient.urutan'
import {
  hitungIdDitandai,
  hitungJumlahSaklarBerubah,
  hitungJumlahUrutanBerubah,
  hitungPerubahan,
  hitungPeringatan,
  muatanPatch,
  petaBarisAsli,
  petaUrutanAsli,
} from './FormFieldRegistryClient.perubahan'
import type { FormFieldGroupData, SaklarKey } from './FormFieldRegistryClient.kontrak'

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

  const petaAsli   = useMemo(() => petaBarisAsli(asli), [asli])
  const semuaField = useMemo(() => groups.flatMap(g => g.fields), [groups])
  const urutanAsli = useMemo(() => petaUrutanAsli(asli), [asli])

  const perubahan  = useMemo(() => hitungPerubahan(semuaField, petaAsli), [semuaField, petaAsli])
  const peringatan = useMemo(() => hitungPeringatan(perubahan), [perubahan])
  const idDitandai = useMemo(() => hitungIdDitandai(peringatan), [peringatan])

  const jumlahSaklarBerubah = useMemo(() => hitungJumlahSaklarBerubah(perubahan), [perubahan])
  const jumlahUrutanBerubah = useMemo(() => hitungJumlahUrutanBerubah(perubahan), [perubahan])

  const adaPerubahan = perubahan.length > 0

  /** Ganti isi SATU kartu, kartu lain tidak disentuh sama sekali (K-487-T4). */
  const gantiKartu = (
    groupKey: string,
    ubah: (fields: FormFieldRow[]) => FormFieldRow[],
  ): void => {
    setGroups(prev =>
      prev.map(g => (g.group_key === groupKey ? { ...g, fields: ubah(g.fields) } : g))
    )
  }

  const naikkanBaris  = (groupKey: string, indeks: number): void =>
    gantiKartu(groupKey, fields => naikkan(fields, indeks))
  const turunkanBaris = (groupKey: string, indeks: number): void =>
    gantiKartu(groupKey, fields => turunkan(fields, indeks))
  const seretBaris    = (groupKey: string, dari: number, ke: number): void =>
    gantiKartu(groupKey, fields => pindahkanBaris(fields, dari, ke))

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
      const body = { perubahan: perubahan.map(muatanPatch) }
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
    urutanAsli,
    jumlahSaklarBerubah,
    jumlahUrutanBerubah,
    adaPerubahan,
    geser,
    naikkanBaris,
    turunkanBaris,
    seretBaris,
    simpan,
  }
}
