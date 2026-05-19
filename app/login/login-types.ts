// app/login/login-types.ts
// Tipe dan konstanta bersama untuk login flow
// Dipindah dari login/page.tsx monolith — Sesi #049

// ─── Tipe Tahap Flow Login ────────────────────────────────────────────────────
export type Tahap =
  | 'LOADING_GPS'
  | 'GPS_GAGAL'
  | 'KREDENSIAL'
  | 'LOADING'
  | 'SESI_PARALEL'
  | 'ROLE'
  | 'OTP'
  | 'BIOMETRIC'
  | 'SELESAI'

// ─── Tipe data sesi paralel ──────────────────────────────────────────────────
export interface DataSesiParalel {
  device:   string
  gps_kota: string
  login_at: unknown
  role:     string
}

// ─── Default pesan (fallback sampai data dari message_library terload) ────────
export const DEFAULT_PESAN: Record<string, string> = {
  login_error_credentials_salah:        'Email atau password yang Anda masukkan salah.',
  login_error_email_belum_konfirmasi:   'Email belum dikonfirmasi. Hubungi admin.',
  login_error_terlalu_banyak_percobaan: 'Terlalu banyak percobaan. Coba lagi beberapa menit.',
  login_error_koneksi_gagal:            'Gagal terhubung. Periksa koneksi internet.',
  login_error_umum:                     'Terjadi kesalahan. Coba lagi.',
  login_error_gps_diperlukan:           'Aktifkan GPS di browser untuk melanjutkan. Klik ikon lokasi di address bar, lalu izinkan akses lokasi.',
  login_error_config_belum_lengkap:     'Konfigurasi akun belum lengkap. Hubungi admin.',
  login_error_role_tidak_ditemukan:     'Role akun tidak ditemukan. Hubungi admin.',
  login_error_akun_belum_aktif:         'Akun Anda belum diaktifkan. Tunggu verifikasi dari Admin.',
  login_error_gagal_muat_data:          'Gagal memuat data akun. Coba lagi.',
  login_error_gagal_config:             'Gagal memuat konfigurasi. Coba lagi.',
  login_error_gagal_selesaikan:         'Gagal menyelesaikan login. Coba lagi.',
  login_error_akun_dikunci:             'Terlalu banyak percobaan. Akun dikunci hingga pukul {lock_until_wib}.',
  login_validasi_email_kosong:          'Email wajib diisi.',
  login_validasi_email_format:          'Format email tidak valid.',
  login_validasi_password_kosong:       'Password wajib diisi.',
  login_validasi_password_min:          'Password minimal {min_panjang} karakter.',
  otp_error_kurang_digit:               'Masukkan 6 digit kode OTP.',
  otp_error_kadaluarsa:                 'Kode OTP sudah kadaluarsa. Klik Kirim ulang.',
  otp_error_salah:                      'Kode OTP salah. Sisa percobaan: {sisa_percobaan}.',
  otp_error_batas_habis:                'Batas percobaan OTP habis. Klik Kirim ulang.',
  otp_error_verifikasi_gagal:           'Gagal memverifikasi OTP. Coba lagi.',
}

// ─── Map error Supabase → message key ────────────────────────────────────────
export const SUPABASE_ERROR_KEYS: Record<string, string> = {
  'Invalid login credentials': 'login_error_credentials_salah',
  'Email not confirmed':       'login_error_email_belum_konfirmasi',
  'Too many requests':         'login_error_terlalu_banyak_percobaan',
  'Network request failed':    'login_error_koneksi_gagal',
  'User not found':            'login_error_credentials_salah',
}

// ─── Decode JWT payload ──────────────────────────────────────────────────────
export function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const parts  = token.split('.')
    if (parts.length !== 3) return {}
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    return JSON.parse(atob(padded)) as Record<string, unknown>
  } catch {
    return {}
  }
}

// ─── Helper config: extract items dari response API ──────────────────────────
type ConfigItem = { policy_key?: string; nilai?: string }
type ConfigGroup = { items: ConfigItem[] }

export function extractConfigItems(data: ConfigGroup[]): ConfigItem[] {
  return data.flatMap(g => g.items)
}

export function findConfigValue(items: ConfigItem[], policyKey: string): string | undefined {
  return items.find(i => i.policy_key === policyKey)?.nilai
}

// ─── OTP Mode per role — helper untuk parse require_otp JSON dari config_registry ──
//
// Mendukung 2 format nilai `require_otp` di config_registry:
//   Format JSON per-role: {"customer":"disabled","vendor":"required","super_admin":"required"}
//   Format lama (boolean string): "true" / "false"
//
// Nilai per mode (hanya 2 pilihan — FIX S#182: hapus 'optional'):
//   "required"  → OTP selalu dikirim ke role ini
//   "disabled"  → OTP tidak pernah dikirim ke role ini
//
// Dipakai di: send-otp/route.ts (server gate) + useLoginFlow.ts (client gate)

export type OtpMode = 'required' | 'disabled'

export function parseRequireOtpForRole(configValue: string, role: string): OtpMode {
  try {
    const parsed = JSON.parse(configValue)
    if (parsed !== null && typeof parsed === 'object') {
      const roleKey = role.toLowerCase()
      const mode    = String((parsed as Record<string, unknown>)[roleKey] ?? 'required')
      if (mode === 'disabled') return 'disabled'
      return 'required' // default aman: wajib OTP
    }
  } catch { /* bukan JSON — fallback ke format lama */ }
  // Format lama: boolean string
  return configValue === 'false' ? 'disabled' : 'required'
}

// ─── Helper format waktu login ───────────────────────────────────────────────
export function formatWaktuLogin(ts: unknown): string {
  if (!ts) return 'waktu tidak diketahui'
  try {
    if (typeof ts === 'object' && ts !== null && 'seconds' in ts) {
      return new Date((ts as { seconds: number }).seconds * 1000)
        .toLocaleString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    }
    return new Date(ts as string)
      .toLocaleString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return 'waktu tidak diketahui'
  }
}
