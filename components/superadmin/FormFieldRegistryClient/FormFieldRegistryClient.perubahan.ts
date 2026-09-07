// components/superadmin/FormFieldRegistryClient/FormFieldRegistryClient.perubahan.ts
// Perhitungan APA YANG BERUBAH di panel Kolom Formulir — fungsi murni, nol React.
// Lahir: Sesi #493, dari pemecahan `FormFieldRegistryClient.hook.ts`.
//
// 🔴 SEBAB PEMECAHANNYA DIHITUNG SEBELUM SATU BARIS FITUR DITAMBAHKAN (ATURAN 53.1 + 50.2),
//   bukan sesudah: berkas asal terukur 7.226 B = 70,6% plafon kode 10.240 B, dan dialog sunting
//   label/aturan (butir 1b) menambah ±1.500 B ⇒ ±8.726 B = ±85% — DI ATAS ambang tindakan
//   8.192 B. ⇒ dipecah LEBIH DULU, sebagai commit tersendiri, NOL perubahan perilaku.
//   Uji baliknya: DOM panel sebelum dan sesudah pemecahan IDENTIK (selisih 0 byte).
//   Isi di bawah DIPINDAH dari berkas asal — nol kalimat komentar diringkas.
//   Arsip byte-exact asal: _arsip/coding-history/sesi-493-pecah-hook-form-field-registry/
//
// Sumbu pemecahan = ALASAN BERUBAH: perhitungan MURNI "apa yang berbeda dari keadaan awal"
//   di sini · keadaan React + penyimpanan ke server tetap di `.hook.ts`.
//
// ⚠️ Urutan pemanggilan hook React di `.hook.ts` TIDAK berubah oleh pemecahan ini: yang pindah
//   hanya ISI tiap `useMemo`, bukan `useMemo`-nya (R1 S#489 tetap berlaku).

import type { FormFieldRow } from '@/lib/types/form-field-registry.types'
import { SAKLAR, judulSaklar } from './FormFieldRegistryClient.kontrak'
import type { FormFieldGroupData, SaklarKey, PeringatanBaris } from './FormFieldRegistryClient.kontrak'

/** Satu baris yang berubah, beserta saklar mana saja yang berubah dan apakah urutannya bergeser. */
export interface BarisBerubah {
  field:         FormFieldRow
  saklar:        SaklarKey[]
  urutanBerubah: boolean
}

/** Peta baris asli, supaya perbandingan tidak bergantung posisi indeks. */
export function petaBarisAsli(asli: FormFieldGroupData[]): Map<string, FormFieldRow> {
  const peta = new Map<string, FormFieldRow>()
  for (const g of asli) for (const f of g.fields) peta.set(f.id, f)
  return peta
}

/** Nilai `urutan` sebelum disentuh — dipakai tabel untuk menandai nomor yang berubah. */
export function petaUrutanAsli(asli: FormFieldGroupData[]): Map<string, number> {
  const peta = new Map<string, number>()
  for (const g of asli) for (const f of g.fields) peta.set(f.id, f.urutan)
  return peta
}

/**
 * Baris yang berubah, beserta saklar mana saja yang berubah dan apakah urutannya bergeser.
 * S#492: `urutanBerubah` ditambahkan — sebelumnya hanya saklar yang dibandingkan.
 */
export function hitungPerubahan(
  semuaField: FormFieldRow[],
  petaAsli:   Map<string, FormFieldRow>,
): BarisBerubah[] {
  const hasil: BarisBerubah[] = []
  for (const field of semuaField) {
    const awal = petaAsli.get(field.id)
    if (!awal) continue
    const berubah = SAKLAR.map(s => s.key).filter(k => field[k] !== awal[k])
    const urutanBerubah = field.urutan !== awal.urutan
    if (berubah.length > 0 || urutanBerubah) hasil.push({ field, saklar: berubah, urutanBerubah })
  }
  return hasil
}

/**
 * Kolom ber-dasar-hukum yang sedang DIMATIKAN (Tampil/Wajib/Verifikasi/Aktif dari true ke false),
 * berikut NAMA saklar yang dimatikan. Inilah yang memunculkan peringatan — bukan setiap perubahan.
 * Syarat masuknya SAMA PERSIS dengan versi S#483; yang ditambah hanya nama saklarnya.
 */
export function hitungPeringatan(perubahan: BarisBerubah[]): PeringatanBaris[] {
  const hasil: PeringatanBaris[] = []
  for (const { field, saklar } of perubahan) {
    if (!field.dasar_hukum) continue
    const dimatikan: string[] = []
    for (const k of saklar) if (field[k] === false) dimatikan.push(judulSaklar(k))
    if (dimatikan.length > 0) hasil.push({ field, dimatikan })
  }
  return hasil
}

/** Id baris yang diberi penanda ⚠ — H-484-A. Sel pertama menempel kiri, jadi selalu terlihat. */
export function hitungIdDitandai(peringatan: PeringatanBaris[]): Set<string> {
  const set = new Set<string>()
  for (const p of peringatan) set.add(p.field.id)
  return set
}

/** Jumlah SAKLAR yang berubah — sengaja dipisah dari jumlah KOLOM FORMULIR (H-484-B). */
export function hitungJumlahSaklarBerubah(perubahan: BarisBerubah[]): number {
  let n = 0
  for (const p of perubahan) n += p.saklar.length
  return n
}

/**
 * Jumlah baris yang URUTANNYA bergeser — ruas hitungan tersendiri (K-487-T8).
 * Sebabnya sama dengan H-484-B: satu angka gabungan dibaca Philips sebagai salah hitung.
 * Hal berbeda ⇒ angka berbeda.
 */
export function hitungJumlahUrutanBerubah(perubahan: BarisBerubah[]): number {
  return perubahan.filter(p => p.urutanBerubah).length
}

/** Muatan `PATCH` satu baris: id + saklar yang berubah + urutan bila bergeser (SPEK §4). */
export function muatanPatch({ field, saklar, urutanBerubah }: BarisBerubah): Record<string, unknown> {
  const patch: Record<string, unknown> = { id: field.id }
  for (const k of saklar) patch[k] = field[k]
  if (urutanBerubah) patch.urutan = field.urutan
  return patch
}
