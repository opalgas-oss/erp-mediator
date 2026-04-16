// lib/config-registry.ts
// Membaca Dynamic Config Registry dari Firestore
// Path Firestore: /platform_config/config_registry/{configId}
// Dipakai untuk baca config yang sifatnya platform-wide (bukan policy per tenant)
// TODO: Tambah cache setelah lib/cache.ts selesai (Sprint 0 Task 5)

import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  limit,
  Timestamp
} from 'firebase/firestore';

// ============================================================
// TYPE DEFINITIONS
// ============================================================

/** Setiap field di dalam satu item konfigurasi */
export interface ConfigField {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select';
  value: unknown;
  default_value: unknown;
  options?: string[];           // hanya diisi kalau type = "select"
  visible_to_admin: boolean;    // SuperAdmin tentukan apakah Admin bisa lihat
  editable_by_admin: boolean;   // SuperAdmin tentukan apakah Admin bisa edit
  description?: string;
}

/** Satu item konfigurasi lengkap di Config Registry */
export interface ConfigRegistryItem {
  config_id: string;
  label: string;
  description: string;
  category: string;
  fields: Record<string, ConfigField>;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// ============================================================
// FUNGSI UTAMA
// ============================================================

/**
 * Ambil nilai satu field dari Config Registry.
 * Mengembalikan nilai aktual (value), bukan default_value.
 *
 * TODO: Tambah cache setelah lib/cache.ts selesai (Sprint 0 Task 5)
 *
 * @param configId - ID item konfigurasi (contoh: "wa_provider")
 * @param fieldKey - Key field yang diminta (contoh: "api_key")
 * @returns Nilai field yang diminta
 * @throws Error jika configId atau fieldKey tidak ditemukan
 */
export async function getConfigValue(
  configId: string,
  fieldKey: string
): Promise<unknown> {
  // Baca dokumen dari Firestore
  const configRef = doc(db, 'platform_config', 'config_registry', configId);
  const configSnap = await getDoc(configRef);

  // Kalau item tidak ada di database
  if (!configSnap.exists()) {
    throw new Error(
      `Konfigurasi '${configId}' tidak ditemukan di Config Registry`
    );
  }

  const data = configSnap.data() as ConfigRegistryItem;

  // Kalau field yang diminta tidak ada
  if (!data.fields || !(fieldKey in data.fields)) {
    throw new Error(
      `Field '${fieldKey}' tidak ditemukan di konfigurasi '${configId}'`
    );
  }

  return data.fields[fieldKey].value;
}

/**
 * Ambil seluruh item konfigurasi berdasarkan configId.
 * Berguna saat halaman Settings perlu tampilkan semua field sekaligus.
 *
 * TODO: Tambah cache setelah lib/cache.ts selesai (Sprint 0 Task 5)
 *
 * @param configId - ID item konfigurasi (contoh: "wa_provider")
 * @returns ConfigRegistryItem lengkap beserta semua field-nya
 * @throws Error jika configId tidak ditemukan
 */
export async function getConfigItem(
  configId: string
): Promise<ConfigRegistryItem> {
  // Baca dokumen dari Firestore
  const configRef = doc(db, 'platform_config', 'config_registry', configId);
  const configSnap = await getDoc(configRef);

  // Kalau item tidak ada di database
  if (!configSnap.exists()) {
    throw new Error(
      `Konfigurasi '${configId}' tidak ditemukan di Config Registry`
    );
  }

  return configSnap.data() as ConfigRegistryItem;
}

/**
 * Ambil semua item konfigurasi berdasarkan kategori.
 * Dipakai untuk render halaman Settings yang dikelompokkan per kategori.
 *
 * TODO: Tambah cache setelah lib/cache.ts selesai (Sprint 0 Task 5)
 *
 * @param category - Nama kategori (contoh: "INTEGRATION", "SECURITY")
 * @param maxResults - Jumlah maksimal item yang diambil (default: 50)
 * @returns Array ConfigRegistryItem yang sesuai kategori
 */
export async function getAllConfigsByCategory(
  category: string,
  maxResults: number = 50
): Promise<ConfigRegistryItem[]> {
  // Query Firestore dengan filter kategori dan batas jumlah hasil
  const configQuery = query(
    collection(db, 'platform_config', 'config_registry'),
    where('category', '==', category),
    limit(maxResults)
  );

  const querySnap = await getDocs(configQuery);

  // Kalau tidak ada hasil, kembalikan array kosong
  if (querySnap.empty) {
    return [];
  }

  return querySnap.docs.map(d => d.data() as ConfigRegistryItem);
}
