// components/superadmin/FormFieldRegistryClient/FormFieldRegistryClient.dialog.tsx
// Dialog "Sunting kolom formulir" — kerangka + nama yang dilihat pendaftar.
// Dibuat: Sesi #493 — butir 1b. Acuan bentuk: Mockup v3 yang Philips SETUJUI (S#488).
// Aturan pengisian per tipe tinggal di `.dialogaturan.tsx` (pemecahan ATURAN 54.3).
//
// 🔴 K-487-T7 — DIALOG BERAKHIR DENGAN "TERAPKAN", ⛔ BUKAN "SIMPAN".
//   Terapkan hanya mengubah keadaan di layar; yang menulis ke Supabase tetap satu tombol
//   `Simpan Kolom Formulir` di kaki panel. Hutang #105 (dua tombol simpan satu halaman)
//   TIDAK ditambah menjadi tiga.
// 🔴 K-488-T5 — `harus_sama_dengan` disajikan sebagai PEMILIH KOLOM, ⛔ bukan pengetikan
//   `field_key`. Yang ditawarkan hanya kolom yang benar-benar bisa dibandingkan: bertipe
//   teks, di formulir yang sama, dan bukan dirinya sendiri.

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { FormFieldPolaPublik } from '@/lib/types/form-field-pola.types'
import type { FormFieldRow } from '@/lib/types/form-field-registry.types'
import type { DraftSunting } from './FormFieldRegistryClient.kontrak'
import { medanUntukTipe } from './FormFieldRegistryClient.kontrak'
import { MedanTeks } from './FormFieldRegistryClient.dialogmedan'
import { BagianAturan } from './FormFieldRegistryClient.dialogaturan'

/** Kolom yang isinya bisa dibandingkan huruf per huruf. Gambar dan berkas tidak bisa. */
const TIPE_BISA_DIBANDINGKAN = ['text', 'textarea']

export function DialogSunting({
  baris, draft, semuaBaris, katalogPola, setDraft, tutup, terapkan,
}: {
  /** Baris yang sedang disunting. `null` = dialog tertutup. */
  baris:       FormFieldRow | null
  draft:       DraftSunting | null
  semuaBaris:  FormFieldRow[]
  katalogPola: FormFieldPolaPublik[]
  setDraft:    (d: DraftSunting) => void
  tutup:       () => void
  terapkan:    () => void
}) {
  if (!baris || !draft) return null

  const medan = medanUntukTipe(baris.tipe_input)

  const opsiKolom = [
    { nilai: '', label: '— tidak dibandingkan —' },
    ...semuaBaris
      .filter(f => f.id !== baris.id && TIPE_BISA_DIBANDINGKAN.includes(f.tipe_input))
      .map(f => ({ nilai: f.field_key, label: f.label })),
  ]

  return (
    <Dialog open onOpenChange={v => { if (!v) tutup() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Sunting kolom formulir</DialogTitle>
        </DialogHeader>
        <div className="text-[11px] font-mono px-5" style={{ color: 'var(--color-text-secondary)' }}>
          {baris.field_key} · {baris.group_key} · {baris.tipe_input}
        </div>

        <div className="max-h-[65vh] overflow-y-auto flex flex-col gap-4 p-5">
          <MedanTeks
            id="sunting-label" judul="Nama yang dilihat pendaftar" nilai={draft.label}
            ubah={v => setDraft({ ...draft, label: v })}
            petunjuk="Inilah tulisan di atas kotak isian pada formulir pendaftaran. Wajib diisi, maksimal 120 karakter."
          />
          <BagianAturan
            tipe={baris.tipe_input} medan={medan} draft={draft} setDraft={setDraft}
            katalogPola={katalogPola} opsiKolom={opsiKolom}
          />
        </div>

        <DialogFooter className="px-5 py-3.5">
          <Button variant="ghost" onClick={tutup}>Batal</Button>
          {/* Label kosong ditolak di server (400); tombolnya dimatikan supaya SA tidak
              perlu menunggu perjalanan bolak-balik untuk tahu (SPEK §4 penjagaan 1). */}
          <Button onClick={terapkan} disabled={draft.label.trim().length === 0}>Terapkan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
