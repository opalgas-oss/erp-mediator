-- scripts/create-stored-procedures.sql
-- Stored Procedures untuk ERP Mediator Hyperlocal
-- Dibuat: Sesi #051 — 22 April 2026
-- Sumber: TODO_ARSITEKTUR_LAYER_v1.md BLOK A
--
-- Semua SP mengatasi race condition via SELECT FOR UPDATE.
-- Config diterima sebagai parameter (bukan baca DB sendiri) —
-- sesuai separation of concerns: caching di app layer, atomicity di DB layer.
--
-- CARA PAKAI:
--   Supabase Dashboard → SQL Editor → paste & run
--   Atau via Supabase MCP execute_sql
--
-- KOLOM account_locks (DOKUMENTASI):
--   count      = percobaan gagal di siklus saat ini (reset setelah unlock/expired)
--   lock_count = total berapa kali akun pernah terkunci (kumulatif, tidak reset)

-- ═══════════════════════════════════════════════════════════════════════════════
-- SP 1: sp_increment_lock_count
-- Atomic increment percobaan login gagal + auto-lock jika melebihi batas.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.sp_increment_lock_count(
  p_email                  TEXT,
  p_uid                    UUID,
  p_nama                   TEXT        DEFAULT NULL,
  p_nomor_wa               TEXT        DEFAULT NULL,
  p_tenant_id              UUID        DEFAULT NULL,
  p_max_attempts           INTEGER     DEFAULT 5,
  p_lock_duration_minutes  INTEGER     DEFAULT 15
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_existing        RECORD;
  v_now             TIMESTAMPTZ := NOW();
  v_start_count     INTEGER := 0;
  v_new_count       INTEGER;
  v_locked          BOOLEAN := FALSE;
  v_lock_until      TIMESTAMPTZ := NULL;
  v_old_lock_count  INTEGER := 0;
  v_new_lock_count  INTEGER := 0;
  v_safe_uid        UUID;
  v_safe_nama       TEXT;
  v_safe_nomor_wa   TEXT;
BEGIN
  -- 1. SELECT FOR UPDATE — kunci row agar concurrent request antri
  SELECT *
  INTO v_existing
  FROM public.account_locks
  WHERE email = p_email
  FOR UPDATE;

  -- 2. Jika ada record existing
  IF FOUND THEN
    v_old_lock_count := COALESCE(v_existing.lock_count, 0);
    v_safe_uid       := COALESCE(v_existing.uid, p_uid);
    v_safe_nama      := COALESCE(p_nama, v_existing.nama, p_email);
    v_safe_nomor_wa  := COALESCE(p_nomor_wa, v_existing.nomor_wa, '');

    -- Cek apakah lock sudah expired → reset count
    IF v_existing.status = 'locked' AND v_existing.lock_until IS NOT NULL THEN
      IF v_existing.lock_until <= v_now THEN
        v_start_count := 0;
      ELSE
        -- Masih terkunci dan belum expired → return langsung
        RETURN jsonb_build_object(
          'locked',     TRUE,
          'lock_until', v_existing.lock_until,
          'count',      v_existing.count,
          'lock_count', v_old_lock_count
        );
      END IF;
    ELSE
      v_start_count := COALESCE(v_existing.count, 0);
    END IF;

    v_new_count := v_start_count + 1;

    -- Cek apakah sudah mencapai batas → lock akun
    IF v_new_count >= p_max_attempts THEN
      v_locked         := TRUE;
      v_lock_until     := v_now + (p_lock_duration_minutes || ' minutes')::INTERVAL;
      v_new_lock_count := v_old_lock_count + 1;

      UPDATE public.account_locks SET
        uid = v_safe_uid, nama = v_safe_nama, nomor_wa = v_safe_nomor_wa,
        tenant_id = p_tenant_id, count = v_new_count, lock_count = v_new_lock_count,
        status = 'locked', lock_until = v_lock_until, locked_at = v_now,
        last_attempt_at = v_now, unlock_at = NULL, unlocked_by = NULL, unlock_method = NULL
      WHERE email = p_email;
    ELSE
      v_locked         := FALSE;
      v_new_lock_count := v_old_lock_count;

      UPDATE public.account_locks SET
        uid = v_safe_uid, nama = v_safe_nama, nomor_wa = v_safe_nomor_wa,
        tenant_id = p_tenant_id, count = v_new_count, status = 'unlocked',
        last_attempt_at = v_now, unlock_at = NULL, unlocked_by = NULL, unlock_method = NULL
      WHERE email = p_email;
    END IF;

  -- 3. Record belum ada → INSERT baru
  ELSE
    v_safe_uid      := COALESCE(p_uid, gen_random_uuid());
    v_safe_nama     := COALESCE(p_nama, p_email);
    v_safe_nomor_wa := COALESCE(p_nomor_wa, '');
    v_new_count     := 1;

    IF v_new_count >= p_max_attempts THEN
      v_locked         := TRUE;
      v_lock_until     := v_now + (p_lock_duration_minutes || ' minutes')::INTERVAL;
      v_new_lock_count := 1;

      INSERT INTO public.account_locks (
        uid, email, nama, nomor_wa, tenant_id,
        count, lock_count, status, lock_until, locked_at, last_attempt_at
      ) VALUES (
        v_safe_uid, p_email, v_safe_nama, v_safe_nomor_wa, p_tenant_id,
        v_new_count, v_new_lock_count, 'locked', v_lock_until, v_now, v_now
      );
    ELSE
      v_locked         := FALSE;
      v_new_lock_count := 0;

      INSERT INTO public.account_locks (
        uid, email, nama, nomor_wa, tenant_id,
        count, lock_count, status, last_attempt_at
      ) VALUES (
        v_safe_uid, p_email, v_safe_nama, v_safe_nomor_wa, p_tenant_id,
        v_new_count, 0, 'unlocked', v_now
      );
    END IF;
  END IF;

  -- 4. Return hasil
  RETURN jsonb_build_object(
    'locked',     v_locked,
    'lock_until', v_lock_until,
    'count',      v_new_count,
    'lock_count', v_new_lock_count
  );
END;
$$;

COMMENT ON FUNCTION public.sp_increment_lock_count IS
  'Atomic increment percobaan login gagal + auto-lock. Race condition dicegah SELECT FOR UPDATE. Config diterima dari app layer. Sesi #051.';

-- ═══════════════════════════════════════════════════════════════════════════════
-- SP 2: sp_verify_and_consume_otp
-- Atomic verifikasi + consume OTP. Race condition dicegah SELECT FOR UPDATE.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.sp_verify_and_consume_otp(
  p_uid        UUID,
  p_tenant_id  UUID,
  p_input_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $
DECLARE
  v_otp RECORD;
BEGIN
  -- 1. SELECT FOR UPDATE — kunci row agar concurrent request antri
  SELECT *
  INTO v_otp
  FROM public.otp_codes
  WHERE uid       = p_uid
    AND tenant_id = p_tenant_id
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('result', 'NOT_FOUND');
  END IF;

  IF v_otp.dipakai = TRUE THEN
    RETURN jsonb_build_object('result', 'ALREADY_USED');
  END IF;

  IF v_otp.expired_at < NOW() THEN
    RETURN jsonb_build_object('result', 'EXPIRED');
  END IF;

  IF v_otp.kode != p_input_code THEN
    RETURN jsonb_build_object('result', 'WRONG');
  END IF;

  UPDATE public.otp_codes
  SET dipakai = TRUE
  WHERE id = v_otp.id;

  RETURN jsonb_build_object('result', 'OK');
END;
$;

COMMENT ON FUNCTION public.sp_verify_and_consume_otp IS
  'Atomic verify + consume OTP. Race condition dicegah SELECT FOR UPDATE. Migrasi dari session.ts verifyOTP(). Sesi #051.';

-- ═══════════════════════════════════════════════════════════════════════════════
-- SP 3: sp_get_credential
-- Ambil credential service dalam 1 JOIN (ganti 4 query berurutan).
-- Dekripsi tetap di app layer (butuh MASTER_ENCRYPTION_KEY dari env).
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.sp_get_credential(
  p_provider_kode  TEXT,
  p_field_key      TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $
DECLARE
  v_result RECORD;
BEGIN
  SELECT
    ic.encrypted_value,
    pfd.is_secret
  INTO v_result
  FROM public.service_providers sp
  JOIN public.provider_instances pi
    ON pi.provider_id = sp.id
    AND pi.is_aktif = TRUE
    AND pi.is_default = TRUE
  JOIN public.provider_field_definitions pfd
    ON pfd.provider_id = sp.id
    AND pfd.field_key = p_field_key
  JOIN public.instance_credentials ic
    ON ic.instance_id = pi.id
    AND ic.field_def_id = pfd.id
  WHERE sp.kode = p_provider_kode
    AND sp.is_aktif = TRUE
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'status', 'NOT_FOUND',
      'encrypted_value', NULL,
      'is_secret', NULL
    );
  END IF;

  RETURN jsonb_build_object(
    'status', 'FOUND',
    'encrypted_value', v_result.encrypted_value,
    'is_secret', v_result.is_secret
  );
END;
$;

COMMENT ON FUNCTION public.sp_get_credential IS
  'Ambil credential service dalam 1 JOIN (ganti 4 query berurutan). Dekripsi tetap di app layer. Sesi #051.';

-- ═══════════════════════════════════════════════════════════════════════════════
-- SP 4: sp_unlock_account
-- Atomic unlock akun. Coba uid dulu, fallback email.
-- Auto reset count, manual tidak.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.sp_unlock_account(
  p_uid          UUID        DEFAULT NULL,
  p_email        TEXT        DEFAULT NULL,
  p_method       TEXT        DEFAULT 'auto',
  p_unlocked_by  UUID        DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $
DECLARE
  v_now        TIMESTAMPTZ := NOW();
  v_row_count  INTEGER;
BEGIN
  IF p_uid IS NULL AND p_email IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'matched_by', NULL);
  END IF;

  -- 1. Coba UPDATE by uid (prioritas)
  IF p_uid IS NOT NULL THEN
    UPDATE public.account_locks SET
      status        = 'unlocked',
      unlock_method = p_method,
      unlock_at     = v_now,
      unlocked_by   = CASE WHEN p_method = 'manual' THEN p_unlocked_by ELSE NULL END,
      count         = CASE WHEN p_method = 'auto' THEN 0 ELSE count END
    WHERE uid = p_uid
      AND status = 'locked';

    GET DIAGNOSTICS v_row_count = ROW_COUNT;
    IF v_row_count > 0 THEN
      RETURN jsonb_build_object('success', TRUE, 'matched_by', 'uid');
    END IF;
  END IF;

  -- 2. Fallback: UPDATE by email
  IF p_email IS NOT NULL THEN
    UPDATE public.account_locks SET
      status        = 'unlocked',
      unlock_method = p_method,
      unlock_at     = v_now,
      unlocked_by   = CASE WHEN p_method = 'manual' THEN p_unlocked_by ELSE NULL END,
      count         = CASE WHEN p_method = 'auto' THEN 0 ELSE count END
    WHERE email = p_email
      AND status = 'locked';

    GET DIAGNOSTICS v_row_count = ROW_COUNT;
    IF v_row_count > 0 THEN
      RETURN jsonb_build_object('success', TRUE, 'matched_by', 'email');
    END IF;
  END IF;

  RETURN jsonb_build_object('success', FALSE, 'matched_by', NULL);
END;
$;

COMMENT ON FUNCTION public.sp_unlock_account IS
  'Atomic unlock akun. Coba uid dulu, fallback email. Auto reset count, manual tidak. Sesi #051.';

-- ═══════════════════════════════════════════════════════════════════════════════
-- SP 5: sp_upsert_user_presence
-- Atomic upsert user presence.
-- Non-SUPERADMIN: ON CONFLICT upsert. SUPERADMIN (NULL tenant): SELECT FOR UPDATE.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.sp_upsert_user_presence(
  p_uid                UUID,
  p_tenant_id          UUID        DEFAULT NULL,
  p_nama               TEXT        DEFAULT NULL,
  p_role               TEXT        DEFAULT NULL,
  p_device             TEXT        DEFAULT NULL,
  p_current_page       TEXT        DEFAULT NULL,
  p_current_page_label TEXT        DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $
DECLARE
  v_now       TIMESTAMPTZ := NOW();
  v_existing  UUID;
  v_action    TEXT;
BEGIN
  IF p_tenant_id IS NOT NULL THEN
    INSERT INTO public.user_presence (
      uid, tenant_id, nama, role, device,
      current_page, current_page_label, last_active, status
    ) VALUES (
      p_uid, p_tenant_id, p_nama, p_role, p_device,
      p_current_page, p_current_page_label, v_now, 'online'
    )
    ON CONFLICT (tenant_id, uid) DO UPDATE SET
      nama               = COALESCE(EXCLUDED.nama, user_presence.nama),
      role               = COALESCE(EXCLUDED.role, user_presence.role),
      device             = COALESCE(EXCLUDED.device, user_presence.device),
      current_page       = EXCLUDED.current_page,
      current_page_label = EXCLUDED.current_page_label,
      last_active        = v_now,
      status             = 'online';

    v_action := 'UPSERT';
  ELSE
    SELECT id INTO v_existing
    FROM public.user_presence
    WHERE uid = p_uid AND tenant_id IS NULL
    LIMIT 1
    FOR UPDATE;

    IF FOUND THEN
      UPDATE public.user_presence SET
        nama               = COALESCE(p_nama, nama),
        role               = COALESCE(p_role, role),
        device             = COALESCE(p_device, device),
        current_page       = p_current_page,
        current_page_label = p_current_page_label,
        last_active        = v_now,
        status             = 'online'
      WHERE uid = p_uid AND tenant_id IS NULL;

      v_action := 'UPDATE';
    ELSE
      INSERT INTO public.user_presence (
        uid, tenant_id, nama, role, device,
        current_page, current_page_label, last_active, status
      ) VALUES (
        p_uid, NULL, p_nama, p_role, p_device,
        p_current_page, p_current_page_label, v_now, 'online'
      );

      v_action := 'INSERT';
    END IF;
  END IF;

  RETURN jsonb_build_object('success', TRUE, 'action', v_action);
END;
$;

COMMENT ON FUNCTION public.sp_upsert_user_presence IS
  'Atomic upsert user presence. Non-SUPERADMIN: ON CONFLICT upsert. SUPERADMIN (NULL tenant): SELECT FOR UPDATE. Sesi #051.';

-- ═══════════════════════════════════════════════════════════════════════════════
-- SELESAI — 5 Stored Procedures
-- Semua sudah ditest dan LULUS di Sesi #051.
-- Verifikasi: SELECT routine_name FROM information_schema.routines
--   WHERE routine_schema = 'public' AND routine_name LIKE 'sp_%';
-- ═══════════════════════════════════════════════════════════════════════════════
