// lib/policy.ts
// Membaca dan merge policy dari 2 level: Platform Owner + Tenant Admin
// Path Platform: /platform_config/policies/{featureKey}
// Path Tenant:   /tenants/{tenantId}/config/main → policies.{featureKey}
//
// Fungsi utama: getEffectivePolicy(tenantId, featureKey)
// Dipakai SEMUA modul — ini fondasi paling penting di seluruh platform
//
// TODO: Tambah cache setelah lib/cache.ts selesai (Sprint 0 Task 5)

import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

// ============================================================
// TYPE DEFINITIONS — POLICY PER FITUR
// ============================================================

/**
 * Policy untuk fitur keamanan login.
 * Feature key: "security_login"
 * Path: /platform_config/policies/security_login
 */
export interface SecurityLoginPolicy {
  /** Maksimum percobaan login yang gagal sebelum akun dikunci */
  max_login_attempts: number;
  /** Durasi kunci akun dalam menit setelah melebihi batas percobaan */
  lock_duration_minutes: number;
  /** Apakah OTP wajib digunakan saat login */
  require_otp: boolean;
  /** Apakah sistem menawarkan opsi biometric saat login */
  require_biometric_offer: boolean;
  /** Durasi sesi aktif sebelum otomatis logout (dalam menit) */
  session_timeout_minutes: number;
  /** Durasi OTP berlaku sebelum kadaluarsa (dalam menit) */
  otp_expiry_minutes: number;
  /** Maksimum percobaan verifikasi OTP yang diizinkan */
  otp_max_attempts: number;
  /** Durasi perangkat terpercaya (trusted device) dalam hari */
  trusted_device_days: number;
}

/**
 * Policy untuk aturan sesi paralel (login dari beberapa perangkat sekaligus).
 * Feature key: "concurrent_session"
 * Path: /platform_config/policies/concurrent_session
 */
export interface ConcurrentSessionPolicy {
  /**
   * Scope berlakunya aturan sesi paralel:
   * - "all_tenant": aturan berlaku lintas semua tenant
   * - "per_tenant": aturan dihitung per tenant masing-masing
   */
  scope: 'all_tenant' | 'per_tenant';
  /**
   * Aturan yang diterapkan saat ada sesi paralel:
   * - "none": tidak ada batasan sesi paralel
   * - "different_role_only": hanya boleh paralel jika role berbeda
   * - "always": selalu blokir sesi paralel tanpa pengecualian
   */
  rule: 'none' | 'different_role_only' | 'always';
}

/**
 * Policy untuk perhitungan komisi transaksi.
 * Feature key: "commission"
 * Path: /platform_config/policies/commission
 */
export interface CommissionPolicy {
  /** Persentase komisi yang dikenakan (contoh: 5 berarti 5%) */
  percentage: number;
  /** Nilai minimum komisi dalam satuan rupiah */
  minimum_amount: number;
  /**
   * Pihak yang menanggung komisi:
   * - "vendor": komisi dipotong dari pembayaran ke vendor
   * - "customer": komisi ditambahkan ke tagihan customer
   */
  charged_to: 'vendor' | 'customer';
}

/**
 * Policy untuk durasi timer lelang reverse auction.
 * Feature key: "timers"
 * Path: /platform_config/policies/timers
 */
export interface TimersPolicy {
  /** Durasi Timer T1 dalam menit — waktu penawaran awal vendor */
  t1_minutes: number;
  /** Durasi Timer T2 dalam menit — waktu negosiasi atau konfirmasi */
  t2_minutes: number;
  /** Durasi Timer T3 dalam menit — waktu eksekusi atau pembayaran */
  t3_minutes: number;
}

/**
 * Policy untuk konfigurasi pencatatan aktivitas pengguna.
 * Feature key: "activity_logging"
 * Path: /platform_config/policies/activity_logging
 */
export interface ActivityLoggingPolicy {
  /** Apakah setiap kunjungan halaman dicatat ke activity_logs */
  log_page_views: boolean;
  /** Apakah setiap klik tombol dicatat ke activity_logs */
  log_button_clicks: boolean;
  /** Apakah setiap submit form dicatat ke activity_logs */
  log_form_submits: boolean;
  /** Apakah error yang terjadi dicatat ke activity_logs */
  log_errors: boolean;
  /** Berapa hari log aktivitas disimpan sebelum dihapus */
  retention_days: number;
}

// ============================================================
// POLICY MAP — MAPPING FEATURE KEY KE TYPE
// ============================================================

/**
 * Peta lengkap semua feature key ke interface policy masing-masing.
 * Digunakan untuk type-safety di getEffectivePolicy().
 */
export interface PolicyMap {
  security_login: SecurityLoginPolicy;
  concurrent_session: ConcurrentSessionPolicy;
  commission: CommissionPolicy;
  timers: TimersPolicy;
  activity_logging: ActivityLoggingPolicy;
}

