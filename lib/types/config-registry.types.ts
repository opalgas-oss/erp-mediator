// lib/types/config-registry.types.ts
// Bentuk baris `config_registry` sebagaimana dibaca aplikasi.
// Lahir S#498 dari pemecahan `lib/config-registry.ts` (13.497 B = 131,8% plafon kode 10.240 B).
// Sumbu pemecahan = ALASAN BERUBAH (ATURAN 54.2/54.4): berkas ini berubah ketika BENTUK KOLOM
//   tabel `config_registry` berubah — bukan ketika cara membacanya berubah.
// Tipe berumah di `lib/types/` mengikuti K-496-T9 + K-497-T4.
// ⛔ Isi di bawah dipindah MEKANIS oleh program — nol karakter diketik ulang.

export interface ConfigRegistryItem {
  id:         string
  policy_key: string | null
  label:      string
  nilai:      string
  tipe_data:  string
  nilai_enum: string[] | null
  is_active:  boolean
}

/**
 * Full row data config_registry untuk rendering halaman settings SA.
 * Berbeda dengan ConfigRegistryItem yang tidak punya feature_key, tenant_can_override, kategori.
 * Dipakai oleh getConfigPageItems() — fix PV-09+PV-10+proaktif S#177.
 */
export interface ConfigRegistryFullItem {
  id:                  string
  feature_key:         string
  policy_key:          string | null
  label:               string
  nilai:               string
  tipe_data:           string
  nilai_enum:          string[] | null
  tenant_can_override: boolean
  is_active:           boolean
  kategori:            string | null
}

