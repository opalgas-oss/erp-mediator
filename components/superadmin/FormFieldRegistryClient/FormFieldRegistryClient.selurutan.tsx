// components/superadmin/FormFieldRegistryClient/FormFieldRegistryClient.selurutan.tsx
// Sel kolom "Urutan": nomor + tombol naik/turun. Lahir: Sesi #492.
//
// 🔴 DIPECAH SEBELUM BERKAS MENDARAT (ATURAN 53.1 + 50.2): `FormFieldRegistryClient.tabel.tsx`
//   terukur 8.524 B = 83,2% plafon kode 10.240 B begitu kolom Urutan masuk — DI ATAS ambang
//   tindakan 8.192 B. Diukur, bukan ditaksir; dipecah sekarang, bukan dicatat sebagai hutang.
//
// Bentuk tombolnya MENGIKUTI mockup v3 yang Philips setujui, ⛔ bukan `Button` shadcn — S4 §2
//   mewajibkan shadcn "jika sudah tersedia", tetapi ATURAN 55.2/55.4 melarang mengubah tampilan
//   yang SUDAH dilihat dan disetujui Philips tanpa kalimat yang membukanya. Persetujuan itu
//   yang lebih kuat di sini. Warna dari CSS variable (S2), jarak kelipatan 4px (S1 §2),
//   font 11px — batas bawah yang S1 §1.3 izinkan.

import { TableCell } from '@/components/ui/table'
import { bisaNaik, bisaTurun } from './FormFieldRegistryClient.urutan'

const KELAS_BTN_URUT =
  'h-4 w-5 rounded-[4px] border bg-white text-[11px] leading-none ' +
  'disabled:opacity-35 disabled:cursor-default'
const GAYA_BTN_URUT = {
  borderColor: 'var(--color-border-container)',
  color:       'var(--color-text-secondary)',
}
const GAYA_SEKUNDER = { color: 'var(--color-text-secondary)' }

export function SelUrutan({
  label, urutan, berubah, indeks, jumlah, naikkan, turunkan,
}: {
  label:    string
  urutan:   number
  berubah:  boolean
  indeks:   number
  jumlah:   number
  naikkan:  () => void
  turunkan: () => void
}) {
  return (
    <TableCell className="text-center">
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-1">
          <button
            type="button"
            className={KELAS_BTN_URUT}
            style={GAYA_BTN_URUT}
            disabled={!bisaNaik(indeks)}
            onClick={naikkan}
            aria-label={`Naikkan ${label}`}
          >
            ▲
          </button>
          <button
            type="button"
            className={KELAS_BTN_URUT}
            style={GAYA_BTN_URUT}
            disabled={!bisaTurun(indeks, jumlah)}
            onClick={turunkan}
            aria-label={`Turunkan ${label}`}
          >
            ▼
          </button>
        </div>
        <span
          className={`block text-[11px] ${berubah ? 'font-semibold' : ''}`}
          style={berubah ? { color: 'var(--color-warning-text)' } : GAYA_SEKUNDER}
          data-nomor-urut={urutan}
        >
          {urutan}
        </span>
      </div>
    </TableCell>
  )
}
