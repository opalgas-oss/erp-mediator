// lib/utils/form-field-validasi.util.ts
// Penjagaan atas isi objek `validasi` satu kolom formulir.
// Dibuat: Sesi #492 — SPEK_UI_SA_PANEL_KOLOM_URUTAN_DAN_SUNTING §4 penjagaan butir 2 + 3.
//
// Lahir TERPISAH dari `form-field-patch.util.ts`, bukan sesudahnya: gabungannya terukur
// 5.488 B = 53,6% plafon kode 10.240 B, sedangkan ATURAN 54.3 mewajibkan berkas LAHIR
// maksimal 50%. Diukur sebelum berkas mendarat, bukan sesudah.
//
// 🔴 DAFTAR KUNCI TERTUTUP SUDAH DICABUT bersama K-487-T5. Yang menggantikannya:
//   tiap butir `pola` wajib memuat `nama` yang ADA sebagai `pola_key` aktif di
//   `form_field_pola` (K-488-T1b). `nama` yang tidak dikenal ⇒ 400, menyebut `id` barisnya.

function tanggalSah(nilai: unknown): boolean {
  if (typeof nilai !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(nilai)) return false
  return !Number.isNaN(Date.parse(nilai))
}

/** Angka bulat >= 0. Dipakai untuk seluruh nilai angka di dalam `validasi`. */
function bulatTakNegatif(nilai: unknown): boolean {
  return Number.isInteger(nilai) && (nilai as number) >= 0
}

/** Penjagaan butir 2 + 3 SPEK §4, dijalankan atas satu objek `validasi`. */
export function periksaValidasi(
  id:            string,
  validasi:      unknown,
  polaKeyAktif:  Set<string>,
): string | null {
  if (validasi === null || typeof validasi !== 'object' || Array.isArray(validasi)) {
    return `"validasi" pada ${id} harus objek`
  }
  const v = validasi as Record<string, unknown>

  for (const [kunci, nilai] of Object.entries(v)) {
    if (kunci === 'pola' || typeof nilai !== 'number') continue
    if (!bulatTakNegatif(nilai)) return `"${kunci}" pada ${id} harus bilangan bulat >= 0`
  }
  for (const [min, maks] of [['min_len', 'max_len'], ['min_items', 'max_items']] as const) {
    const a = v[min], b = v[maks]
    if (typeof a === 'number' && typeof b === 'number' && a > b) {
      return `"${min}" pada ${id} tidak boleh lebih besar dari "${maks}"`
    }
  }

  if (v.pola === undefined) return null
  if (!Array.isArray(v.pola)) return `"pola" pada ${id} harus larik`

  for (const butir of v.pola) {
    if (butir === null || typeof butir !== 'object' || Array.isArray(butir)) {
      return `Tiap butir "pola" pada ${id} harus objek`
    }
    const p = butir as Record<string, unknown>
    if (typeof p.nama !== 'string' || !polaKeyAktif.has(p.nama)) {
      return `Pola "${String(p.nama)}" pada ${id} tidak dikenal — pilih pola yang ada di katalog`
    }
    if (p.berlaku_sejak !== undefined && p.berlaku_sejak !== null && !tanggalSah(p.berlaku_sejak)) {
      return `"berlaku_sejak" pada ${id} harus tanggal YYYY-MM-DD`
    }
    if (p.berlaku_sampai !== undefined && p.berlaku_sampai !== null && !tanggalSah(p.berlaku_sampai)) {
      return `"berlaku_sampai" pada ${id} harus tanggal YYYY-MM-DD atau kosong`
    }
  }
  return null
}

