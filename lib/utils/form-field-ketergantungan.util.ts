// lib/utils/form-field-ketergantungan.util.ts
// Penjagaan KETERGANTUNGAN ANTAR-KOLOM formulir. Dibuat: Sesi #494 atas perintah Philips
//   ("perbaiki saklar Tampil").
//
// 🔴 SEBAB BERKAS INI LAHIR: `form-field-patch.util.ts` memeriksa tiap patch SENDIRI-SENDIRI —
//   ia tidak pernah melihat seluruh formulir. Akibatnya SA bisa mematikan saklar Tampil pada
//   satu kolom dan MEMBUNUH DIAM-DIAM aturan kolom lain yang menunjuknya: penegak
//   `harus_sama_dengan` sengaja MELEWATI aturannya kalau kolom rujukan tidak dirender
//   (K-493-T2, supaya formulir tidak buntu). Kelonggaran itu benar untuk pendaftar, tetapi
//   ia membuat kesalahan SA tidak terlihat oleh siapa pun. Berkas ini yang membuatnya terlihat.
//
// ⛔ MURNI — nol Supabase, nol `server-only`; bisa diuji tanpa menyalakan server.
// ⛔ NOL kebijakan dibekukan: daftar kolom yang tidak boleh dimatikan DIBACA dari Config
//   Registry (`register_vendor` / `kolom_wajib_hidup`), bukan ditulis di sini.

/**
 * Tipe kolom yang isinya bisa dibandingkan huruf per huruf.
 * 🔴 RUMAH TUNGGALNYA DI SINI (ATURAN 36) — dialog Sunting mengimpornya, ⛔ tidak menyalinnya.
 * Gambar dan berkas tidak bisa dibandingkan; itulah cacat yang melahirkan hutang #128.
 */
export const TIPE_BISA_DIBANDINGKAN = ['text', 'textarea']

/**
 * Tipe kolom yang isinya DIAMBIL dari katalog, bukan diketik pendaftar.
 * 🔴 Kolom bertipe ini TANPA sumber opsi tidak akan pernah muncul di formulir — ia dibuang
 * `saringKolomYangBisaDirender` secara SENYAP. Itulah cacat yang R3 di bawah tangkap.
 */
export const TIPE_BUTUH_SUMBER_OPSI = ['select', 'multiselect']

/** Bentuk minimum satu baris yang penjagaan ini butuhkan. */
export interface BarisKetergantungan {
  id:          string
  field_key:   string
  label:       string
  tipe_input:  string
  is_visible:  boolean
  is_required: boolean
  is_active:   boolean
  validasi:    Record<string, unknown>
  /**
   * Alamat sumber opsi kolom pilihan. ⚠️ SENGAJA OPSIONAL, bukan wajib: `FormFieldRow` memuatnya
   * sehingga pemanggil boleh mengoper baris utuh apa adanya, sedangkan baris uji yang tidak
   * mengurusi kolom pilihan tidak perlu menuliskannya. Tidak hadir = diperlakukan kosong.
   */
  sumber_opsi?: string | null
}

/** Patch apa adanya dari muatan PATCH — hanya medan yang berubah yang hadir. */
export interface PatchKetergantungan {
  id:           string
  is_visible?:  boolean
  is_required?: boolean
  is_active?:   boolean
  validasi?:    Record<string, unknown>
}

/**
 * Hitung keadaan AKHIR tiap baris sesudah patch diterapkan.
 * ⚠️ WAJIB dipakai sebelum `periksaKetergantungan`: patch hanya membawa medan yang BERUBAH,
 * jadi memeriksa patch saja akan salah menilai baris yang tidak ikut dikirim.
 */
export function terapkanPatch(
  baris:   BarisKetergantungan[],
  patches: PatchKetergantungan[],
): BarisKetergantungan[] {
  const perId = new Map<string, PatchKetergantungan>()
  for (const p of patches) perId.set(p.id, p)
  return baris.map((b) => {
    const p = perId.get(b.id)
    if (!p) return b
    return {
      ...b,
      is_visible:  p.is_visible  ?? b.is_visible,
      is_required: p.is_required ?? b.is_required,
      is_active:   p.is_active   ?? b.is_active,
      validasi:    p.validasi    ?? b.validasi,
    }
  })
}

/** Kolom dianggap HIDUP di formulir hanya kalau kedua saklarnya menyala. */
function hidup(b: BarisKetergantungan): boolean {
  return b.is_visible && b.is_active
}

/**
 * Periksa keadaan AKHIR satu formulir. Memulangkan pesan galat untuk SA, atau `null` kalau sehat.
 * Pesannya sengaja menyebut LABEL (yang SA lihat di layar), ⛔ bukan `field_key`, dan menyebut
 * cara membetulkannya — bukan sekadar "tidak boleh".
 */
export function periksaKetergantungan(
  barisSetelah:    BarisKetergantungan[],
  kunciWajibHidup: string[],
): string | null {
  const perKunci = new Map<string, BarisKetergantungan>()
  for (const b of barisSetelah) perKunci.set(b.field_key, b)

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

  // R2 — kolom yang APLIKASI sendiri baca. Daftarnya dari Config Registry, bukan dari kode.
  for (const kunci of kunciWajibHidup) {
    const b = perKunci.get(kunci)
    if (!b) continue
    if (hidup(b) && b.is_required) continue
    return `"${b.label}" tidak boleh dimatikan: aplikasi membacanya sendiri di luar formulir ` +
           `ini. Saklar Tampil, Aktif, dan Wajib pada kolom itu wajib tetap menyala. ` +
           `Daftarnya diatur di Konfigurasi › Kolom Formulir.`
  }

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
