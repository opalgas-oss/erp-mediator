-- scripts/create-code-registry.sql
-- DDL untuk Code Registry — schema terpisah dari tabel bisnis
-- Sumber: AI_Code_Registry_v1.docx + ANALISIS_CODING_STANDARD_REGISTRY_v3.md
-- Dibuat: Sesi #049 — 22 April 2026
--
-- PRASYARAT:
--   Extension uuid-ossp dan pg_trgm harus aktif di Supabase
--
-- CARA PAKAI:
--   Otomatis dijalankan via Supabase MCP apply_migration
--   Atau manual: Supabase Dashboard → SQL Editor → paste & run

-- ═══════════════════════════════════════════════════════════════════════════════
-- EXTENSION YANG DIBUTUHKAN
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ═══════════════════════════════════════════════════════════════════════════════
-- SCHEMA TERPISAH — tidak campur dengan tabel bisnis di public
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE SCHEMA IF NOT EXISTS code_registry;

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABEL 1: cr_modules — Katalog modul bisnis
-- Hanya Tech Lead (Philips) yang boleh INSERT
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE code_registry.cr_modules (
  module_id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_name  VARCHAR(100) NOT NULL UNIQUE,
  module_path  VARCHAR(255) NOT NULL,
  description  TEXT,
  owner_dev    VARCHAR(100),
  tech_stack   VARCHAR(100) DEFAULT 'Next.js 16 + Supabase',
  status       VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
                 CHECK (status IN ('ACTIVE', 'DEPRECATED', 'PLANNED')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Komentar tabel
COMMENT ON TABLE code_registry.cr_modules IS 'Katalog modul bisnis — hanya Tech Lead yang boleh tambah';

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABEL 2: cr_patterns — Katalog design pattern
-- Hanya Tech Lead (Philips) yang boleh INSERT
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE code_registry.cr_patterns (
  pattern_id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pattern_name   VARCHAR(100) NOT NULL UNIQUE,
  category       VARCHAR(50) NOT NULL
                   CHECK (category IN (
                     'CREATIONAL', 'STRUCTURAL', 'BEHAVIORAL',
                     'ARCHITECTURAL', 'CONCURRENCY'
                   )),
  description    TEXT NOT NULL,
  when_to_use    TEXT,
  example_path   VARCHAR(255),
  is_mandatory   BOOLEAN NOT NULL DEFAULT FALSE,
  ai_instruction TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE code_registry.cr_patterns IS 'Katalog design pattern — hanya Tech Lead yang boleh tambah';

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABEL 3: cr_classes — Katalog class/interface/enum/type
-- AI boleh INSERT
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE code_registry.cr_classes (
  class_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_name       VARCHAR(150) NOT NULL,
  class_type       VARCHAR(30) NOT NULL
                     CHECK (class_type IN (
                       'CLASS', 'ABSTRACT_CLASS', 'INTERFACE',
                       'ENUM', 'TYPE', 'DECORATOR'
                     )),
  module_id        UUID NOT NULL REFERENCES code_registry.cr_modules(module_id),
  pattern_id       UUID REFERENCES code_registry.cr_patterns(pattern_id),
  parent_class_id  UUID REFERENCES code_registry.cr_classes(class_id),
  file_path        VARCHAR(255) NOT NULL,
  layer            VARCHAR(20) NOT NULL
                     CHECK (layer IN (
                       'CONTROLLER', 'SERVICE', 'REPOSITORY', 'DTO',
                       'ENTITY', 'MIDDLEWARE', 'HELPER', 'CORE'
                     )),
  is_abstract      BOOLEAN NOT NULL DEFAULT FALSE,
  implements_list  TEXT[],
  author           VARCHAR(100),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (class_name, module_id)
);

COMMENT ON TABLE code_registry.cr_classes IS 'Katalog class/interface/enum — AI boleh INSERT';

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABEL 4: cr_functions — Tabel utama, paling sering diquery AI
-- AI boleh INSERT + UPDATE
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE code_registry.cr_functions (
  func_id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  func_name      VARCHAR(150) NOT NULL,
  func_type      VARCHAR(20) NOT NULL DEFAULT 'ASYNC_FUNCTION'
                   CHECK (func_type IN (
                     'FUNCTION', 'METHOD', 'ASYNC_FUNCTION',
                     'CONSTRUCTOR', 'GETTER', 'SETTER', 'HOOK'
                   )),
  module_id      UUID NOT NULL REFERENCES code_registry.cr_modules(module_id),
  class_id       UUID REFERENCES code_registry.cr_classes(class_id),
  layer          VARCHAR(20) NOT NULL
                   CHECK (layer IN (
                     'CONTROLLER', 'SERVICE', 'REPOSITORY', 'DTO',
                     'HELPER', 'MIDDLEWARE', 'CORE'
                   )),
  file_path      VARCHAR(255) NOT NULL,
  parameters     JSONB,
  return_type    VARCHAR(100),
  description    TEXT NOT NULL,
  is_shared      BOOLEAN NOT NULL DEFAULT FALSE,
  is_deprecated  BOOLEAN NOT NULL DEFAULT FALSE,
  ai_generated   BOOLEAN NOT NULL DEFAULT FALSE,
  status         VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
                   CHECK (status IN ('ACTIVE', 'DEPRECATED', 'REVIEW')),
  author         VARCHAR(100),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (func_name, module_id, layer)
);

-- Index untuk fuzzy search — dipakai AI query Q-02
CREATE INDEX idx_cr_functions_func_name_trgm
  ON code_registry.cr_functions
  USING gin (func_name gin_trgm_ops);

COMMENT ON TABLE code_registry.cr_functions IS 'Katalog fungsi — AI boleh INSERT + UPDATE. Index pg_trgm untuk fuzzy search.';

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABEL 5: cr_function_deps — Dependency antar fungsi (M:N self-ref)
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE code_registry.cr_function_deps (
  from_func_id  UUID NOT NULL REFERENCES code_registry.cr_functions(func_id),
  to_func_id    UUID NOT NULL REFERENCES code_registry.cr_functions(func_id),
  dep_type      VARCHAR(30) NOT NULL DEFAULT 'CALLS'
                  CHECK (dep_type IN ('CALLS', 'IMPORTS', 'EXTENDS', 'IMPLEMENTS')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (from_func_id, to_func_id)
);

COMMENT ON TABLE code_registry.cr_function_deps IS 'Dependency graph antar fungsi — siapa memanggil siapa';

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABEL 6: cr_constants — Semua konstanta & enum terdaftar
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE code_registry.cr_constants (
  constant_id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  constant_name  VARCHAR(150) NOT NULL,
  constant_type  VARCHAR(30) NOT NULL DEFAULT 'ENUM'
                   CHECK (constant_type IN ('ENUM', 'CONST', 'CONFIG_KEY', 'MAP')),
  module_id      UUID NOT NULL REFERENCES code_registry.cr_modules(module_id),
  file_path      VARCHAR(255) NOT NULL,
  values         JSONB,
  description    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (constant_name, module_id)
);

COMMENT ON TABLE code_registry.cr_constants IS 'Semua konstanta dan enum terdaftar';

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABEL 7: cr_audit_log — Log perubahan registry, IMMUTABLE
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE code_registry.cr_audit_log (
  log_id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name   VARCHAR(50) NOT NULL,
  record_id    UUID NOT NULL,
  action       VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  changed_by   VARCHAR(100) NOT NULL,
  old_value    JSONB,
  new_value    JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tidak ada UPDATE/DELETE pada tabel ini — immutable by design
COMMENT ON TABLE code_registry.cr_audit_log IS 'Audit log perubahan registry — IMMUTABLE, tidak boleh UPDATE/DELETE';

-- ═══════════════════════════════════════════════════════════════════════════════
-- VIEW 1: v_shared_functions — Semua shared helper yang bisa dipakai ulang
-- Dipakai AI untuk Q-03: shared helper lookup
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW code_registry.v_shared_functions AS
SELECT
  f.func_id,
  f.func_name,
  f.func_type,
  f.file_path,
  f.parameters,
  f.return_type,
  f.description,
  m.module_name,
  f.status
FROM code_registry.cr_functions f
JOIN code_registry.cr_modules m ON f.module_id = m.module_id
WHERE f.is_shared = TRUE
  AND f.is_deprecated = FALSE
  AND f.status = 'ACTIVE';

-- ═══════════════════════════════════════════════════════════════════════════════
-- VIEW 2: v_module_summary — Ringkasan total class dan fungsi per modul
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW code_registry.v_module_summary AS
SELECT
  m.module_id,
  m.module_name,
  m.module_path,
  m.status,
  COUNT(DISTINCT c.class_id)  AS total_classes,
  COUNT(DISTINCT f.func_id)   AS total_functions,
  COUNT(DISTINCT f.func_id) FILTER (WHERE f.is_shared = TRUE) AS shared_functions
FROM code_registry.cr_modules m
LEFT JOIN code_registry.cr_classes c   ON c.module_id = m.module_id
LEFT JOIN code_registry.cr_functions f ON f.module_id = m.module_id
GROUP BY m.module_id, m.module_name, m.module_path, m.status;

-- ═══════════════════════════════════════════════════════════════════════════════
-- VIEW 3: v_potential_duplicates — Deteksi fungsi nama mirip (similarity > 0.7)
-- Dipakai weekly_duplicate_audit() dan AI query Q-02
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW code_registry.v_potential_duplicates AS
SELECT
  a.func_id   AS func_a_id,
  a.func_name AS func_a_name,
  a.file_path AS func_a_path,
  b.func_id   AS func_b_id,
  b.func_name AS func_b_name,
  b.file_path AS func_b_path,
  similarity(a.func_name, b.func_name) AS name_similarity
FROM code_registry.cr_functions a
JOIN code_registry.cr_functions b
  ON a.func_id < b.func_id
WHERE similarity(a.func_name, b.func_name) > 0.7
  AND a.status = 'ACTIVE'
  AND b.status = 'ACTIVE';

-- ═══════════════════════════════════════════════════════════════════════════════
-- STORED PROCEDURE: ai_safe_register()
-- Mencegah AI mendaftarkan fungsi duplikat
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION code_registry.ai_safe_register(
  p_func_name   VARCHAR,
  p_func_type   VARCHAR,
  p_module_id   UUID,
  p_class_id    UUID,
  p_layer       VARCHAR,
  p_file_path   VARCHAR,
  p_parameters  JSONB,
  p_return_type VARCHAR,
  p_description TEXT,
  p_is_shared   BOOLEAN DEFAULT FALSE,
  p_author      VARCHAR DEFAULT 'AI:claude'
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_existing  UUID;
  v_similar   RECORD;
  v_new_id    UUID;
BEGIN
  -- 1. Exact match check
  SELECT func_id INTO v_existing
  FROM code_registry.cr_functions
  WHERE func_name = p_func_name
    AND module_id = p_module_id
    AND layer     = p_layer;

  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object(
      'status',  'ERROR',
      'message', format('Fungsi "%s" sudah ada di modul ini (layer %s)', p_func_name, p_layer),
      'existing_func_id', v_existing
    );
  END IF;

  -- 2. Fuzzy similar check (> 0.7)
  SELECT func_id, func_name, similarity(func_name, p_func_name) AS sim
  INTO v_similar
  FROM code_registry.cr_functions
  WHERE module_id = p_module_id
    AND similarity(func_name, p_func_name) > 0.7
    AND func_name != p_func_name
  ORDER BY similarity(func_name, p_func_name) DESC
  LIMIT 1;

  IF v_similar IS NOT NULL THEN
    RETURN jsonb_build_object(
      'status',  'WARNING',
      'message', format('Fungsi mirip ditemukan: "%s" (similarity: %s). Pertimbangkan reuse.',
                        v_similar.func_name, round(v_similar.sim::numeric, 2)),
      'similar_func_id', v_similar.func_id
    );
  END IF;

  -- 3. Aman — INSERT
  INSERT INTO code_registry.cr_functions (
    func_name, func_type, module_id, class_id, layer, file_path,
    parameters, return_type, description, is_shared, ai_generated, author
  ) VALUES (
    p_func_name, p_func_type, p_module_id, p_class_id, p_layer, p_file_path,
    p_parameters, p_return_type, p_description, p_is_shared, TRUE, p_author
  )
  RETURNING func_id INTO v_new_id;

  -- 4. Audit log
  INSERT INTO code_registry.cr_audit_log (table_name, record_id, action, changed_by, new_value)
  VALUES ('cr_functions', v_new_id, 'INSERT', p_author,
    jsonb_build_object('func_name', p_func_name, 'module_id', p_module_id, 'layer', p_layer));

  RETURN jsonb_build_object(
    'status',  'REGISTERED',
    'func_id', v_new_id,
    'message', format('Fungsi "%s" berhasil didaftarkan', p_func_name)
  );
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- STORED PROCEDURE: weekly_duplicate_audit()
-- Mendeteksi semua pasang fungsi di modul berbeda dengan nama similarity > 0.75
-- Bisa dijadwalkan via pg_cron di Supabase (Senin 08:00 WIB)
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION code_registry.weekly_duplicate_audit()
RETURNS TABLE (
  func_a_name  VARCHAR,
  func_a_path  VARCHAR,
  func_b_name  VARCHAR,
  func_b_path  VARCHAR,
  similarity_score FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.func_name::VARCHAR,
    a.file_path::VARCHAR,
    b.func_name::VARCHAR,
    b.file_path::VARCHAR,
    similarity(a.func_name, b.func_name)::FLOAT
  FROM code_registry.cr_functions a
  JOIN code_registry.cr_functions b
    ON a.func_id < b.func_id
    AND a.module_id != b.module_id
  WHERE similarity(a.func_name, b.func_name) > 0.75
    AND a.status = 'ACTIVE'
    AND b.status = 'ACTIVE'
  ORDER BY similarity(a.func_name, b.func_name) DESC;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- SEED: cr_modules — 7 modul berdasarkan struktur folder aktual
-- ═══════════════════════════════════════════════════════════════════════════════
INSERT INTO code_registry.cr_modules (module_name, module_path, description, owner_dev) VALUES
  ('auth',       '/app/api/auth + /lib/auth.ts + /lib/auth-server.ts + /lib/session.ts + /lib/account-lock.ts',
   'Login, logout, OTP, biometric, session, account lock', 'Philips'),
  ('config',     '/app/api/config + /lib/config-registry.ts',
   'Config Registry — pembacaan konfigurasi bisnis dari DB', 'Philips'),
  ('message',    '/app/api/message-library + /lib/message-library.ts',
   'Message Library — teks dan pesan dari DB', 'Philips'),
  ('credential', '/lib/credential-reader.ts + /lib/credential-crypto.ts',
   'Credential management — baca dan dekripsi API keys dari DB', 'Philips'),
  ('vendor',     '/app/dashboard/vendor',
   'Vendor dashboard — halaman dan fitur vendor', 'Philips'),
  ('superadmin', '/app/dashboard/superadmin',
   'SuperAdmin dashboard — settings, user management', 'Philips'),
  ('shared',     '/lib/',
   'Shared helpers yang dipakai lintas modul (redis, cache, utils, policy)', 'Philips');

-- ═══════════════════════════════════════════════════════════════════════════════
-- SEED: cr_patterns — 5 pattern bawaan + 1 Config Registry Pattern
-- Pattern #6 (Config Registry) spesifik project ini — disetujui Philips Sesi #049
-- ═══════════════════════════════════════════════════════════════════════════════
INSERT INTO code_registry.cr_patterns (pattern_name, category, description, when_to_use, is_mandatory, ai_instruction) VALUES
  ('Repository Pattern', 'ARCHITECTURAL',
   'Abstraksi akses database — semua query DB hanya melalui Repository',
   'Setiap kali butuh baca/tulis database',
   TRUE,
   'Buat file di lib/repositories/. HANYA query database di sini. TIDAK ADA logika bisnis. Return raw entity.'),

  ('Service Layer', 'ARCHITECTURAL',
   'Layer logika bisnis — orchestrate Repository, validasi, kalkulasi',
   'Setiap kali ada logika bisnis yang bukan query DB murni',
   TRUE,
   'Buat file di lib/services/. SEMUA logika bisnis di sini. TIDAK BOLEH query DB langsung. Panggil Repository.'),

  ('DTO Pattern', 'STRUCTURAL',
   'Data Transfer Object — shape data masuk dan keluar, validasi via Zod',
   'Setiap input/output fungsi publik',
   TRUE,
   'Gunakan Zod schema. Validasi di Route Handler sebelum masuk Service. Return DTO dari Service ke caller.'),

  ('Factory Pattern', 'CREATIONAL',
   'Pembuatan objek kompleks melalui factory function',
   'Ketika pembuatan objek butuh logika kondisional atau konfigurasi',
   FALSE,
   'Pertimbangkan factory jika ada lebih dari 3 variasi pembuatan objek yang sama.'),

  ('Observer/Event Pattern', 'BEHAVIORAL',
   'Pub/Sub untuk komunikasi antar modul tanpa coupling langsung',
   'Notifikasi, logging, audit trail — ketika modul A perlu memberitahu modul B tanpa import langsung',
   FALSE,
   'Gunakan Supabase Realtime atau custom event emitter. Jangan import langsung antar modul.'),

  ('Config Registry Pattern', 'ARCHITECTURAL',
   'Semua nilai bisnis, timeout, teks UI, flag — wajib dibaca dari DB via Layer 0, tidak boleh hardcode',
   'Setiap kali butuh nilai yang bisa berubah: batas percobaan, durasi lock, teks pesan, flag fitur',
   TRUE,
   'SEBELUM hardcode nilai apapun: cek config_registry via getConfigValue() atau message_library via getMessage(). Kalau key belum ada — buat key baru di DB dulu. JANGAN tulis nilai langsung di kode. Pelanggaran = pelanggaran ATURAN 1 di CLAUDE.md.');

-- ═══════════════════════════════════════════════════════════════════════════════
-- TRIGGER: updated_at otomatis untuk tabel yang punya kolom updated_at
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION code_registry.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cr_modules_updated_at
  BEFORE UPDATE ON code_registry.cr_modules
  FOR EACH ROW EXECUTE FUNCTION code_registry.set_updated_at();

CREATE TRIGGER trg_cr_patterns_updated_at
  BEFORE UPDATE ON code_registry.cr_patterns
  FOR EACH ROW EXECUTE FUNCTION code_registry.set_updated_at();

CREATE TRIGGER trg_cr_classes_updated_at
  BEFORE UPDATE ON code_registry.cr_classes
  FOR EACH ROW EXECUTE FUNCTION code_registry.set_updated_at();

CREATE TRIGGER trg_cr_functions_updated_at
  BEFORE UPDATE ON code_registry.cr_functions
  FOR EACH ROW EXECUTE FUNCTION code_registry.set_updated_at();

CREATE TRIGGER trg_cr_constants_updated_at
  BEFORE UPDATE ON code_registry.cr_constants
  FOR EACH ROW EXECUTE FUNCTION code_registry.set_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════════
-- SELESAI — Verifikasi:
--   1. Schema code_registry ada di Supabase Table Editor
--   2. 7 tabel: cr_modules, cr_patterns, cr_classes, cr_functions,
--               cr_function_deps, cr_constants, cr_audit_log
--   3. 3 views: v_shared_functions, v_module_summary, v_potential_duplicates
--   4. 2 stored functions: ai_safe_register(), weekly_duplicate_audit()
--   5. cr_modules: 7 baris (auth, config, message, credential, vendor, superadmin, shared)
--   6. cr_patterns: 6 baris (3 mandatory + 3 optional)
-- ═══════════════════════════════════════════════════════════════════════════════
