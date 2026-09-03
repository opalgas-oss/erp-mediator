// components/register/RegisterClient/RegisterClient.subcomponents.tsx
// ---------------------------------------------------------------------------
// Lahir: Sesi #489 — pemecahan `components/register/RegisterClient.tsx`
//   (9.941 B = 97,08% plafon kode 10.240 B — sisa 299 B; hutang #97).
//   Commit tersendiri, NOL perubahan perilaku. Bentuk folder + `index.ts` sebagai
//   MASTER: ATURAN 50.5, sama dengan pemecahan FormFieldRegistryClient di sesi ini.
//   Isi di bawah DIPINDAH byte-exact oleh program dari berkas asal — nol karakter
//   diketik ulang, nol kalimat diringkas, urutan asli dipertahankan.
//   Arsip byte-exact asal: _arsip/coding-history/sesi-489c-pecah-register-client/
// ISI BERKAS INI: baris 186–225 berkas asal — kerangka kartu + isian + centang.
// ---------------------------------------------------------------------------
//   Ketiganya dipindah apa adanya: nol elemen ditambah, nol kelas diubah, nol angka
//   piksel dirapikan (ATURAN 61.2). `React.ReactNode` dipakai tanpa impor React,
//   sama seperti asalnya — UMD global sah di posisi TIPE.

import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Input }  from '@/components/ui/input'
import { Label }  from '@/components/ui/label'
import { TYPOGRAPHY } from '@/lib/constants/ui-tokens.constant'

function Kerangka({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f9fafb] flex items-start justify-center px-4 py-8">
      <Card className="w-full max-w-[520px]">
        <CardHeader>
          <CardTitle className="text-center">Pendaftaran Vendor / Mitra</CardTitle>
          <p className={`${TYPOGRAPHY.muted} text-center`}>
            Pendaftaran Pelanggan belum dibuka di halaman ini.
          </p>
        </CardHeader>
        {children}
      </Card>
    </div>
  )
}

function Isian({ label, id, nilai, galat, onUbah, tipe = 'text' }: {
  label: string; id: string; nilai: string; galat?: string
  onUbah: (v: string) => void; tipe?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className={TYPOGRAPHY.label}>
        {label}<span className="text-[#A32D2D]"> *</span>
      </Label>
      <Input id={id} type={tipe} value={nilai} onChange={(e) => onUbah(e.target.value)} />
      {galat && <span className={TYPOGRAPHY.error}>{galat}</span>}
    </div>
  )
}

function Centang({ teks, nilai, onUbah }: { teks: string; nilai: boolean; onUbah: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-2 text-[12px] leading-relaxed cursor-pointer">
      <input type="checkbox" checked={nilai} onChange={(e) => onUbah(e.target.checked)}
             className="h-4 w-4 mt-0.5 shrink-0" />
      <span>{teks}</span>
    </label>
  )
}

// Ekspor ditambahkan S#489 supaya induk bisa memakainya.
// Baris terpindah di atas TIDAK disentuh (uji balik byte-identik).
export { Kerangka, Isian, Centang }
