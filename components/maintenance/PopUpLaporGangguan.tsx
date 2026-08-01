'use client'

// components/maintenance/PopUpLaporGangguan.tsx
// Kotak Pop Up hasil pelaporan gangguan — DUA varian dalam SATU komponen.
//
// Dibuat: Sesi #428 — LANGKAH 1 bagian D K-424-5.
// Acuan visual: `04_Mockup_UI/00_Global/Mockup_PopUp_LaporGangguan_S425.html` — DISETUJUI Philips
// (K-425-4). Gerbang ATURAN 45 + LL#9 + K-417-7 sudah terbuka untuk kedua Pop Up ini.
//
// ⛔ YANG MENGIKAT (K-425-1) — jangan diputuskan ulang:
//   · Dasar komponen = `components/ui/dialog.tsx` (shadcn/radix), BUKAN `sonner`.
//     `sonner` memang DIBUAT untuk hilang sendiri; Pop Up ini justru tidak boleh hilang sendiri,
//     karena kode laporan di dalamnya akan ikut hilang sebelum sempat dicatat pengunjung.
//   · TANPA timer, TANPA hitungan mundur. Philips verbatim S#425:
//     *"pake aja tombol Ok / Close, untuk tutup Pop Up, lebi mudah dan simple."*
//   · Ikon dari `icons.constant.ts` (ATURAN 29) — `ICON_STATUS.success` (CheckCircle2) dan
//     `ICON_STATUS.info` (Info). DILARANG impor langsung dari `lucide-react`.
//
// KENAPA SATU KOMPONEN UNTUK DUA VARIAN, bukan dua berkas:
//   Keduanya identik struktur — lingkaran ikon, judul, isi, kotak kode, tombol tutup. Yang beda
//   hanya warna + dua teks. Memecahnya jadi dua berkas melahirkan dua salinan tata letak yang
//   akan drift begitu salah satu disentuh (kelas `TEMUAN-NORMALISASI-WA-EMPAT-RUMAH`, S#424).
//
// KENAPA `showCloseButton={false}`:
//   `DialogContent` bawaan memasang tombol X di pojok kanan atas. Mockup yang DISETUJUI tidak
//   punya X — satu-satunya jalan keluar adalah tombol Tutup. Dua jalan keluar untuk satu kotak
//   sesederhana ini menambah pilihan tanpa menambah kemampuan.
//
// ⚠️ TIGA SELISIH ANTARA `dialog.tsx` BAWAAN DAN STANDAR S1/S4 — DITIMPA DI SINI, TIDAK DIDIAMKAN:
//   1. Sudut: bawaan `rounded-xl` (12px); S1 §3.1 menetapkan dialog = 8px → `rounded-lg`.
//   2. Lebar: bawaan `sm:max-w-sm` (384px); S4 §7 "konfirmasi / form kecil" = `sm:max-w-md` (448px).
//   3. Ukuran teks: bawaan `text-sm` (14px); S1 §1.2 teks konten = 13px.
//   Ketiganya ditimpa lewat className DI SINI, BUKAN dengan mengubah `dialog.tsx` — berkas itu
//   dipakai banyak halaman lain dan mengubahnya = overreach (ATURAN 5). Selisihnya dilaporkan
//   terbuka ke Philips supaya bisa diputuskan sebagai standar, bukan ditambal diam-diam.

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button }      from '@/components/ui/button'
import { ICON_STATUS } from '@/lib/constants/icons.constant'
import type { TeksPopUpLaporan } from '@/lib/types/lapor-gangguan.type'

// ─── Tipe ─────────────────────────────────────────────────────────────────────

/**
 * `terkirim` = respons API `barisBaru: true` — laporan melahirkan baris baru (Pop Up 1).
 * `ditahan`  = respons API `barisBaru: false` — PENAHANAN PER-PROFIL (Pop Up 2).
 *
 * ⛔ Istilah "dedup" DILARANG untuk jalur ini (K-425-3). Sebutan yang benar: penahanan per-profil.
 *    Bukan soal selera kata — bungkus istilah yang keliru adalah jalan masuk kembalinya jendela
 *    waktu yang sudah Philips cabut.
 */
export type VarianPopUpLaporan = 'terkirim' | 'ditahan'

