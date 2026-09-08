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
//
// 🔴 S#494 — HUTANG #130 DIBAYAR: kalimat "Belum ada pola" DULU BERBOHONG.
//   Kolom `nik` memuat pembatas warisan `regex: "^[0-9]{16}$"` yang tersimpan dalam bentuk
//   LAMA (kunci `regex`, bukan baris pola). `validasiSatuKolom` menegakkannya LEBIH DULU
//   daripada pola berlapis, jadi bentuk isian kolom itu memang dibatasi — sementara dialog
//   menyatakan sebaliknya kepada SuperAdmin. Yang salah bukan penegaknya, melainkan
//   kalimatnya. Sejak sekarang pembatas warisan itu DITAMPILKAN apa adanya, dan kalimat
//   "tidak dibatasi" hanya muncul kalau memang benar-benar tidak ada pembatas.

import { Button } from '@/components/ui/button'
import type { FormFieldPolaPublik } from '@/lib/types/form-field-pola.types'
import type { PolaBaris } from './FormFieldRegistryClient.kontrak'
import { Bantuan, MedanPilih, MedanTeks } from './FormFieldRegistryClient.dialogmedan'

export function DaftarPola({
  daftar, katalog, ubah, hapus, tambah, regexWarisan,
}: {
  daftar:  PolaBaris[]
  katalog: FormFieldPolaPublik[]
  ubah:    (indeks: number, baris: PolaBaris) => void
  hapus:   (indeks: number) => void
  tambah:  () => void
  /** Pembatas bentuk lama (`validasi.regex`) yang MASIH BERLAKU pada baris ini, kalau ada. */
  regexWarisan?: string
}) {
  const opsiJenis = katalog.map(k => ({ nilai: k.pola_key, label: k.label }))
  const adaWarisan = typeof regexWarisan === 'string' && regexWarisan.length > 0

  return (
    <div className="flex flex-col gap-3">
      {adaWarisan ? <PembatasWarisan ekspresi={regexWarisan!} adaPolaLain={daftar.length > 0} /> : null}

      {daftar.length === 0 && !adaWarisan ? (
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

/**
 * Pembatas warisan — DITAMPILKAN, ⛔ bukan disembunyikan (hutang #130).
 * Ia tidak disajikan sebagai baris pola yang bisa disunting, dan itu disengaja: bentuknya
 * berbeda (satu ekspresi utuh, tanpa nama/tanggal/sumber), dan menyuntingnya dari sini berarti
 * menawarkan pengaturan yang penegaknya berbeda dengan yang dijanjikan — persis yang ATURAN 34
 * larang. Yang ditawarkan hanyalah KETERANGAN JUJUR tentang apa yang sedang menjaga kolom itu.
 */
function PembatasWarisan({ ekspresi, adaPolaLain }: { ekspresi: string; adaPolaLain: boolean }) {
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 flex flex-col gap-1.5">
      <div className="text-sm font-medium text-amber-900">
        Kolom ini sudah dibatasi oleh pembatas lama
      </div>
      <div className="text-[11px] text-amber-900">
        Bentuk isian yang diterima kolom ini <strong>sudah dibatasi</strong> oleh sebuah pembatas
        yang tersimpan dalam bentuk lama, dan pembatas itu diperiksa <strong>lebih dulu</strong>
        {adaPolaLain ? ' daripada pola di bawah' : ''}. Isinya:
      </div>
      <code className="text-[11px] font-mono bg-white border border-amber-200 rounded px-2 py-1 break-all text-amber-900">
        {ekspresi}
      </code>
      <div className="text-[11px] text-amber-900">
        Pembatas ini belum bisa disunting dari layar ini. Untuk menggantinya dengan pola yang bisa
        Anda atur sendiri, tambahkan pola di bawah lalu minta pembatas lamanya dicabut.
      </div>
    </div>
  )
}
