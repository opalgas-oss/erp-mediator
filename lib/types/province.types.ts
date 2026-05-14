// lib/types/province.types.ts
// Tipe data untuk provinces, cities, dan assignment_coverage_areas
// Dibuat: Sesi #143 — M6 Coverage Area Revamp

// ─── Literal Types ────────────────────────────────────────────────────────────

export type CityType = 'kota' | 'kabupaten'

// ─── Entitas: Province ────────────────────────────────────────────────────────

export interface Province {
  id:         string
  code:       string       // kode BPS: '11', '32', dst
  name:       string
  sort_order: number
  is_active:  boolean
  created_at: string
}

// ─── Entitas: City ────────────────────────────────────────────────────────────

export interface City {
  id:          string
  province_id: string
  code:        string | null
  name:        string
  type:        CityType
  sort_order:  number
  is_active:   boolean
  created_at:  string
}

// ─── Province dengan Cities (untuk combobox 2-level) ─────────────────────────

export interface ProvinceWithCities extends Province {
  cities: City[]
}

// ─── Coverage Area Entry (satu baris di assignment_coverage_areas) ────────────

export interface CoverageAreaEntry {
  id?:           string       // UUID dari DB (ada setelah tersimpan)
  assignment_id?: string
  province_id:   string
  province_name: string       // denormalized untuk display
  city_id:       string | null
  city_name:     string | null // null = "Semua Kota"
}

// ─── Coverage Selection (state di UI dialog sebelum disimpan) ─────────────────

export interface CoverageSelection {
  province_id:   string
  province_name: string
  city_id:       string | null  // null = Semua Kota
  city_name:     string | null
}

// ─── Payload: Simpan coverage areas (kirim ke API assign) ────────────────────

export interface CoverageAreaPayload {
  province_id: string
  city_id:     string | null   // null = Semua Kota
}

// ─── Province dengan availability status (untuk filter exclusion) ─────────────

export type ProvinceAvailability =
  | 'tersedia'         // bebas, tidak ada conflict
  | 'sebagian'         // sebagian kota masih tersedia
  | 'penuh'            // seluruh provinsi sudah diambil tenant lain

export interface ProvinceOption extends Province {
  availability:       ProvinceAvailability
  excluded_city_ids:  string[]  // ID kota yang sudah diambil tenant lain
  all_cities_taken:   boolean   // true = tidak ada kota tersisa
}

export interface CityOption extends City {
  is_excluded: boolean  // true = sudah diambil tenant lain untuk kategori ini
}
