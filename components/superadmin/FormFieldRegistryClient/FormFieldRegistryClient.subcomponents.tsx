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

import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ICON_STATUS }       from '@/lib/constants/icons.constant'
import { SAKLAR }            from './FormFieldRegistryClient.kontrak'
import type { FormFieldGroupData, SaklarKey, PeringatanBaris } from './FormFieldRegistryClient.kontrak'

const WarningIcon = ICON_STATUS.warning

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

/** Tabel satu kartu. Isinya baris 225-277 berkas asal, byte-exact. */
function TabelKolom({
  group,
  idDitandai,
  geser,
}: {
  group:      FormFieldGroupData
  idDitandai: Set<string>
  geser:      (fieldId: string, key: SaklarKey, nilai: boolean) => void
}) {
  return (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[220px]">Kolom Formulir</TableHead>
                  <TableHead className="w-[110px]">Tipe</TableHead>
                  {SAKLAR.map(s => (
                    <TableHead key={s.key} className="w-[96px] text-center" title={s.keterangan}>
                      {s.judul}
                    </TableHead>
                  ))}
                  <TableHead className="min-w-[220px]">Dasar hukum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {group.fields.map(field => (
                  <TableRow key={field.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm text-slate-800 flex items-center gap-1.5">
                          {field.label}
                          {idDitandai.has(field.id) ? (
                            <span
                              className="inline-flex shrink-0"
                              title="Kolom formulir ini punya dasar hukum dan saklarnya sedang Anda matikan"
                            >
                              <WarningIcon
                                className="w-4 h-4 text-amber-700"
                                role="img"
                                aria-label="Punya dasar hukum dan saklarnya sedang dimatikan"
                              />
                            </span>
                          ) : null}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">{field.field_key}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">{field.tipe_input}</TableCell>
                    {SAKLAR.map(s => (
                      <TableCell key={s.key} className="text-center">
                        <Switch
                          checked={field[s.key]}
                          onCheckedChange={v => geser(field.id, s.key, v)}
                          aria-label={`Saklar ${s.judul} — ${field.label}`}
                        />
                      </TableCell>
                    ))}
                    <TableCell className="text-xs text-slate-500 leading-relaxed">
                      {field.dasar_hukum || <span className="text-slate-300">—</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
  )
}

// Ekspor ditambahkan S#489 supaya induk bisa memakainya.
// Baris terpindah di atas TIDAK disentuh (uji balik byte-identik).
export { KotakPeringatan, TabelKolom }
