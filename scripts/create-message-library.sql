-- =============================================================
-- create-message-library.sql
-- Jalankan SATU KALI di Supabase SQL Editor (Dashboard > SQL Editor)
-- Project: ERP Mediator Hyperlocal
-- Dibuat: Sesi #037
-- =============================================================

-- ─── Buat Tabel ───────────────────────────────────────────────────────────────

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

-- ─── Index ────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_message_library_kategori
  ON public.message_library(kategori);

CREATE INDEX IF NOT EXISTS idx_message_library_channel
  ON public.message_library(channel, is_active);

CREATE INDEX IF NOT EXISTS idx_message_library_key
  ON public.message_library(key) WHERE is_active = true;

-- ─── Komentar Kolom ───────────────────────────────────────────────────────────

COMMENT ON TABLE  public.message_library              IS 'Library semua pesan platform — UI, WA, Email, SMS. Dikelola via Dashboard SuperAdmin.';
COMMENT ON COLUMN public.message_library.key          IS 'Kunci unik machine-readable. Contoh: login_error_credentials_salah';
COMMENT ON COLUMN public.message_library.kategori     IS 'Grup pesan. Contoh: login_ui, otp_ui, notif_wa';
COMMENT ON COLUMN public.message_library.channel      IS 'Media pengiriman: ui | wa | email | sms';
COMMENT ON COLUMN public.message_library.teks         IS 'Isi pesan. Gunakan {nama_variabel} untuk nilai dinamis';
COMMENT ON COLUMN public.message_library.variabel     IS 'Daftar nama variabel yang dipakai di kolom teks';
COMMENT ON COLUMN public.message_library.keterangan   IS 'Penjelasan untuk admin — kapan pesan ini muncul';

-- ─── Row Level Security ───────────────────────────────────────────────────────

ALTER TABLE public.message_library ENABLE ROW LEVEL SECURITY;

-- Service role (server-side) bisa lakukan segalanya
CREATE POLICY "service_role_full_access"
  ON public.message_library
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Semua user (termasuk anon) bisa baca pesan yang aktif
-- Diperlukan karena login page fetch sebelum user login
CREATE POLICY "public_read_active"
  ON public.message_library
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- ─── Audit Trigger ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_message_library_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_message_library_updated_at
  BEFORE UPDATE ON public.message_library
  FOR EACH ROW EXECUTE FUNCTION public.set_message_library_updated_at();
