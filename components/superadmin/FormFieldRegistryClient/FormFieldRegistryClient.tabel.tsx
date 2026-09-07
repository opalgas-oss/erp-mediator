// components/superadmin/FormFieldRegistryClient/FormFieldRegistryClient.tabel.tsx
// Tabel satu kartu pada panel "Kolom Formulir".
// Lahir: Sesi #492, dari pemecahan `FormFieldRegistryClient.subcomponents.tsx`.
//
// 🔴 SEBAB PEMECAHANNYA DIHITUNG SEBELUM SATU BARIS DITAMBAHKAN (ATURAN 53.1): berkas asal
//   6.062 B; menambahkan kolom Urutan + tombol naik/turun ke dalamnya menjadikannya ±7,9 KB
//   = ±77% plafon kode 10.240 B — mendekati ambang tindakan 8.192 B tanpa alasan.
//   Isi `TabelKolom` di bawah DIPINDAH oleh program dari berkas asal — nol karakter diketik
//   ulang — lalu kolom Urutan ditambahkan di sini.
//   Arsip byte-exact asal: _arsip/coding-history/sesi-492-urutan-baris/
//
// ⛔ R7/R8 S#489 MASIH BERLAKU: kelas warna `amber-*` dan piksel mati `min-w-[220px]` /
//   `w-[110px]` / `w-[96px]` pada kolom LAMA sengaja DIPERTAHANKAN (hutang #100/#101/#87,
//   ATURAN 61.2). Kolom BARU wajib patuh S1/S2/S4/S5 sejak baris pertama — lebar `ch`,
//   warna dari CSS variable, font minimum 11px.

import type React from 'react'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ICON_STATUS } from '@/lib/constants/icons.constant'
import { SAKLAR }      from './FormFieldRegistryClient.kontrak'
import { SelUrutan } from './FormFieldRegistryClient.selurutan'
import type { FormFieldGroupData, SaklarKey } from './FormFieldRegistryClient.kontrak'

const WarningIcon = ICON_STATUS.warning

/** Tabel satu kartu. Isinya baris 225-277 berkas asal, byte-exact. */
function TabelKolom({
  group,
  idDitandai,
  geser,
  urutanAsli,
  naikkanBaris,
  turunkanBaris,
  seretBaris,
}: {
  group:         FormFieldGroupData
  idDitandai:    Set<string>
  geser:         (fieldId: string, key: SaklarKey, nilai: boolean) => void
  /** Nilai `urutan` sebelum disentuh — dipakai menandai nomor yang berubah. */
  urutanAsli:    Map<string, number>
  naikkanBaris:  (groupKey: string, indeks: number) => void
  turunkanBaris: (groupKey: string, indeks: number) => void
  seretBaris:    (groupKey: string, dari: number, ke: number) => void
}) {
  const mulaiSeret = (e: React.DragEvent, indeks: number): void => {
    e.dataTransfer.setData('text/plain', String(indeks))
    e.dataTransfer.effectAllowed = 'move'
  }
  const jatuhkan = (e: React.DragEvent, ke: number): void => {
    e.preventDefault()
    const dari = Number(e.dataTransfer.getData('text/plain'))
    // Seret dari kartu lain memulangkan NaN ⇒ ditolak DIAM, nol galat (K-487-T4).
    if (Number.isInteger(dari)) seretBaris(group.group_key, dari, ke)
  }

  return (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="text-center"
                    style={{ width: '8ch' }}
                    title="Seret baris, atau pakai tombol naik/turun, untuk mengubah urutannya di formulir pendaftaran"
                  >
                    Urutan
                  </TableHead>
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
                {group.fields.map((field, indeks) => (
                  <TableRow
                    key={field.id}
                    draggable
                    onDragStart={e => mulaiSeret(e, indeks)}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => jatuhkan(e, indeks)}
                    className="cursor-grab"
                  >
                    <SelUrutan
                      label={field.label}
                      urutan={field.urutan}
                      berubah={urutanAsli.get(field.id) !== field.urutan}
                      indeks={indeks}
                      jumlah={group.fields.length}
                      naikkan={() => naikkanBaris(group.group_key, indeks)}
                      turunkan={() => turunkanBaris(group.group_key, indeks)}
                    />
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

export { TabelKolom }
