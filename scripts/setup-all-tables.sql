-- =============================================================
-- setup-all-tables.sql
-- Jalankan SATU KALI di Supabase Dashboard → SQL Editor
-- Membuat semua tabel yang belum ada di database
-- Project: ERP Mediator Hyperlocal
-- Dibuat: Sesi #037
--
-- TABEL YANG DIBUAT:
--   1. message_library      → Library semua pesan platform (UI, WA, Email)
--   2. service_providers    → Master daftar semua API/service yang dipakai
--   3. provider_field_definitions → Field yang dibutuhkan per provider
--   4. provider_instances   → Instance nyata per provider (nama server, health)
--   5. instance_credentials → Nilai credential terenkripsi per field
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. MESSAGE LIBRARY
-- Semua teks pesan platform: UI error, validasi, notifikasi WA, email
-- Bisa dikelola dari Dashboard SuperAdmin tanpa redeploy
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.message_library (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  key          TEXT        NOT NULL UNIQUE,
  kategori     TEXT        NOT NULL,
  channel      TEXT        NOT NULL DEFAULT 'ui',
  teks         TEXT        NOT NULL,
  variabel     TEXT[]      NOT NULL DEFAULT '{}',
  keterangan   TEXT,
  is_active    BOOLEAN     NOT NULL DEFAULT true,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by   UUID        REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_message_library_kategori
  ON public.message_library(kategori);
CREATE INDEX IF NOT EXISTS idx_message_library_channel
  ON public.message_library(channel, is_active);
CREATE INDEX IF NOT EXISTS idx_message_library_key
  ON public.message_library(key) WHERE is_active = true;

COMMENT ON TABLE  public.message_library            IS 'Library semua pesan platform — UI, WA, Email, SMS. Dikelola via Dashboard SuperAdmin.';
COMMENT ON COLUMN public.message_library.key        IS 'Kunci unik machine-readable. Contoh: login_error_credentials_salah';
COMMENT ON COLUMN public.message_library.kategori   IS 'Grup pesan. Contoh: login_ui, otp_ui, notif_wa';
COMMENT ON COLUMN public.message_library.channel    IS 'Media: ui | wa | email | sms';
COMMENT ON COLUMN public.message_library.teks       IS 'Isi pesan. Gunakan {nama_variabel} untuk nilai dinamis';
COMMENT ON COLUMN public.message_library.variabel   IS 'Daftar nama variabel yang dipakai di kolom teks';

ALTER TABLE public.message_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_full_message_library" ON public.message_library;
CREATE POLICY "service_role_full_message_library"
  ON public.message_library FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_read_active_messages" ON public.message_library;
CREATE POLICY "public_read_active_messages"
  ON public.message_library FOR SELECT TO anon, authenticated
  USING (is_active = true);

CREATE OR REPLACE FUNCTION public.set_message_library_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_message_library_updated_at ON public.message_library;
CREATE TRIGGER trg_message_library_updated_at
  BEFORE UPDATE ON public.message_library
  FOR EACH ROW EXECUTE FUNCTION public.set_message_library_updated_at();


-- ─────────────────────────────────────────────────────────────
-- 2. SERVICE PROVIDERS
-- Master daftar semua API/service yang dipakai platform
-- Dikategorikan per fungsi: database, cache, payment, messaging, dll.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.service_providers (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  kode         TEXT        NOT NULL UNIQUE,
  nama         TEXT        NOT NULL,
  kategori     TEXT        NOT NULL,
  deskripsi    TEXT,
  docs_url     TEXT,
  status_url   TEXT,
  tag          TEXT        NOT NULL DEFAULT 'opsional',
  is_aktif     BOOLEAN     NOT NULL DEFAULT true,
  sort_order   INTEGER     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.service_providers          IS 'Master daftar semua provider API yang digunakan platform. Dikelola via Dashboard SuperAdmin.';
COMMENT ON COLUMN public.service_providers.kode     IS 'Identifier unik. Contoh: xendit, fonnte, cloudinary';
COMMENT ON COLUMN public.service_providers.kategori IS 'Fungsi provider: database | cache | search | media | payment | messaging | email | cdn';
COMMENT ON COLUMN public.service_providers.tag      IS 'Prioritas: wajib | disarankan | opsional';

CREATE INDEX IF NOT EXISTS idx_service_providers_kategori
  ON public.service_providers(kategori, is_aktif);
CREATE INDEX IF NOT EXISTS idx_service_providers_sort
  ON public.service_providers(sort_order);

ALTER TABLE public.service_providers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_providers" ON public.service_providers;
CREATE POLICY "authenticated_read_providers"
  ON public.service_providers FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "service_role_full_providers" ON public.service_providers;
CREATE POLICY "service_role_full_providers"
  ON public.service_providers FOR ALL TO service_role
  USING (true) WITH CHECK (true);


-- ─────────────────────────────────────────────────────────────
-- 3. PROVIDER FIELD DEFINITIONS
-- Field yang dibutuhkan tiap provider + metadata form UI
-- Form Dashboard auto-render dari tabel ini — tidak perlu coding
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.provider_field_definitions (
  id                UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id       UUID    NOT NULL REFERENCES public.service_providers(id) ON DELETE CASCADE,
  field_key         TEXT    NOT NULL,
  label             TEXT    NOT NULL,
  tipe              TEXT    NOT NULL,
  is_required       BOOLEAN NOT NULL DEFAULT true,
  is_secret         BOOLEAN NOT NULL DEFAULT false,
  options           JSONB,
  placeholder       TEXT,
  deskripsi         TEXT,
  panduan_langkah   JSONB,
  deep_link_url     TEXT,
  prefix_sandbox    TEXT,
  prefix_production TEXT,
  nilai_default     TEXT,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  UNIQUE (provider_id, field_key)
);

COMMENT ON TABLE  public.provider_field_definitions              IS 'Field yang dibutuhkan tiap provider. Form Dashboard auto-render dari tabel ini.';
COMMENT ON COLUMN public.provider_field_definitions.tipe        IS 'Jenis input: text | secret | url | number | email | select';
COMMENT ON COLUMN public.provider_field_definitions.is_secret   IS 'Jika true, nilai dienkripsi AES-256-GCM saat disimpan';
COMMENT ON COLUMN public.provider_field_definitions.options     IS 'Untuk tipe select: [{value, label}]. Null untuk tipe lain.';
COMMENT ON COLUMN public.provider_field_definitions.panduan_langkah IS 'Langkah cara mendapatkan nilai: [{no, teks}]';

CREATE INDEX IF NOT EXISTS idx_field_defs_provider
  ON public.provider_field_definitions(provider_id, sort_order);

ALTER TABLE public.provider_field_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_field_defs" ON public.provider_field_definitions;
CREATE POLICY "authenticated_read_field_defs"
  ON public.provider_field_definitions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "service_role_full_field_defs" ON public.provider_field_definitions;
CREATE POLICY "service_role_full_field_defs"
  ON public.provider_field_definitions FOR ALL TO service_role
  USING (true) WITH CHECK (true);


-- ─────────────────────────────────────────────────────────────
-- 4. PROVIDER INSTANCES
-- Satu baris = satu koneksi nyata ke provider
-- Contoh: "Xendit Production", "Redis Singapore"
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.provider_instances (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id    UUID        NOT NULL REFERENCES public.service_providers(id),
  nama_server    TEXT        NOT NULL,
  deskripsi      TEXT,
  is_aktif       BOOLEAN     NOT NULL DEFAULT true,
  is_default     BOOLEAN     NOT NULL DEFAULT false,
  health_status  TEXT        NOT NULL DEFAULT 'belum_dites',
  health_pesan   TEXT,
  last_tested_at TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by     UUID        REFERENCES public.users(id),
  updated_by     UUID        REFERENCES public.users(id)
);

COMMENT ON TABLE  public.provider_instances              IS 'Instance nyata tiap provider. Contoh: Xendit Production, Redis Singapore.';
COMMENT ON COLUMN public.provider_instances.nama_server IS 'Label admin untuk instance ini. Tampil sebagai judul kartu di dashboard.';
COMMENT ON COLUMN public.provider_instances.health_status IS 'Status koneksi: sehat | belum_dites | peringatan | gagal';
COMMENT ON COLUMN public.provider_instances.is_default  IS 'Hanya satu instance default per provider yang dipakai aplikasi.';

CREATE INDEX IF NOT EXISTS idx_instances_provider
  ON public.provider_instances(provider_id, is_aktif);
CREATE INDEX IF NOT EXISTS idx_instances_health
  ON public.provider_instances(health_status, last_tested_at);

ALTER TABLE public.provider_instances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_full_instances" ON public.provider_instances;
CREATE POLICY "service_role_full_instances"
  ON public.provider_instances FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.set_provider_instances_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_provider_instances_updated_at ON public.provider_instances;
CREATE TRIGGER trg_provider_instances_updated_at
  BEFORE UPDATE ON public.provider_instances
  FOR EACH ROW EXECUTE FUNCTION public.set_provider_instances_updated_at();


-- ─────────────────────────────────────────────────────────────
-- 5. INSTANCE CREDENTIALS
-- Nilai credential terenkripsi AES-256-GCM per field
-- TIDAK PERNAH bisa diakses dari browser — hanya via service_role
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.instance_credentials (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id     UUID        NOT NULL REFERENCES public.provider_instances(id) ON DELETE CASCADE,
  field_def_id    UUID        NOT NULL REFERENCES public.provider_field_definitions(id),
  encrypted_dek   TEXT,
  encrypted_value TEXT        NOT NULL,
  fingerprint     TEXT,
  key_version     INTEGER     NOT NULL DEFAULT 1,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by      UUID        REFERENCES public.users(id),
  UNIQUE (instance_id, field_def_id)
);

COMMENT ON TABLE  public.instance_credentials                 IS 'Nilai credential terenkripsi AES-256-GCM. Tidak bisa diakses dari browser.';
COMMENT ON COLUMN public.instance_credentials.encrypted_dek  IS 'Data Encryption Key terenkripsi dengan Master Key.';
COMMENT ON COLUMN public.instance_credentials.encrypted_value IS 'Nilai terenkripsi (secret) atau plain text (non-secret).';
COMMENT ON COLUMN public.instance_credentials.fingerprint    IS '4 karakter terakhir nilai asli — untuk ditampilkan di UI.';
COMMENT ON COLUMN public.instance_credentials.key_version    IS 'Naik setiap Master Key dirotasi — untuk audit.';

CREATE INDEX IF NOT EXISTS idx_credentials_instance
  ON public.instance_credentials(instance_id);
CREATE INDEX IF NOT EXISTS idx_credentials_field
  ON public.instance_credentials(field_def_id);

ALTER TABLE public.instance_credentials ENABLE ROW LEVEL SECURITY;

-- instance_credentials: BLOKIR SEMUA AKSES dari browser/authenticated
-- Hanya service_role (server-side) yang boleh akses
DROP POLICY IF EXISTS "blokir_semua_client_credentials" ON public.instance_credentials;
CREATE POLICY "blokir_semua_client_credentials"
  ON public.instance_credentials FOR ALL TO authenticated
  USING (false);

DROP POLICY IF EXISTS "service_role_full_credentials" ON public.instance_credentials;
CREATE POLICY "service_role_full_credentials"
  ON public.instance_credentials FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.set_instance_credentials_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_instance_credentials_updated_at ON public.instance_credentials;
CREATE TRIGGER trg_instance_credentials_updated_at
  BEFORE UPDATE ON public.instance_credentials
  FOR EACH ROW EXECUTE FUNCTION public.set_instance_credentials_updated_at();


-- =============================================================
-- SELESAI
-- Setelah SQL ini berhasil, jalankan:
--   node scripts/seed-tenant.mjs
-- =============================================================