export interface PopUpLaporGangguanProps {
  terbuka:     boolean
  varian:      VarianPopUpLaporan
  /** Kode laporan dari respons API. Kosong ⇒ kotak kode tidak dirender sama sekali. */
  kodeLaporan: string
  teks:        TeksPopUpLaporan
  /** Dipanggil saat kotak ditutup — HANYA oleh aksi pengguna, tidak pernah oleh waktu. */
  onTutup:     () => void
}

// ─── Gaya per varian (warna semantik S2, lewat CSS variable — nol hex literal) ─

const GAYA = {
  terkirim: {
    Ikon:   ICON_STATUS.success,          // CheckCircle2
    bg:     'var(--color-success-bg)',
    border: 'var(--color-success-border)',
    warna:  'var(--color-success-text)',
  },
  ditahan: {
    Ikon:   ICON_STATUS.info,             // Info
    bg:     'var(--color-info-bg)',
    border: 'var(--color-info-border)',
    warna:  'var(--color-info-text)',
  },
} as const

// ─── Komponen ─────────────────────────────────────────────────────────────────

export function PopUpLaporGangguan({
  terbuka,
  varian,
  kodeLaporan,
  teks,
  onTutup,
}: PopUpLaporGangguanProps) {
  const gaya  = GAYA[varian]
  const Ikon  = gaya.Ikon
  const judul = varian === 'terkirim' ? teks.judulTerkirim : teks.judulDitahan
  const isi   = varian === 'terkirim' ? teks.isiTerkirim   : teks.isiDitahan

  return (
    <Dialog
      open={terbuka}
      onOpenChange={(terbukaBaru) => {
        // Radix memanggil ini juga saat Esc / klik latar. Keduanya tetap AKSI PENGGUNA,
        // jadi sah menutup — yang dilarang K-425-1 adalah penutupan oleh WAKTU.
        if (!terbukaBaru) onTutup()
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="gap-0 rounded-lg p-5 text-[13px] sm:max-w-md"
      >
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-[0.5px]"
            style={{ background: gaya.bg, borderColor: gaya.border, color: gaya.warna }}
          >
            <Ikon size={19} strokeWidth={2} />
          </span>

          <div className="min-w-0">
            <DialogTitle className="text-[16px] leading-[1.4] font-semibold text-[color:var(--color-text-primary)]">
              {judul}
            </DialogTitle>

            <DialogDescription className="mt-2 text-[13px] leading-[1.6] font-normal text-[color:var(--color-text-primary)]">
              {isi}
            </DialogDescription>
          </div>
        </div>

        {/*
          Kotak kode laporan. Dipisah dari kalimat isi atas revisi Philips K-425-4 — dulu
          `{kode_error}` menempel di dalam teks `error_report_success`. Dipisah supaya kodenya
          bisa disalin tanpa ikut menyeret kalimat, dan supaya labelnya tetap terbaca jelas.
          Digerbangi isi: nol kode ⇒ kotak tidak dirender (pola §6.3 — tidak memajang wadah kosong).
        */}
        {kodeLaporan !== '' && (
          <div
            className="mt-3.5 rounded-lg border-[0.5px] px-3 py-2.5"
            style={{
              background:  'var(--color-neutral-bg)',
              borderColor: 'var(--color-neutral-border)',
            }}
          >
            <p className="text-[11px] font-normal text-[color:var(--color-text-secondary)]">
              {teks.labelKode}
            </p>
            <p className="mt-0.5 font-mono text-[13px] font-medium break-all text-[color:var(--color-text-primary)]">
              {kodeLaporan}
            </p>
          </div>
        )}

        {/*
          Kaki kotak ditulis sebagai <div> biasa, BUKAN <DialogFooter>. Alasannya mekanis, bukan
          selera: `DialogFooter` bawaan membawa `-mx-4 -mb-4` + `bg-muted/50`, dua-duanya
          bertabrakan dengan tata letak p-5 dan dengan mockup yang DISETUJUI (kaki berlatar putih).
          Menimpanya lewat className berarti mengandalkan urutan penggabungan kelas Tailwind —
          taruhan yang tidak perlu untuk empat baris gaya yang bisa ditulis lugas di sini.
        */}
        <div className="-mx-5 -mb-5 mt-4 flex justify-end rounded-b-lg border-t border-[color:var(--color-border-container)] px-5 py-3.5">
          <DialogClose asChild>
            <Button variant="default" className="h-auto px-4 py-2 text-[13px] font-medium">
              {teks.tombolTutup}
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  )
}
