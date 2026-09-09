// lib/utils/form-field-ketergantungan.aturan.ts
// SATU FUNGSI PER ATURAN. Dipecah dari `form-field-ketergantungan.util.ts` — S#497;
// sebab pemecahan ditulis SEKALI di induk itu (ATURAN 36).
// 🔴 Bentuk pulang tiap aturan DIKUNCI `string | null`, berhenti di pelanggaran PERTAMA —
//   orkestrator di induk bergantung pada bentuk itu. Aturan baru mengikuti pola yang sama.
// ⛔ MURNI — nol Supabase, nol `server-only`; bisa diuji tanpa menyalakan server.

import type { BarisKetergantungan } from '@/lib/types/form-field-ketergantungan.types'
import { hidup, TIPE_BISA_DIBANDINGKAN, TIPE_BUTUH_SUMBER_OPSI } from './form-field-ketergantungan.dasar'

/** R1 — kolom yang masih hidup dan membandingkan dirinya dengan kolom lain. */
export function aturanR1(
  barisSetelah: BarisKetergantungan[],
  perKunci:     Map<string, BarisKetergantungan>,
): string | null {
  // R1 — kolom yang masih hidup dan membandingkan dirinya dengan kolom lain.
  for (const x of barisSetelah) {
    if (!hidup(x)) continue
    const target = x.validasi?.harus_sama_dengan
    if (typeof target !== 'string' || target.length === 0) continue

    const y = perKunci.get(target)
    if (!y) {
      return `Kolom "${x.label}" diatur harus sama dengan kolom "${target}", tetapi kolom itu ` +
             `tidak ada lagi di formulir ini. Buka Sunting pada "${x.label}" lalu pilih ` +
             `"— tidak dibandingkan —".`
    }
    if (!hidup(y)) {
      return `"${y.label}" tidak boleh dimatikan: kolom "${x.label}" diatur harus sama dengan ` +
             `kolom itu, dan mematikannya membuat aturan tersebut berhenti berlaku tanpa ` +
             `pemberitahuan. Nyalakan kembali Tampil dan Aktif pada "${y.label}", atau buka ` +
             `Sunting pada "${x.label}" lalu pilih "— tidak dibandingkan —".`
    }
    if (!TIPE_BISA_DIBANDINGKAN.includes(y.tipe_input)) {
      return `Kolom "${x.label}" diatur harus sama dengan "${y.label}", padahal "${y.label}" ` +
             `bertipe ${y.tipe_input} yang isinya tidak bisa dibandingkan huruf per huruf. ` +
             `Buka Sunting pada "${x.label}" lalu pilih kolom teks.`
    }
  }
  return null
}

/** R2 — kolom yang APLIKASI sendiri baca. Daftarnya dari Config Registry, bukan dari kode. */
export function aturanR2(
  perKunci:        Map<string, BarisKetergantungan>,
  kunciWajibHidup: string[],
): string | null {
  // R2 — kolom yang APLIKASI sendiri baca. Daftarnya dari Config Registry, bukan dari kode.
  for (const kunci of kunciWajibHidup) {
    const b = perKunci.get(kunci)
    if (!b) continue
    if (hidup(b) && b.is_required) continue
    return `"${b.label}" tidak boleh dimatikan: aplikasi membacanya sendiri di luar formulir ` +
           `ini. Saklar Tampil, Aktif, dan Wajib pada kolom itu wajib tetap menyala. ` +
           `Daftarnya diatur di Konfigurasi › Kolom Formulir.`
  }
  return null
}

/** R3 — kolom pilihan yang hidup tetapi NOL sumber opsi. */
export function aturanR3(barisSetelah: BarisKetergantungan[]): string | null {
  // R3 — kolom pilihan yang hidup tetapi NOL sumber opsi. Lahir S#495 dari hutang #132.
  //   🔴 SEBABNYA DIUKUR, BUKAN DIRASA: `daftar_petugas_lapangan` berdiri berbulan-bulan dengan
  //   saklar Tampil MENYALA dan `sumber_opsi` NULL. `getOpsiUntukKolom` tidak pernah memasukkannya
  //   ke peta, lalu `saringKolomYangBisaDirender` membuangnya — **senyap**. Panel SA menampilkannya
  //   seolah hidup; pendaftar tidak pernah melihatnya. Itu dashboard yang berbohong, kelas yang
  //   sama persis dengan hutang #130.
  //   ⛔ Yang diperiksa HANYA "sumber opsinya kosong sama sekali" — pemeriksaan MURNI, nol I/O.
  //   Sumber yang TERISI tetapi kebetulan nol opsi SENGAJA tidak diperiksa di sini: memeriksanya
  //   menuntut panggilan Supabase pada setiap PATCH, dan pesannya terpaksa menyuruh SA mengisi
  //   sumber opsi lewat medan yang panel ini TIDAK PUNYA — cermin cacat K-492-T8.
  //   ⚠️ KOREKSI S#495 — baris ini semula meresepkan "ditutup dengan MEMBUAT grup dropdownnya".
  //   Resep itu DICABUT: diukur S#495, ia salah untuk satu-satunya penghuni kelasnya (`kbli`).
  //   Sebabnya di `KERJA_SESI_495`; `kbli` kini isian teks berpola, bukan kolom pilihan (#131).
  for (const b of barisSetelah) {
    if (!hidup(b)) continue
    if (!TIPE_BUTUH_SUMBER_OPSI.includes(b.tipe_input)) continue
    if (typeof b.sumber_opsi === 'string' && b.sumber_opsi.trim().length > 0) continue
    return `Kolom "${b.label}" bertipe pilihan tetapi belum punya sumber pilihan sama sekali, ` +
           `jadi ia TIDAK akan muncul di formulir pendaftar walau saklarnya menyala. Sumber ` +
           `pilihan belum bisa diatur dari panel ini ⇒ matikan saklar Tampil pada "${b.label}", ` +
           `atau minta pengelola mengubah tipenya menjadi isian teks bebas.`
  }
  return null
}
