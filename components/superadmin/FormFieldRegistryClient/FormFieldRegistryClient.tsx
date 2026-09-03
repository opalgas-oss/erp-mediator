'use client'

// components/superadmin/FormFieldRegistryClient.tsx
// Panel KOLOM pada halaman konfigurasi formulir SuperAdmin.
// Satu BARIS = satu kolom formulir. Tiap baris punya empat SAKLAR: Tampil · Wajib · Verifikasi · Aktif.
//
// Dibuat: Sesi #483 — K-483-4 (Philips). Verbatim: "kamu tampilkan dulu juga tidak masalah,
//   suatu saat tidak diperlukan cukup disable/tidak di tampilkan, ini semua harus bisa di
//   maintaince oleh SA, lewat dashboard".
//
// Direvisi: Sesi #484 atas perintah Philips — verbatim: "perbaiki kedua nya sekarang".
//   Kalimat itu membuka DUA hal, dan hanya dua (ATURAN 55.4):
//   H-484-A  Philips mengklik saklar Tampil di kartu Legalitas lalu melapor: "tidak ada kotak
//            kuning yang muncul". Kotaknya ada, tetapi hanya berdiri di ujung ATAS panel.
//            ⇒ (1) kotak yang sama diulang tepat sebelum baris tombol Simpan, (2) penanda ⚠
//            pada baris yang terkena — di sel pertama, yang menempel kiri sehingga selalu
//            terlihat. ⛔ Apakah kotak lama benar-benar di luar pandangan TIDAK diukur dari
//            sini (nol browser, ATURAN 61.3); yang dipakai adalah laporan layar Philips.
//   H-484-B  Philips mematikan DUA saklar pada SATU baris, layar menulis "1 kolom", ia membaca
//            itu sebagai salah hitung. Sebabnya kata "kolom" menunjuk dua benda di layar yang
//            sama: BARIS formulir dan KOLOM saklar. ⇒ tiap teks hitungan kini menyebut
//            "kolom formulir" untuk baris dan "saklar" untuk saklar, dan tiap butir peringatan
//            menyebut saklar MANA yang dimatikan.
//   ⛔ TIDAK disentuh sesi ini (hutang warisan, ATURAN 61.2): kelas warna mentah `amber-*` /
//      `bg-blue-100` / `text-slate-*` yang seharusnya `var(--color-*)` (S2_WARNA), bentuk banner
//      yang menyimpang dari S4 §9, dan angka piksel mati `min-w-[220px]` / `w-[110px]` / `w-[96px]`.
//
// 🔴 DASAR HUKUM MEMBERI TAHU, TIDAK MENOLAK.
//   Saat SA mematikan saklar pada kolom yang punya `dasar_hukum`, peringatan muncul berisi dasar
//   itu — dan tombol Simpan TETAP bisa ditekan. Mengunci saklar berarti memindahkan keputusan
//   kebijakan ke dalam kode, dan itu persis yang K-483-4 larang.


// ---------------------------------------------------------------------------
// Alamat berkas ini sejak S#489: components/superadmin/FormFieldRegistryClient/
//   FormFieldRegistryClient.tsx. Baris 3 di atas menyebut alamat LAMA dan sengaja
//   TIDAK diubah - komentar sejarah DILARANG disunting demi kerapian (K-426-2).
// Pemecahan S#489 (ATURAN 50.5): keadaan -> `.hook.ts` - bentuk data + saklar ->
//   `.kontrak.ts` - kotak peringatan + tabel -> `.subcomponents.tsx`.
//   NOL perubahan perilaku: DOM sebelum dan sesudah identik.
// ---------------------------------------------------------------------------

import { Button }            from '@/components/ui/button'
import { Badge }             from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TYPOGRAPHY }        from '@/lib/constants/ui-tokens.constant'
import { ICON_STATUS }       from '@/lib/constants/icons.constant'
import { useFormFieldRegistry }         from './FormFieldRegistryClient.hook'
import { KotakPeringatan, TabelKolom }  from './FormFieldRegistryClient.subcomponents'
import type { FormFieldGroupData }      from './FormFieldRegistryClient.kontrak'

const LoadingIcon = ICON_STATUS.loading

export function FormFieldRegistryClient({
  formKey,
  initialData,
}: {
  formKey:     string
  initialData: FormFieldGroupData[]
}) {
  const {
    groups,
    saving,
    perubahan,
    peringatan,
    idDitandai,
    jumlahSaklarBerubah,
    adaPerubahan,
    geser,
    simpan,
  } = useFormFieldRegistry({ formKey, initialData })

  return (
    <div className="flex flex-col gap-4">

      <KotakPeringatan daftar={peringatan} />

      {groups.map(group => (
        <Card key={group.group_key} className="bg-white/80 backdrop-blur-sm border-slate-200 shadow-sm">
          <CardHeader className="pt-2 pb-1 px-4 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <CardTitle className={TYPOGRAPHY.cardTitle}>{group.group_key}</CardTitle>
              <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-xs border-0">
                {group.fields.length} kolom formulir
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-1 pb-2 px-0">
            <TabelKolom group={group} idDitandai={idDitandai} geser={geser} />
          </CardContent>
        </Card>
      ))}

      {/* H-484-A — peringatan yang sama diulang di sini, sebelum tombol Simpan. */}
      <KotakPeringatan daftar={peringatan} />

      <div className="flex items-center justify-end gap-3 px-1">
        {adaPerubahan && (
          <span className="text-xs text-slate-500">
            {perubahan.length} kolom formulir · {jumlahSaklarBerubah} saklar berubah
          </span>
        )}
        <Button onClick={simpan} disabled={!adaPerubahan || saving}>
          {saving ? <LoadingIcon className="w-4 h-4 mr-2 animate-spin" /> : null}
          Simpan Kolom Formulir
        </Button>
      </div>
    </div>
  )
}
