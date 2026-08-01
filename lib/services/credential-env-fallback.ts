// lib/services/credential-env-fallback.ts
// Peta nama variabel .env per provider — jaring terakhir saat credential belum ada di Supabase
// Bagian dari klaster `credential.service` — barrel-nya tetap `lib/services/credential.service.ts`,
// sehingga SELURUH pemanggil lama TIDAK perlu diubah satu baris pun.
//   Lahir: Sesi #428 — 1 Agustus 2026, pemecahan `lib/services/credential.service.ts`
//   **17.721 B = 173% batas 10 KB** atas keputusan Philips K-428-3. Verbatim: "file
//   credential.service.ts, lakukan split menjadi beberapa cluster berdasarkan kategori / fungsi /
//   modul / apapun yang sesuai denga karakter project kita sehingga memudahkan kamu bekerja".
//   Sumbu = ALASAN BERUBAH (sama seperti `app-error.service.ts` S#427 dan `lib/maintenance.ts`
//   S#428) — bukan ukuran, bukan urutan penulisan:
//     credential-env-fallback  → berubah saat NAMA VARIABEL .env berubah
//     credential-baca          → berubah saat strategi CACHE / DEKRIPSI runtime berubah
//     credential-katalog       → berubah saat yang DITAMPILKAN di Dashboard SA berubah
//     credential-ubah          → berubah saat BENTUK PAYLOAD tulis berubah
//     credential-uji           → berubah saat pemetaan HEALTH / provider-tester berubah
//   Batas tiap blok DIHITUNG PROGRAM (mundur dari `export` sampai awal JSDoc-nya), bukan ditebak —
//   tebakan pertama S#428 memotong JSDoc `toggleProviderIsAktif` dan menukar JSDoc
//   `getCredentialPlaintext` ke klaster yang salah. Ditangkap uji balik, bukan lolos.
//   Isi dipindah MEKANIS per-baris dari salinan byte-exact ber-checksum
//   (SHA-256 ac179ce6…c3c3e, 17.721 B) — nol karakter kode diketik ulang, nol komentar dipangkas
//   (K-426-2). Arsip: `_arsip/coding-history/sesi-428-credential-split/`.
//
// PERTANYAAN YANG DIJAWAB BERKAS INI: "kalau credential provider X belum ada di Supabase, nama variabel .env-nya apa?"
//
// Dipakai DUA klaster: `credential-baca` (getCredential + getCredentialsByProvider) dan
// `credential-uji` (testKoneksi). Itulah sebabnya ia berdiri sendiri — kalau menumpang di salah
// satunya, klaster yang lain harus mengimpor dari saudaranya tanpa alasan.

// ─── ENV_FALLBACK ─────────────────────────────────────────────────────────────
// Fallback ke .env jika credential belum ada di DB.
// Target jangka panjang: semua provider pindah ke DB (eliminasi .env provider keys).

// ⚠️ `export` DITAMBAHKAN S#428 — di berkas asli konstanta ini PRIVAT (tanpa `export`) karena
//    pemakainya satu berkas. Begitu ia pindah rumah, privat berarti tidak terlihat siapa pun:
//    build GAGAL dengan "The module has no exports at all". Satu kata, empat error.
export const ENV_FALLBACK: Record<string, Record<string, string>> = {
  supabase: {
    project_url:      'NEXT_PUBLIC_SUPABASE_URL',
    anon_key:         'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    service_role_key: 'SUPABASE_SERVICE_ROLE_KEY',
    jwt_secret:       'SUPABASE_JWT_SECRET',
  },
  upstash: {
    rest_url:   'UPSTASH_REDIS_REST_URL',
    rest_token: 'UPSTASH_REDIS_REST_TOKEN',
  },
  fonnte: {
    api_token:     'FONNTE_API_KEY',
    device_number: 'FONNTE_DEVICE_NUMBER',
  },
  xendit: {
    secret_key:    'XENDIT_SECRET_KEY',
    webhook_token: 'XENDIT_WEBHOOK_TOKEN',
  },
  cloudinary: {
    cloud_name: 'CLOUDINARY_CLOUD_NAME',
    api_key:    'CLOUDINARY_API_KEY',
    api_secret: 'CLOUDINARY_API_SECRET',
  },
  smtp: {
    host:       'SMTP_HOST',
    port:       'SMTP_PORT',
    username:   'SMTP_USERNAME',
    password:   'SMTP_PASSWORD',
    from_name:  'SMTP_FROM_NAME',
    from_email: 'SMTP_FROM_EMAIL',
  },
}

