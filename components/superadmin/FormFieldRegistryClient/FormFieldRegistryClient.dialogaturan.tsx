// components/superadmin/FormFieldRegistryClient/FormFieldRegistryClient.dialogaturan.tsx
// Bagian ATURAN PENGISIAN di dalam dialog Sunting — medannya mengikuti `tipe_input`.
// Dibuat: Sesi #493 — butir 1b, K-488-T4 + K-488-T5.
//
// 🔴 DIPECAH DARI `.dialog.tsx` SEBELUM MENDARAT (ATURAN 54.3): gabungannya 7.524 B = 73,5%
//   plafon kode, sedangkan berkas yang LAHIR wajib maksimal 50%. Sumbu = ALASAN BERUBAH:
//   kerangka dialog di `.dialog.tsx` · aturan per tipe di sini — ia yang berubah tiap satu
//   penegak baru lahir.
// ⛔ Tipe yang NOL medan di sini bukan kelalaian — lihat `medanUntukTipe` di `.kontrak.ts`:
//   dialog dilarang menawarkan pengaturan yang belum punya penegak (K-492-T8 · ATURAN 34).

import type { FormFieldPolaPublik } from '@/lib/types/form-field-pola.types'
import type { DraftSunting, MedanDialog, PolaBaris } from './FormFieldRegistryClient.kontrak'
import { adaMedanAturan } from './FormFieldRegistryClient.kontrak'
import { Bantuan, MedanPilih, MedanTeks, SubJudul } from './FormFieldRegistryClient.dialogmedan'
import { DaftarPola } from './FormFieldRegistryClient.dialogpola'

export function BagianAturan({
  tipe, medan, draft, setDraft, katalogPola, opsiKolom,
}: {
  tipe:        string
  medan:       MedanDialog
  draft:       DraftSunting
  setDraft:    (d: DraftSunting) => void
  katalogPola: FormFieldPolaPublik[]
  opsiKolom:   { nilai: string; label: string }[]
}) {
  const ubahPola = (i: number, p: PolaBaris): void =>
    setDraft({ ...draft, pola: draft.pola.map((lama, j) => (j === i ? p : lama)) })

  return (
    <>
      {medan.pola ? (
        <>
          <SubJudul isi="Pola isian yang diterima" />
          <DaftarPola
            daftar={draft.pola} katalog={katalogPola} ubah={ubahPola}
            hapus={i => setDraft({ ...draft, pola: draft.pola.filter((_, j) => j !== i) })}
            tambah={() => setDraft({
              ...draft,
              pola: [...draft.pola, {
                nama: katalogPola[0]?.pola_key ?? '', parameter: {},
                berlaku_sejak: '', berlaku_sampai: '', sumber: '',
              }],
            })}
          />
        </>
      ) : null}

      {medan.panjang ? (
        <>
          <SubJudul isi="Batas panjang isian" />
          <div className="grid grid-cols-2 gap-3">
            <MedanTeks id="sunting-min-len" judul="Panjang minimum" nilai={draft.min_len}
              ubah={v => setDraft({ ...draft, min_len: v })} contoh="kosong = tidak dibatasi" />
            <MedanTeks id="sunting-max-len" judul="Panjang maksimum" nilai={draft.max_len}
              ubah={v => setDraft({ ...draft, max_len: v })} contoh="kosong = tidak dibatasi" />
          </div>
        </>
      ) : null}

      {medan.pilihan ? (
        <>
          <SubJudul isi="Jumlah pilihan" />
          <div className="grid grid-cols-2 gap-3">
            <MedanTeks id="sunting-min-items" judul="Pilihan minimum" nilai={draft.min_items}
              ubah={v => setDraft({ ...draft, min_items: v })} contoh="kosong = tidak dibatasi" />
            <MedanTeks id="sunting-max-items" judul="Pilihan maksimum" nilai={draft.max_items}
              ubah={v => setDraft({ ...draft, max_items: v })} contoh="kosong = tidak dibatasi" />
          </div>
          <Bantuan isi="Isi pilihannya dikelola di Master Dropdown, bukan di sini." />
        </>
      ) : null}

      {medan.tampilan ? (
        <>
          <SubJudul isi="Tampilan isian" />
          <MedanPilih
            id="sunting-tampilan" judul="Cara nilai ditampilkan kembali" nilai={draft.tampilan}
            ubah={v => setDraft({ ...draft, tampilan: v === 'disamarkan' ? 'disamarkan' : 'apa_adanya' })}
            opsi={[
              { nilai: 'apa_adanya', label: 'Apa adanya' },
              { nilai: 'disamarkan', label: 'Disamarkan (hanya 4 karakter terakhir)' },
            ]}
            petunjuk="Penyamaran hanya di layar; nilai yang tersimpan tetap utuh dan muncul kembali saat medan disentuh."
          />
        </>
      ) : null}

      {medan.samaDengan ? (
        <MedanPilih
          id="sunting-sama-dengan" judul="Harus sama dengan kolom" nilai={draft.harus_sama_dengan}
          ubah={v => setDraft({ ...draft, harus_sama_dengan: v })} opsi={opsiKolom}
          petunjuk="Hanya kolom teks di formulir yang sama. Bila kolom itu tidak ikut tampil, aturan ini dilewati — formulir tidak dibuat buntu."
        />
      ) : null}

      {medan.wajibCentang ? (
        <label className="flex items-start gap-2 text-sm cursor-pointer">
          <input type="checkbox" className="h-4 w-4 mt-0.5" checked={draft.harus_true}
            onChange={e => setDraft({ ...draft, harus_true: e.target.checked })} />
          <span>Wajib dicentang — pendaftar tidak bisa lanjut tanpa mencentangnya</span>
        </label>
      ) : null}

      {!adaMedanAturan(medan) ? (
        <Bantuan isi={
          `Kolom bertipe "${tipe}" belum punya aturan pengisian yang bisa disunting: penegaknya ` +
          'belum ada di aplikasi. Namanya tetap bisa Anda ubah di atas.'
        } />
      ) : null}
    </>
  )
}
