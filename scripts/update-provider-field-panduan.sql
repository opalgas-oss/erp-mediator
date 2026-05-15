-- Migration: Update panduan_langkah untuk semua provider field definitions
-- S#152 — Panduan kontekstual per field (cara mendapatkan credential)
-- Jalankan di Supabase SQL Editor: supabase.com → project → SQL Editor → New Query

DO $$
DECLARE
  v_supabase_id   uuid;
  v_cloudinary_id uuid;
  v_fonnte_id     uuid;
  v_xendit_id     uuid;
  v_upstash_id    uuid;
  v_smtp_id       uuid;
  v_cloudflare_id uuid;
  v_sb_mgmt_id    uuid;
  v_github_id     uuid;
  v_vercel_id     uuid;
BEGIN

  -- Ambil semua provider IDs
  SELECT id INTO v_supabase_id   FROM service_providers WHERE kode = 'supabase';
  SELECT id INTO v_cloudinary_id FROM service_providers WHERE kode = 'cloudinary';
  SELECT id INTO v_fonnte_id     FROM service_providers WHERE kode = 'fonnte';
  SELECT id INTO v_xendit_id     FROM service_providers WHERE kode = 'xendit';
  SELECT id INTO v_upstash_id    FROM service_providers WHERE kode = 'upstash';
  SELECT id INTO v_smtp_id       FROM service_providers WHERE kode = 'smtp';
  SELECT id INTO v_cloudflare_id FROM service_providers WHERE kode = 'cloudflare';
  SELECT id INTO v_sb_mgmt_id    FROM service_providers WHERE kode = 'supabase-management';
  SELECT id INTO v_github_id     FROM service_providers WHERE kode = 'github';
  SELECT id INTO v_vercel_id     FROM service_providers WHERE kode = 'vercel';

  -- ─── SUPABASE ──────────────────────────────────────────────────────────────

  UPDATE provider_field_definitions SET panduan_langkah = '[
    {"no": 1, "teks": "Buka **supabase.com** → login → pilih project Anda"},
    {"no": 2, "teks": "Klik **Settings** di sidebar kiri → **API**"},
    {"no": 3, "teks": "Salin **Project URL** dari bagian \"Project URL\""},
    {"no": 4, "teks": "Format: https://xxxxxxxxxxxx.supabase.co"}
  ]'::jsonb WHERE provider_id = v_supabase_id AND field_key = 'project_url';

  UPDATE provider_field_definitions SET panduan_langkah = '[
    {"no": 1, "teks": "Buka **supabase.com** → login → pilih project → **Settings** → **API**"},
    {"no": 2, "teks": "Salin **anon / public** key dari bagian \"Project API keys\""},
    {"no": 3, "teks": "Key ini aman digunakan di browser (bukan secret)"}
  ]'::jsonb WHERE provider_id = v_supabase_id AND field_key = 'anon_key';

  UPDATE provider_field_definitions SET panduan_langkah = '[
    {"no": 1, "teks": "Buka **supabase.com** → login → pilih project → **Settings** → **API**"},
    {"no": 2, "teks": "Klik tombol **Reveal** di bagian \"Project API keys\""},
    {"no": 3, "teks": "Salin **service_role** key"},
    {"no": 4, "teks": "⚠️ **JANGAN expose ke browser** — key ini memiliki akses penuh ke DB"}
  ]'::jsonb WHERE provider_id = v_supabase_id AND field_key = 'service_role_key';

  UPDATE provider_field_definitions SET panduan_langkah = '[
    {"no": 1, "teks": "Buka **supabase.com** → login → pilih project → **Settings** → **API**"},
    {"no": 2, "teks": "Scroll ke bagian **JWT Settings**"},
    {"no": 3, "teks": "Klik **Reveal** lalu salin **JWT Secret**"}
  ]'::jsonb WHERE provider_id = v_supabase_id AND field_key = 'jwt_secret';

  -- ─── CLOUDINARY ────────────────────────────────────────────────────────────

  UPDATE provider_field_definitions SET panduan_langkah = '[
    {"no": 1, "teks": "Buka **cloudinary.com** → login ke akun Anda"},
    {"no": 2, "teks": "Di halaman **Dashboard**, lihat bagian **Product Environment**"},
    {"no": 3, "teks": "Salin **Cloud Name** (contoh: dxyz123abc)"}
  ]'::jsonb WHERE provider_id = v_cloudinary_id AND field_key = 'cloud_name';

  UPDATE provider_field_definitions SET panduan_langkah = '[
    {"no": 1, "teks": "Buka **cloudinary.com** → login → klik nama akun pojok kanan atas"},
    {"no": 2, "teks": "Pilih **Settings** → **Access Keys**"},
    {"no": 3, "teks": "Salin **API Key** (angka panjang — bukan yang secret)"}
  ]'::jsonb WHERE provider_id = v_cloudinary_id AND field_key = 'api_key';

  UPDATE provider_field_definitions SET panduan_langkah = '[
    {"no": 1, "teks": "Buka **cloudinary.com** → login → klik nama akun → **Settings** → **Access Keys**"},
    {"no": 2, "teks": "Klik **Reveal** lalu salin **API Secret**"},
    {"no": 3, "teks": "⚠️ Jangan share ke siapapun — disimpan terenkripsi"}
  ]'::jsonb WHERE provider_id = v_cloudinary_id AND field_key = 'api_secret';

  -- ─── FONNTE ────────────────────────────────────────────────────────────────

  UPDATE provider_field_definitions SET panduan_langkah = '[
    {"no": 1, "teks": "Buka **fonnte.com** → login → klik **Device** di menu kiri"},
    {"no": 2, "teks": "Pilih device WhatsApp yang sudah terhubung (status harus Connected)"},
    {"no": 3, "teks": "Salin **Token** dari halaman detail device"},
    {"no": 4, "teks": "Jika belum ada device → klik + Add Device dan scan QR code WA dulu"}
  ]'::jsonb WHERE provider_id = v_fonnte_id AND field_key = 'api_token';

  UPDATE provider_field_definitions SET panduan_langkah = '[
    {"no": 1, "teks": "Buka **fonnte.com** → login → klik **Device**"},
    {"no": 2, "teks": "Lihat kolom **Number** — nomor WA yang terdaftar"},
    {"no": 3, "teks": "Gunakan format internasional tanpa + (contoh: **6281234567890**)"}
  ]'::jsonb WHERE provider_id = v_fonnte_id AND field_key = 'device_number';

  -- ─── XENDIT ────────────────────────────────────────────────────────────────

  UPDATE provider_field_definitions SET panduan_langkah = '[
    {"no": 1, "teks": "Pilih **production** untuk menerima pembayaran nyata"},
    {"no": 2, "teks": "Pilih **sandbox** untuk testing — tidak ada uang sungguhan"},
    {"no": 3, "teks": "Pastikan Secret Key dan Public Key yang diisi sesuai mode yang dipilih"}
  ]'::jsonb WHERE provider_id = v_xendit_id AND field_key = 'mode';

  UPDATE provider_field_definitions SET panduan_langkah = '[
    {"no": 1, "teks": "Buka **dashboard.xendit.co** → login → klik **Settings**"},
    {"no": 2, "teks": "Pilih **Developers** → **API Keys**"},
    {"no": 3, "teks": "Salin **Secret Key** (dimulai xnd_production_ atau xnd_development_)"},
    {"no": 4, "teks": "⚠️ Jangan share — disimpan terenkripsi"}
  ]'::jsonb WHERE provider_id = v_xendit_id AND field_key = 'secret_key';

  UPDATE provider_field_definitions SET panduan_langkah = '[
    {"no": 1, "teks": "Buka **dashboard.xendit.co** → login → Settings → Developers → API Keys"},
    {"no": 2, "teks": "Salin **Public Key** — aman digunakan di browser"}
  ]'::jsonb WHERE provider_id = v_xendit_id AND field_key = 'public_key';

  UPDATE provider_field_definitions SET panduan_langkah = '[
    {"no": 1, "teks": "Buka **dashboard.xendit.co** → login → Settings → **Webhooks**"},
    {"no": 2, "teks": "Salin **Webhook Verification Token** di bagian atas halaman"},
    {"no": 3, "teks": "Dipakai untuk verifikasi signature setiap notifikasi dari Xendit"}
  ]'::jsonb WHERE provider_id = v_xendit_id AND field_key = 'webhook_token';

  -- ─── UPSTASH REDIS ─────────────────────────────────────────────────────────

  UPDATE provider_field_definitions SET panduan_langkah = '[
    {"no": 1, "teks": "Buka **upstash.com** → login → pilih database Redis Anda"},
    {"no": 2, "teks": "Klik tab **REST API**"},
    {"no": 3, "teks": "Salin **UPSTASH_REDIS_REST_URL** (format: https://xxx.upstash.io)"}
  ]'::jsonb WHERE provider_id = v_upstash_id AND field_key = 'rest_url';

  UPDATE provider_field_definitions SET panduan_langkah = '[
    {"no": 1, "teks": "Buka **upstash.com** → login → pilih database Redis → tab **REST API**"},
    {"no": 2, "teks": "Salin **UPSTASH_REDIS_REST_TOKEN**"},
    {"no": 3, "teks": "⚠️ Jangan share — disimpan terenkripsi"}
  ]'::jsonb WHERE provider_id = v_upstash_id AND field_key = 'rest_token';

  -- ─── SMTP ──────────────────────────────────────────────────────────────────

  UPDATE provider_field_definitions SET panduan_langkah = '[
    {"no": 1, "teks": "Gmail: **smtp.gmail.com** | Yahoo: **smtp.mail.yahoo.com**"},
    {"no": 2, "teks": "Mailgun: **smtp.mailgun.org** | SendGrid: **smtp.sendgrid.net**"},
    {"no": 3, "teks": "Cek dokumentasi SMTP provider email Anda jika tidak tercantum di sini"}
  ]'::jsonb WHERE provider_id = v_smtp_id AND field_key = 'host';

  UPDATE provider_field_definitions SET panduan_langkah = '[
    {"no": 1, "teks": "Port standar: **587** (TLS/STARTTLS) — direkomendasikan"},
    {"no": 2, "teks": "Alternatif: **465** (SSL) atau **25** (tanpa enkripsi, tidak disarankan)"},
    {"no": 3, "teks": "Gunakan **587** jika tidak yakin"}
  ]'::jsonb WHERE provider_id = v_smtp_id AND field_key = 'port';

  UPDATE provider_field_definitions SET panduan_langkah = '[
    {"no": 1, "teks": "Gmail: aktifkan **2FA** dulu di akun Google Anda"},
    {"no": 2, "teks": "Buka **myaccount.google.com/apppasswords**"},
    {"no": 3, "teks": "Buat app password → pilih app: Mail → device: Other → **Generate**"},
    {"no": 4, "teks": "Salin 16-karakter password → tempel ke kolom ini"}
  ]'::jsonb WHERE provider_id = v_smtp_id AND field_key = 'password';

  -- ─── CLOUDFLARE ────────────────────────────────────────────────────────────

  UPDATE provider_field_definitions SET panduan_langkah = '[
    {"no": 1, "teks": "Buka **cloudflare.com** → login → klik nama domain Anda"},
    {"no": 2, "teks": "Di halaman **Overview**, scroll ke panel kanan bawah bagian **API**"},
    {"no": 3, "teks": "Salin **Zone ID**"}
  ]'::jsonb WHERE provider_id = v_cloudflare_id AND field_key = 'zone_id';

  UPDATE provider_field_definitions SET panduan_langkah = '[
    {"no": 1, "teks": "Buka **cloudflare.com** → login → klik foto profil → **Profile** → **API Tokens**"},
    {"no": 2, "teks": "Klik **Create Token** → pilih template atau Custom Token"},
    {"no": 3, "teks": "Set permissions → **Continue to summary** → **Create Token**"},
    {"no": 4, "teks": "Salin token (hanya muncul sekali) → tempel ke kolom ini"}
  ]'::jsonb WHERE provider_id = v_cloudflare_id AND field_key = 'api_token';

  UPDATE provider_field_definitions SET panduan_langkah = '[
    {"no": 1, "teks": "Buka **cloudflare.com** → login → klik nama domain Anda"},
    {"no": 2, "teks": "Di panel kanan halaman **Overview**, salin **Account ID**"}
  ]'::jsonb WHERE provider_id = v_cloudflare_id AND field_key = 'account_id';

  -- ─── SUPABASE MANAGEMENT (monitoring) ─────────────────────────────────────

  UPDATE provider_field_definitions SET panduan_langkah = '[
    {"no": 1, "teks": "Buka **supabase.com** → login → klik foto profil pojok kanan atas → **Account**"},
    {"no": 2, "teks": "Pilih **Access Tokens** di menu kiri"},
    {"no": 3, "teks": "Klik **Generate new token** → beri nama: ERP Monitoring → **Generate**"},
    {"no": 4, "teks": "Salin token (hanya muncul sekali) → tempel ke kolom ini"}
  ]'::jsonb WHERE provider_id = v_sb_mgmt_id AND field_key = 'access_token';

  -- ─── GITHUB (monitoring) ───────────────────────────────────────────────────

  UPDATE provider_field_definitions SET panduan_langkah = '[
    {"no": 1, "teks": "Buka **github.com** → login → klik foto profil → **Settings**"},
    {"no": 2, "teks": "Scroll ke bawah → **Developer settings** → **Personal access tokens** → **Fine-grained tokens**"},
    {"no": 3, "teks": "Klik **Generate new token** → beri nama, set expiration, pilih repository"},
    {"no": 4, "teks": "Permissions minimal: **Actions** (Read) + **Metadata** (Read)"},
    {"no": 5, "teks": "Salin token → tempel ke kolom ini (terenkripsi)"}
  ]'::jsonb WHERE provider_id = v_github_id AND field_key = 'personal_access_token';

  UPDATE provider_field_definitions SET panduan_langkah = '[
    {"no": 1, "teks": "Lihat URL repository GitHub: **github.com/[owner]/[repo]**"},
    {"no": 2, "teks": "Salin bagian **[owner]** — username personal atau nama organisasi"},
    {"no": 3, "teks": "Contoh: github.com/**philips-erp**/mediator → isi **philips-erp**"}
  ]'::jsonb WHERE provider_id = v_github_id AND field_key = 'repository_owner';

  UPDATE provider_field_definitions SET panduan_langkah = '[
    {"no": 1, "teks": "Lihat URL repository GitHub: **github.com/[owner]/[repo]**"},
    {"no": 2, "teks": "Salin bagian **[repo]** — nama repository"},
    {"no": 3, "teks": "Contoh: github.com/philips-erp/**mediator** → isi **mediator**"}
  ]'::jsonb WHERE provider_id = v_github_id AND field_key = 'repository_name';

  -- ─── VERCEL (monitoring) ───────────────────────────────────────────────────

  UPDATE provider_field_definitions SET panduan_langkah = '[
    {"no": 1, "teks": "Buka **vercel.com** → login → klik foto profil → **Account Settings**"},
    {"no": 2, "teks": "Pilih **Tokens** di menu kiri → klik **Create**"},
    {"no": 3, "teks": "Beri nama: ERP Monitoring, scope: Full Account → **Create Token**"},
    {"no": 4, "teks": "Salin token (hanya muncul sekali) → tempel ke kolom ini"}
  ]'::jsonb WHERE provider_id = v_vercel_id AND field_key = 'api_token';

  UPDATE provider_field_definitions SET panduan_langkah = '[
    {"no": 1, "teks": "Buka **vercel.com** → login → masuk ke project Anda"},
    {"no": 2, "teks": "Klik **Settings** → **General** → scroll ke bagian **Project ID**"},
    {"no": 3, "teks": "Salin Project ID → tempel ke kolom ini"}
  ]'::jsonb WHERE provider_id = v_vercel_id AND field_key = 'project_id';

  UPDATE provider_field_definitions SET panduan_langkah = '[
    {"no": 1, "teks": "Kosongkan jika menggunakan **akun personal** Vercel (bukan tim)"},
    {"no": 2, "teks": "Jika pakai **tim**: buka Team Settings → General → salin **Team ID**"}
  ]'::jsonb WHERE provider_id = v_vercel_id AND field_key = 'team_id';

  RAISE NOTICE 'Migration selesai: panduan_langkah diupdate untuk semua provider field definitions';

END $$;
