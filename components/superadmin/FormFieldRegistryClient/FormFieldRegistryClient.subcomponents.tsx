// components/superadmin/FormFieldRegistryClient/FormFieldRegistryClient.subcomponents.tsx
// ---------------------------------------------------------------------------
// Lahir: Sesi #489 - pemecahan `components/superadmin/FormFieldRegistryClient.tsx`
//   (13.266 B = 129,55% plafon kode 10.240 B, hutang #97). Commit tersendiri,
//   NOL perubahan perilaku. Bentuk folder + `index.ts` sebagai MASTER: ATURAN 50.5
//   (>=3 pecahan WAJIB folder + MASTER; pasal itu menyebut kode secara eksplisit).
//   Isi di bawah DIPINDAH byte-exact oleh program dari berkas asal - nol karakter
//   diketik ulang, nol kalimat diringkas, urutan asli dipertahankan.
//   Arsip byte-exact asal: _arsip/coding-history/sesi-489-pecah-form-field-registry-client/
// ISI BERKAS INI: baris 72, 74-103, dan 225-277 berkas asal.
// ---------------------------------------------------------------------------
//   R3: `TabelKolom` mengembalikan <Table> LANGSUNG - nol <div>, nol Fragment.
//   R7/R8: kelas warna `amber-*` dan piksel mati `min-w-[220px]`/`w-[110px]`/`w-[96px]`
//   sengaja DIPERTAHANKAN (hutang #100/#101/#87, ATURAN 61.2).
//   Prop `group` (bukan `fields`): baris 239 asal berbunyi `group.fields.map(...)`,
//   dan mengubahnya berarti menyentuh isi terpindah. Koreksi atas rencana S#488.

import type { PeringatanBaris } from './FormFieldRegistryClient.kontrak'

/**
 * Kotak peringatan. Dirender DUA KALI dengan isi identik: di ujung atas panel (bentuk lama,
 * tidak diubah) dan sekali lagi tepat sebelum baris tombol Simpan — H-484-A.
 * ⚠️ Warna sengaja tetap `amber-*` seperti bentuk yang sudah dilihat Philips (ATURAN 55.2/61.2).
 */
function KotakPeringatan({ daftar }: { daftar: PeringatanBaris[] }) {
  if (daftar.length === 0) return null

  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3">
      <p className="text-sm font-medium text-amber-900">
        {daftar.length} kolom formulir yang saklarnya Anda matikan punya dasar hukum.
        Perubahan tetap bisa disimpan.
      </p>
      <ul className="mt-2 space-y-1">
        {daftar.map(p => (
          <li key={p.field.id} className="text-xs text-amber-800 leading-relaxed">
            <span className="font-medium">{p.field.label}</span>{' '}
            <span className="font-mono">({p.field.field_key})</span>
            {' — saklar '}
            <span className="font-medium">{p.dimatikan.join(' + ')}</span>
            {' dimatikan — '}
            {p.field.dasar_hukum}
            {p.field.catatan_risiko ? <span className="block text-amber-700">{p.field.catatan_risiko}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  )
}

// Ekspor ditambahkan S#489 supaya induk bisa memakainya.
// Baris terpindah di atas TIDAK disentuh (uji balik byte-identik).
// S#492: `TabelKolom` DIPINDAH ke `FormFieldRegistryClient.tabel.tsx` — sebabnya di kepala
//   berkas itu. Yang tinggal di sini hanya kotak peringatan.
export { KotakPeringatan }
