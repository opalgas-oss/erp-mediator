// ARSIP SESI #205 — PRE-FIX BUG-017/018/019
// File asli: app/login/login-types.ts
// Disalin sebelum modifikasi: tambah 2 message key (otp_error_lockout_server + otp_error_resend_limit_server)
// di DEFAULT_PESAN untuk handling lockout dari server dan resend limit.
//
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

// (sisanya tidak berubah — kontrak parseRequireOtpForRole + getRequireOtpConfigKey tetap)
