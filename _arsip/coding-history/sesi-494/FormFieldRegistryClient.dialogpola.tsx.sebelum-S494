// components/superadmin/FormFieldRegistryClient/FormFieldRegistryClient.dialogpola.tsx
// Daftar POLA BERLAPIS di dalam dialog Sunting. Dibuat: Sesi #493 — butir 1b.
//
// 🔴 K-488-T2/T3 — BERLAPIS ADALAH BENTUK NORMAL, tunggal adalah kasus khusus.
//   Isian pendaftar sah bila cocok SALAH SATU pola yang berlaku pada tanggal ia mendaftar,
//   jadi menambah pola baru tidak pernah membuat isian lama menjadi tidak sah.
// 🔴 Yang disimpan adalah NAMA POLA + PARAMETER, ⛔ bukan regex. Regexnya tinggal di
//   `form_field_pola`, satu tempat untuk semua kolom.
//
// Medan parameter DITURUNKAN dari `parameter_skema` jenis pola yang dipilih — jadi jenis
// pola baru yang SA buat sendiri langsung punya medannya di sini, tanpa menyentuh berkas ini.

import { Button } from '@/components/ui/button'
import type { FormFieldPolaPublik } from '@/lib/types/form-field-pola.types'
import type { PolaBaris } from './FormFieldRegistryClient.kontrak'
import { Bantuan, MedanPilih, MedanTeks } from './FormFieldRegistryClient.dialogmedan'

export function DaftarPola({
  daftar, katalog, ubah, hapus, tambah,
}: {
  daftar:  PolaBaris[]
  katalog: FormFieldPolaPublik[]
  ubah:    (indeks: number, baris: PolaBaris) => void
  hapus:   (indeks: number) => void
  tambah:  () => void
}) {
  const opsiJenis = katalog.map(k => ({ nilai: k.pola_key, label: k.label }))

  return (
    <div className="flex flex-col gap-3">
      {daftar.length === 0 ? (
        <Bantuan isi="Belum ada pola. Tanpa pola, bentuk isian tidak dibatasi." />
      ) : null}

      {daftar.map((p, i) => {
        const skema = katalog.find(k => k.pola_key === p.nama)?.parameter_skema ?? {}
        return (
          <div key={i} className="rounded-lg border border-input p-3 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <MedanPilih
                id={`pola-${i}-nama`} judul="Pola" nilai={p.nama} opsi={opsiJenis}
                ubah={v => ubah(i, { ...p, nama: v, parameter: {} })}
              />
              {Object.entries(skema).map(([nama, s]) => (
                <MedanTeks
                  key={nama} id={`pola-${i}-${nama}`} judul={s.label}
                  nilai={p.parameter[nama] ?? ''}
                  ubah={v => ubah(i, { ...p, parameter: { ...p.parameter, [nama]: v } })}
                />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <MedanTeks
                id={`pola-${i}-sejak`} judul="Berlaku sejak" tipe="date"
                nilai={p.berlaku_sejak} ubah={v => ubah(i, { ...p, berlaku_sejak: v })}
              />
              <MedanTeks
                id={`pola-${i}-sampai`} judul="Berlaku sampai" tipe="date"
                nilai={p.berlaku_sampai} ubah={v => ubah(i, { ...p, berlaku_sampai: v })}
                petunjuk="Kosong = masih berlaku"
              />
            </div>
            <MedanTeks
              id={`pola-${i}-sumber`} judul="Sumber" nilai={p.sumber}
              ubah={v => ubah(i, { ...p, sumber: v })}
              contoh="mis. PMK 81/2024 — Coretax, berlaku 1 Jan 2025"
            />
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => hapus(i)}>Hapus pola ini</Button>
            </div>
          </div>
        )
      })}

      <div>
        <Button variant="outline" size="sm" onClick={tambah}>+ Tambah pola</Button>
      </div>

      <Bantuan isi={
        'Isian pendaftar sah bila cocok dengan salah satu pola yang masih berlaku pada tanggal ia mendaftar. ' +
        'Menambah pola baru tidak membuat data lama menjadi tidak sah. Daftar pilihan Pola di atas adalah data, ' +
        'bukan bagian dari program — Anda dapat menambah jenis pola baru sendiri di Konfigurasi › Pola Isian.'
      } />
    </div>
  )
}
