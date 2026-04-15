import { NextRequest, NextResponse } from 'next/server'

const mockConfigData = {
  login_config: [
    {
      title: 'Keamanan Login',
      feature_key: 'login_config',
      items: [
        { id: 'max_login_attempts', label: 'Maks percobaan login', type: 'number-unit', value: 5, unit: 'Kali', units: [], option_group_id: null, adminCanChange: true, enabled: true },
        { id: 'account_lock_duration', label: 'Durasi kunci akun', type: 'number-unit', value: 30, unit: 'Menit', units: [], option_group_id: 'satuan_waktu_medium', adminCanChange: true, enabled: true },
        { id: 'reset_counter_duration', label: 'Reset counter', type: 'number-unit', value: 24, unit: 'Jam', units: [], option_group_id: 'satuan_waktu_long', adminCanChange: true, enabled: true },
        { id: 'progressive_lockout', label: 'Progressive lockout', type: 'toggle', value: true, adminCanChange: false, enabled: true },
        { id: 'max_lock_duration', label: 'Batas maks kunci', type: 'number-unit', value: 24, unit: 'Jam', units: [], option_group_id: null, adminCanChange: true, enabled: true },
      ],
    },
    {
      title: 'OTP',
      feature_key: 'login_config',
      items: [
        { id: 'otp_enabled', label: 'OTP aktif', type: 'toggle', value: true, adminCanChange: true, enabled: true },
        { id: 'otp_expiry_duration', label: 'Durasi expired', type: 'number-unit', value: 5, unit: 'Menit', units: [], option_group_id: 'satuan_waktu_short', adminCanChange: true, enabled: true },
        { id: 'otp_length', label: 'Panjang OTP', type: 'select-only', value: '6 Digit', options: ['4 Digit', '6 Digit', '8 Digit'], option_group_id: null, adminCanChange: true, enabled: true },
        { id: 'max_otp_attempts', label: 'Maks percobaan salah', type: 'number-unit', value: 3, unit: 'Kali', units: [], option_group_id: null, adminCanChange: true, enabled: true },
        { id: 'otp_resend_interval', label: 'Jeda kirim ulang', type: 'number-unit', value: 60, unit: 'Detik', units: [], option_group_id: 'satuan_waktu_short', adminCanChange: true, enabled: true },
      ],
    },
    {
      title: 'Biometric',
      feature_key: 'login_config',
      items: [
        { id: 'biometric_enabled', label: 'Tawarkan biometric', type: 'toggle', value: true, adminCanChange: true, enabled: true },
        { id: 'trusted_device_duration', label: 'Durasi trusted device', type: 'number-unit', value: 30, unit: 'Hari', units: [], option_group_id: 'satuan_waktu_extended', adminCanChange: true, enabled: true },
      ],
    },
    {
      title: 'Session & Concurrent',
      feature_key: 'login_config',
      items: [
        { id: 'jwt_duration', label: 'Durasi JWT', type: 'number-unit', value: 60, unit: 'Menit', units: [], option_group_id: 'satuan_waktu_medium', adminCanChange: true, enabled: true },
        { id: 'session_timeout', label: 'Session timeout', type: 'number-unit', value: 30, unit: 'Menit', units: [], option_group_id: 'satuan_waktu_medium', adminCanChange: true, enabled: true },
        { id: 'concurrent_login_rule', label: 'Aturan login bersamaan', type: 'select-only', value: 'Bebas', options: ['Bebas', 'Beda Role', 'Blokir'], option_group_id: null, adminCanChange: true, enabled: true },
        { id: 'wa_notification_on_lock', label: 'Notif WA saat kunci', type: 'toggle', value: true, adminCanChange: true, enabled: true },
      ],
    },
  ],
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ feature_key: string }> }) {
  const { feature_key } = await params
  if (feature_key === 'login_config') {
    return NextResponse.json({ success: true, data: mockConfigData.login_config })
  }
  return NextResponse.json({ success: false, message: 'Feature key not found' }, { status: 404 })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ feature_key: string }> }) {
  const { feature_key } = await params
  const payload = await request.json()
  if (feature_key === 'login_config') {
    return NextResponse.json({ success: true, message: 'Konfigurasi berhasil disimpan', data: payload })
  }
  return NextResponse.json({ success: false, message: 'Feature key not found' }, { status: 404 })
}
