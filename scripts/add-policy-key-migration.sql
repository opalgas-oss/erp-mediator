-- =============================================================
-- add-policy-key-migration.sql
-- Jalankan SATU KALI di Supabase Dashboard → SQL Editor
-- Tambah kolom policy_key ke tabel config_registry
-- =============================================================

-- 1. Tambah kolom policy_key
ALTER TABLE public.config_registry
  ADD COLUMN IF NOT EXISTS policy_key TEXT;

-- 2. Index untuk lookup cepat
CREATE INDEX IF NOT EXISTS idx_config_registry_lookup
  ON public.config_registry(feature_key, policy_key)
  WHERE policy_key IS NOT NULL AND is_active = true;

-- 3. Isi policy_key untuk 16 item security_login yang sudah ada
UPDATE public.config_registry SET policy_key = 'max_login_attempts'
  WHERE feature_key = 'security_login' AND label = 'Maks percobaan login' AND tenant_id IS NULL;

UPDATE public.config_registry SET policy_key = 'lock_duration_minutes'
  WHERE feature_key = 'security_login' AND label = 'Durasi kunci akun (menit)' AND tenant_id IS NULL;

UPDATE public.config_registry SET policy_key = 'login_attempts_reset_hours'
  WHERE feature_key = 'security_login' AND label = 'Reset counter gagal setelah idle' AND tenant_id IS NULL;

UPDATE public.config_registry SET policy_key = 'progressive_lockout_enabled'
  WHERE feature_key = 'security_login' AND label = 'Progressive lockout' AND tenant_id IS NULL;

UPDATE public.config_registry SET policy_key = 'max_lock_duration_hours'
  WHERE feature_key = 'security_login' AND label = 'Batas maksimal durasi kunci (jam)' AND tenant_id IS NULL;

UPDATE public.config_registry SET policy_key = 'require_otp'
  WHERE feature_key = 'security_login' AND label = 'OTP via WhatsApp aktif' AND tenant_id IS NULL;

UPDATE public.config_registry SET policy_key = 'otp_expiry_minutes'
  WHERE feature_key = 'security_login' AND label = 'Durasi OTP expired (menit)' AND tenant_id IS NULL;

UPDATE public.config_registry SET policy_key = 'otp_digits'
  WHERE feature_key = 'security_login' AND label = 'Panjang kode OTP' AND tenant_id IS NULL;

UPDATE public.config_registry SET policy_key = 'otp_max_attempts'
  WHERE feature_key = 'security_login' AND label = 'Maks percobaan OTP salah' AND tenant_id IS NULL;

UPDATE public.config_registry SET policy_key = 'otp_resend_cooldown_seconds'
  WHERE feature_key = 'security_login' AND label = 'Jeda sebelum kirim ulang OTP (detik)' AND tenant_id IS NULL;

UPDATE public.config_registry SET policy_key = 'require_biometric_offer'
  WHERE feature_key = 'security_login' AND label = 'Tawarkan biometric saat login' AND tenant_id IS NULL;

UPDATE public.config_registry SET policy_key = 'trusted_device_days'
  WHERE feature_key = 'security_login' AND label = 'Durasi trusted device (hari)' AND tenant_id IS NULL;

UPDATE public.config_registry SET policy_key = 'session_timeout_minutes'
  WHERE feature_key = 'security_login' AND label = 'Durasi session timeout (menit)' AND tenant_id IS NULL;

UPDATE public.config_registry SET policy_key = 'session_inactive_timeout_minutes'
  WHERE feature_key = 'security_login' AND label = 'Session timeout tidak aktif (menit)' AND tenant_id IS NULL;

UPDATE public.config_registry SET policy_key = 'concurrent_rule'
  WHERE feature_key = 'security_login' AND label = 'Aturan login bersamaan' AND tenant_id IS NULL;

UPDATE public.config_registry SET policy_key = 'notify_superadmin_on_lock'
  WHERE feature_key = 'security_login' AND label = 'Notif WA ke SuperAdmin saat dikunci' AND tenant_id IS NULL;

-- 4. Verifikasi — harus tampil 16 baris dengan policy_key terisi
SELECT policy_key, label, nilai
FROM public.config_registry
WHERE feature_key = 'security_login' AND tenant_id IS NULL
ORDER BY policy_key;