// ============================================================
// TIPE INTERNAL — DOKUMEN FIRESTORE
// ============================================================

/**
 * Struktur dokumen platform policy di Firestore.
 * Setiap field bisa punya pasangan {fieldName}_tenant_can_override = true/false
 * yang menentukan apakah Tenant Admin boleh override nilai tersebut.
 */
type PlatformPolicyDoc = Record<string, unknown>;

/**
 * Struktur dokumen config utama tenant di Firestore.
 * Field policies berisi override yang dikirim oleh Tenant Admin.
 */
interface TenantConfigDoc {
  policies?: Record<string, Record<string, unknown>>;
  [key: string]: unknown;
}

// ============================================================
// FUNGSI UTAMA
// ============================================================

/**
 * Membaca dan merge policy dari 2 level: Platform Owner + Tenant Admin.
 *
 * Logika merge per field:
 * 1. Baca nilai default dari /platform_config/policies/{featureKey}
 * 2. Cek apakah ada field {fieldName}_tenant_can_override = true
 * 3. Kalau iya DAN tenant punya nilai untuk field itu → pakai nilai tenant
 * 4. Kalau tidak → pakai nilai platform
 *
 * TODO: Tambah cache setelah lib/cache.ts selesai (Sprint 0 Task 5)
 *
 * @param tenantId - ID tenant yang sedang aktif (contoh: "tenant_erpmediator")
 * @param featureKey - Kunci fitur yang policy-nya ingin dibaca
 * @returns Policy yang sudah di-merge dan siap dipakai modul
 * @throws Error jika platform policy untuk featureKey tidak ditemukan
 *
 * @example
 * const loginPolicy = await getEffectivePolicy('tenant_erpmediator', 'security_login');
 * console.log(loginPolicy.max_login_attempts); // nilai dari platform atau tenant
 */
export async function getEffectivePolicy<K extends keyof PolicyMap>(
  tenantId: string,
  featureKey: K
): Promise<PolicyMap[K]> {
  // ── Langkah 1: Baca platform policy ──────────────────────────────────────
  const platformRef = doc(db, 'platform_config', 'policies', featureKey, 'config');
  const platformSnap = await getDoc(platformRef);

  // ── Langkah 2: Validasi platform policy harus ada ────────────────────────
  if (!platformSnap.exists()) {
    throw new Error(
      `Policy platform untuk fitur '${featureKey}' tidak ditemukan di Firestore. ` +
      `Pastikan dokumen /platform_config/policies/${featureKey} sudah ada.`
    );
  }

  const platformData = platformSnap.data() as PlatformPolicyDoc;

  // ── Langkah 3: Baca tenant policy ────────────────────────────────────────
  const tenantConfigRef = doc(db, 'tenants', tenantId, 'config', 'main');
  const tenantConfigSnap = await getDoc(tenantConfigRef);

  // Ambil override tenant untuk featureKey ini (kalau ada)
  // Kalau dokumen tenant tidak ada, anggap tidak ada override
  const tenantOverrides: Record<string, unknown> =
    tenantConfigSnap.exists()
      ? ((tenantConfigSnap.data() as TenantConfigDoc).policies?.[featureKey] ?? {})
      : {};

  // ── Langkah 4: Merge nilai per field ─────────────────────────────────────
  const merged: Record<string, unknown> = {};

  for (const fieldName of Object.keys(platformData)) {
    // Lewati field metadata _tenant_can_override — bukan nilai policy
    if (fieldName.endsWith('_tenant_can_override')) {
      continue;
    }

    // Cek apakah tenant diizinkan override field ini
    const overrideKey = `${fieldName}_tenant_can_override`;
    const tenantCanOverride = platformData[overrideKey] === true;

    // Pakai nilai tenant kalau diizinkan DAN tenant memang punya nilainya
    if (tenantCanOverride && fieldName in tenantOverrides) {
      merged[fieldName] = tenantOverrides[fieldName];
    } else {
      // Kalau tidak — pakai nilai dari platform
      merged[fieldName] = platformData[fieldName];
    }
  }

  // ── Langkah 5: Return hasil merge ─────────────────────────────────────────
  return merged as unknown as PolicyMap[K];
}

/**
 * Shortcut helper untuk membaca policy sesi paralel tenant.
 * Pembungkus getEffectivePolicy() khusus untuk feature key "concurrent_session".
 *
 * TODO: Tambah cache setelah lib/cache.ts selesai (Sprint 0 Task 5)
 *
 * @param tenantId - ID tenant yang sedang aktif
 * @returns ConcurrentSessionPolicy yang sudah di-merge
 *
 * @example
 * const sessionRule = await getConcurrentSessionRule('tenant_erpmediator');
 * if (sessionRule.rule === 'always') { // blokir login kedua }
 */
export async function getConcurrentSessionRule(
  tenantId: string
): Promise<ConcurrentSessionPolicy> {
  return getEffectivePolicy(tenantId, 'concurrent_session');
}
