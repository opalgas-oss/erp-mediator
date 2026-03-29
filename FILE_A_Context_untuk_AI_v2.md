# FILE_A — CONTEXT UNTUK AI
## Platform Marketplace Jasa Reverse Auction
### Versi 2.0 — Dokumen Final
### Dibuat: 27 Maret 2026

---

> ⚠️ **INSTRUKSI UNTUK AI — BACA SEBELUM MENJAWAB APAPUN**
>
> Nama project: Platform Marketplace Jasa Reverse Auction (Multi-Tenant, Multi-Brand)
> Pemilik: Pemula vibe coding — tidak bisa coding manual
> Gunakan Bahasa Indonesia yang mudah dipahami
> Jelaskan setiap langkah secara lengkap beserta alasan dan fungsinya
> Format instruksi WAJIB menggunakan:
> 📍 Di mana: [lokasi]
> ⌨️ Ketik: [perintah]
> ⏎ Lalu: Tekan Enter

---

## TECH STACK — SUDAH FINAL, JANGAN UBAH TANPA KONFIRMASI PEMILIK

```
Frontend Web    : Next.js 14+ (App Router)
Mobile App      : React Native + Expo
Database        : Google Firestore (NoSQL, real-time, struktur multi-tenant)
Auth            : Firebase Authentication + MFA
Storage         : Cloudinary (bukan Firebase Storage — berbayar)
Backend Logic   : Firebase Cloud Functions (Serverless)
Hosting         : Vercel (free tier)
WA API          : Fonnte (multi nomor, auto-switch)
Payment         : Xendit (QRIS, VA Bank, Transfer Manual)
Security        : Cloudflare WAF + Firestore Security Rules + JWT
AI & Chatbot    : Google Gemini API (free quota)
UI Components   : shadcn/ui + Tailwind CSS
```

**Semua solusi HARUS gratis/freemium kecuali ada konfirmasi eksplisit dari pemilik.**

---

## BAB 1 — VISI & MODEL BISNIS

### 1.1 Apa yang Dibangun

Platform ini adalah **Marketplace Jasa berbasis Reverse Auction** yang sepenuhnya dapat dikonfigurasi. Filosofi utama:

> *"Sistem yang bekerja otomatis 24 jam — Manusia hanya mengambil keputusan strategis — Tidak bergantung pada SDM IT."*

Platform ini **bukan** hanya untuk satu bisnis atau satu kategori jasa. Platform ini adalah **mesin workflow** yang bisa dipakai oleh bisnis apapun yang memiliki pola:

```
Pembeli butuh sesuatu
        ↓
Sistem cari penyedia terbaik secara otomatis (Reverse Auction)
        ↓
Dana aman di Escrow selama proses berlangsung
        ↓
Pekerjaan selesai & dikonfirmasi
        ↓
Dana cair otomatis ke Vendor (dikurangi komisi)
```

### 1.2 Model Bisnis — Multi-Tenant, Multi-Brand

Platform ini mendukung dua model bisnis yang berjalan **bersamaan secara paralel**:

```
MODEL A — Operasikan Sendiri:
Platform Owner rekrut vendor & customer sendiri
Ambil komisi dari setiap transaksi
Contoh: seperti Gojek yang operasikan layanannya sendiri

MODEL B — Sewakan ke Bisnis Lain (SaaS):
Bisnis lain sewa/beli platform ini untuk brand mereka sendiri
Platform Owner dapat bayaran dari subscription/lisensi
Contoh: seperti Shopify yang dipakai merchant lain
```

Setiap "penyewa" platform disebut **Tenant**. Setiap Tenant memiliki:
- Brand & tampilan sendiri (nama, logo, warna)
- Database terisolasi (data tidak bisa tercampur antar tenant)
- Vendor & Customer sendiri
- Konfigurasi bisnis sendiri (komisi, kategori, kota, dll)
- Laporan keuangan sendiri

### 1.3 Pengguna Platform

| Peran | Akses | Yang Bisa Dilakukan |
|-------|-------|---------------------|
| Platform Owner | Semua tenant | Monitor semua tenant, billing, system config |
| Tenant Super Admin | Tenant sendiri | Semua konfigurasi bisnis, vendor approval |
| Tenant Dispatcher | Tenant sendiri | Monitor order, override manual |
| Tenant Finance | Tenant sendiri | Kelola escrow, approve disbursement |
| Tenant Support | Tenant sendiri | Handle dispute, chat monitoring |
| Vendor | Toko sendiri | Kelola toko, terima & bid order |
| Customer | — | Browse, order, chat, review |

---

## BAB 2 — ARSITEKTUR MULTI-TENANT

### 2.1 Konsep Isolasi Data

```
PLATFORM ENGINE (satu sistem)
        │
        ├── /tenants/tenant_A_id/    ← "BungaKita.id"
        │         └── semua data tenant A
        │
        ├── /tenants/tenant_B_id/    ← "ServisAja.id"
        │         └── semua data tenant B
        │
        └── /tenants/tenant_C_id/    ← bisnis Anda sendiri
                  └── semua data tenant C
```

Setiap request dari user WAJIB membawa `tenant_id`. Tidak ada data yang bisa diakses lintas tenant kecuali oleh Platform Owner.

### 2.2 Lapisan Sistem

**Lapisan Tampilan (Client):**
```
Website (Next.js)    : Browser — untuk semua peran
Mobile App (Expo)    : Android & iOS — untuk Customer & Vendor
WhatsApp Bot (Fonnte): Untuk Customer & Vendor yang tidak install app
```

**Lapisan Logika (Server):**
```
Next.js API Routes      : Validasi, kalkulasi harga, autentikasi
Firebase Cloud Functions: Otomasi (timer, blast, escrow release, chatbot)
Cloudflare WAF          : Perisai pertama — blokir DDoS, bot, XSS
```

**Lapisan Data:**
```
Firestore    : Database utama real-time, struktur multi-tenant
Cloudinary   : Storage foto & video (portofolio, bukti kerja, chat media)
Firebase Auth: Login + MFA, Custom Claims per tenant
```

### 2.3 Daftar Modul & Urutan Pembangunan

| No | Modul | Fungsi | Fase | Depends On |
|----|-------|--------|------|------------|
| M1 | Foundation & Config | Multi-tenant setup, Auth, RBAC, semua konfigurasi dinamis | Fase 1 | — |
| M2 | Vendor Store | Vendor kelola toko, produk, portofolio | Fase 1 | M1 |
| M3 | Order Engine | Buat & track pesanan real-time | Fase 2 | M1, M2 |
| M4 | Reverse Auction | Timer T1/T2, form bidding, validasi harga | Fase 2 | M3 |
| M5 | Payment & Escrow | Xendit, Transfer Manual, escrow, disbursement | Fase 2 | M3, M4 |
| M6 | WA Blast Engine | Multi nomor WA, auto-switch, template dinamis | Fase 2 | M3 |
| M7 | AI Chatbot & Chat | Bot 24 jam, chat anonim, sensor info pribadi | Fase 3 | M3, M6 |
| M8 | Dispute & Resolusi | Eskalasi otomatis, freeze escrow, resolusi | Fase 3 | M5, M7 |
| M9 | Command Center | Dashboard real-time per tenant | Fase 3 | M3, M4, M5 |
| M10 | Analytics & BI | Laporan, vendor scoring, fraud detection | Fase 4 | semua |
| M11 | Mobile App | React Native + Expo, semua fitur web | Fase 4 | semua |
| M12 | Security Layer | Rules lengkap, rate limiting, enkripsi | Semua Fase | M1 |

---

## BAB 3 — KONFIGURASI DINAMIS (TIDAK ADA YANG HARDCODE)

### 3.1 Prinsip Utama

> **SEMUA aspek bisnis HARUS bisa diubah oleh Admin dari dashboard — tanpa coding, tanpa restart sistem.**

Yang wajib dinamis:

```
✅ Nama brand, logo, warna tema
✅ Domain/subdomain per tenant
✅ Kategori jasa (tambah/hapus/edit kapan saja)
✅ Kota & area coverage (tambah/hapus kapan saja)
✅ Persentase komisi per kategori/vendor
✅ Nilai minimum komisi
✅ Komisi dibebankan ke customer atau kurangi vendor
✅ Timer T1, T2, T3 (durasi bisa diubah per kategori)
✅ Template pesan WA (teks bisa diedit)
✅ Nomor WA blast (tambah/hapus/aktif/nonaktif)
✅ Metode payment yang aktif per tenant
✅ Nomor rekening Transfer Manual
✅ Jam operasional per hari per kategori
✅ Batas maksimal harga bidding
✅ Syarat & ketentuan per tenant
✅ Pesan otomatis bot (semua teks bisa diedit)
```

### 3.2 Logika Komisi

```
RUMUS:
komisi = MAX(komisi_minimum, persentase × harga_final)

KOMPONEN harga_final:
harga_final = harga_produk + ongkos_kirim

CONTOH (setting default, bisa diubah admin):
komisi_minimum = Rp 50.000
persentase     = 10%

Contoh 1: harga_final = Rp 800.000
  10% × 800.000 = Rp 80.000
  MAX(50.000, 80.000) = Rp 80.000  ← komisi yang berlaku

Contoh 2: harga_final = Rp 300.000
  10% × 300.000 = Rp 30.000
  MAX(50.000, 30.000) = Rp 50.000  ← komisi minimum berlaku

PILIHAN PEMBEBANAN (admin yang setting):
Opsi A: Komisi ditambahkan ke tagihan customer
  → Customer bayar: harga_final + komisi
Opsi B: Komisi dipotong dari pendapatan vendor
  → Vendor terima: harga_final - komisi
```

**Semua nilai ini tersimpan di Firestore dan bisa diubah dari dashboard kapan saja.**

---

## BAB 4 — ALUR BISNIS LENGKAP

### 4.1 Alur Onboarding Vendor

```
Vendor daftar akun
        ↓
Isi profil toko: nama, deskripsi, foto, kategori, kota coverage
        ↓
Upload dokumen verifikasi (KTP, foto usaha, portofolio)
        ↓
Status: PENDING_VERIFICATION
        ↓
Admin review & approve/reject
        ↓
Jika APPROVED → vendor bisa publish produk & terima order
Jika REJECTED → vendor dapat notifikasi alasan & bisa revisi
```

### 4.2 Alur Manajemen Produk Vendor

```
Vendor login ke dashboard toko
        ↓
Tambah produk baru:
  - Nama produk
  - Deskripsi detail
  - Foto/video produk (upload ke Cloudinary)
  - Harga publish (harga normal yang tampil di website)
  - Estimasi pengerjaan
  - Area coverage
  - Stok/ketersediaan
        ↓
Produk tampil di marketplace setelah admin approve
```

### 4.3 Alur Order Lengkap (Happy Path)

```
Customer browse produk/jasa di Website, App, atau WA Bot
        ↓
Customer buat order:
  - Pilih kategori & produk
  - Isi deskripsi kebutuhan detail
  - Input budget maksimal
  - Pilih lokasi & kota
  - Pilih jadwal deliver yang diinginkan
        ↓
Sistem buat order di Firestore → status: PENDING
        ↓
Cloud Function deteksi order baru
  → Filter vendor by kota, kategori, is_active
  → Urutkan by skor (rating, total_completed, jarak)
  → Blast WA ke semua vendor yang relevan
        ↓
STATUS: T1_AUCTION (timer T1 mulai berjalan)
        ↓
FASE T1 — Vendor Bidding:
  Vendor klik link JWT dari WA
  → Buka form bidding:
      ✅ Konfirmasi sanggup handle kebutuhan
      ✅ Input harga bidding
         (sistem cek: harga bidding ≤ harga publish)
         (jika lebih mahal → TOLAK, minta revisi harga publish dulu)
      ✅ Input ongkos kirim
      ✅ Input estimasi lama pengerjaan
      ✅ Konfirmasi kesanggupan ontime delivery
  → Submit bidding
        ↓
Sistem pilih vendor terbaik:
  Syarat: harga dalam budget customer DAN jadwal bisa disanggupi
  Jika tidak ada yang memenuhi → Hot Potato ke vendor berikutnya
  Jika T1 habis tanpa vendor → STATUS: T2_DIRECT
        ↓
Vendor terpilih → sistem hitung harga final di server:
  harga_final = harga_bidding + ongkos_kirim
  komisi = MAX(komisi_minimum, persentase × harga_final)
  total_customer = harga_final + komisi (jika dibebankan ke customer)
        ↓
Kirim link JWT ke Customer untuk bayar
STATUS: T2_PAYMENT (timer T2 mulai, default 60 menit)
        ↓
Customer bayar via Xendit (QRIS/VA/Transfer Manual)
Dana masuk → STATUS: ESCROW_LOCKED
Notif WA otomatis ke Vendor: "Dana aman, silakan mulai bekerja"
        ↓
STATUS: IN_PROGRESS
Vendor kerjakan order
        ↓
Vendor upload foto/video bukti kerja (ke Cloudinary)
STATUS: PROOF_SUBMITTED
        ↓
Notif ke Customer: "Vendor selesai, silakan review"
STATUS: T3_REVIEW (timer T3 mulai, default 2 jam)
        ↓
Customer konfirmasi ATAU komplain
        ↓
Jika KONFIRMASI atau T3 habis tanpa komplain:
  → Auto-release dana ke vendor (dikurangi komisi)
  → STATUS: COMPLETED
  → Customer diminta beri rating & review

Jika KOMPLAIN:
  → STATUS: DISPUTE
  → Alur dispute (lihat Bab 4.5)
```

### 4.4 Timer SLA

| Timer | Default | Bisa Diubah? | Trigger | Jika Melewati Batas |
|-------|---------|--------------|---------|---------------------|
| T1 | 15 menit | ✅ Per kategori | Order blast terkirim | Hot Potato ke vendor berikutnya |
| T2 | 60 menit | ✅ Per tenant | Vendor terpilih, link bayar terkirim | Order batal, vendor dibebaskan |
| T3 | 2 jam | ✅ Per kategori | Vendor upload bukti | Auto-Confirm, dana cair ke vendor |

### 4.5 Alur Dispute & AI Chatbot

```
Customer kirim komplain via Chat
        ↓
AI Chatbot analisa isi komplain (Gemini API)
        ↓
Bot tanya detail masalah:
  "Apa yang tidak sesuai? Produk rusak / tidak sesuai pesanan / terlambat?"
        ↓
Bot undang Vendor ke chat room yang sama
  (Customer lihat "Mitra #XYZ" — nomor HP tersembunyi)
  (Vendor lihat "Pelanggan #ABC" — nomor HP tersembunyi)
        ↓
Customer & Vendor diskusi di chat room anonim
AI moderasi chat:
  → Sensor nomor HP, alamat, info pribadi
  → Jika ada percobaan share info pribadi:
     "[Info pribadi disembunyikan — gunakan platform]"
        ↓
Semua pesan (teks, foto, video) tersimpan permanen di Firestore
        ↓
Jika selesai dalam X jam → dispute resolved by parties
Dana release sesuai kesepakatan
        ↓
Jika tidak selesai dalam X jam (sesuai jam operasional):
  → Eskalasi ke Admin: notif dashboard + WA ke admin
  → Admin masuk ke chat room
  → Admin buat keputusan: dana ke customer / ke vendor / dibagi
  → STATUS: RESOLVED_ADMIN
```

### 4.6 Alur Transfer Manual

```
Customer pilih metode "Transfer Bank"
        ↓
Sistem generate:
  - Nomor rekening tujuan (dari config tenant)
  - Nominal transfer = total + kode unik 3 digit
    Contoh: Rp 150.123 (123 = kode unik identifikasi)
  - Batas waktu transfer (sesuai timer T2)
        ↓
Customer transfer & upload foto bukti transfer
        ↓
Admin dapat notifikasi di dashboard
Admin konfirmasi pembayaran
        ↓
Dana dianggap masuk escrow
STATUS: ESCROW_LOCKED
→ order lanjut seperti biasa
```

---

## BAB 5 — SISTEM CHAT & KOMUNIKASI

### 5.1 Chat Anonim Customer-Vendor

Semua komunikasi antara Customer dan Vendor terjadi melalui chat room anonim di dalam platform:

```
Yang Customer lihat:        Yang Vendor lihat:
────────────────────        ──────────────────────
"Mitra #456"                "Pelanggan #123"
(bukan nama/nomor asli)     (bukan nama/nomor asli)

Admin dapat lihat identitas asli semua pihak.
```

**Sistem sensor otomatis:**
Jika ada pesan yang mengandung pola nomor HP atau alamat lengkap, sistem otomatis replace:
```
Input  : "Hubungi saya di 0812-3456-7890 ya"
Output : "Hubungi saya di [info pribadi disembunyikan] ya"
```

### 5.2 Penyimpanan Chat

**SEMUA percakapan wajib tersimpan permanen:**
- Pesan teks → tersimpan di Firestore
- Foto → upload ke Cloudinary, URL tersimpan di Firestore
- Video → upload ke Cloudinary, URL tersimpan di Firestore
- Tidak bisa dihapus oleh Customer maupun Vendor
- Hanya Platform Owner yang bisa hapus (untuk kasus hukum)

### 5.3 AI Chatbot — Cara Kerja

```
Pesan masuk (dari WA, Web, atau App)
        ↓
Gemini API analisa intent pesan
        ↓
┌─────────────────────────────────────────────────────┐
│ Intent: Order Baru                                   │
│ → Parse: kategori, budget, lokasi, jadwal           │
│ → Konfirmasi ke customer                            │
│ → Buat order otomatis di Firestore                  │
├─────────────────────────────────────────────────────┤
│ Intent: Cek Status                                   │
│ → Ambil data order dari Firestore                   │
│ → Tampilkan status & estimasi                       │
├─────────────────────────────────────────────────────┤
│ Intent: Komplain/Dispute                             │
│ → Analisa sentimen negatif                          │
│ → Tanya detail masalah                              │
│ → Undang vendor ke chat room                        │
│ → Jika tidak selesai → eskalasi ke admin            │
├─────────────────────────────────────────────────────┤
│ Intent: Tidak dikenali                               │
│ → Bot jawab semampu bisa                            │
│ → Jika 3x tidak selesai → handover ke admin         │
└─────────────────────────────────────────────────────┘
        ↓
Semua percakapan tersimpan di Firestore
Notifikasi push dikirim ke device customer/vendor
```

### 5.4 Sistem Notifikasi

Notifikasi dikirim melalui **semua channel sekaligus**:

| Event | WA | Push App | Push Web |
|-------|----|-----------| ---------|
| Order baru (ke vendor) | ✅ | ✅ | ✅ |
| Vendor terpilih (ke customer) | ✅ | ✅ | ✅ |
| Pembayaran berhasil (ke vendor) | ✅ | ✅ | ✅ |
| Bukti kerja diupload (ke customer) | ✅ | ✅ | ✅ |
| Pesan chat baru | ✅ | ✅ | ✅ |
| Dispute dibuka | ✅ | ✅ | ✅ |
| Dana cair (ke vendor) | ✅ | ✅ | ✅ |

---

## BAB 6 — SCHEMA DATABASE FIRESTORE (MULTI-TENANT)

### 6.1 Struktur Koleksi Root

```
/platform_owners/{ownerId}         ← akun Platform Owner
/tenants/{tenantId}                ← root setiap tenant
    /config/{key}                  ← konfigurasi tenant
    /categories/{categoryId}       ← kategori jasa (dinamis)
    /cities/{cityId}               ← kota coverage (dinamis)
    /wa_numbers/{numberId}         ← multi nomor WA blast
    /payment_methods/{methodId}    ← metode payment aktif
    /users/{userId}                ← customer & vendor
    /vendors/{vendorId}            ← data toko vendor
        /products/{productId}      ← produk vendor
        /portfolio/{mediaId}       ← portofolio vendor
    /orders/{orderId}              ← semua order
        /bids/{bidId}              ← bidding dari vendor
        /chat_messages/{msgId}     ← pesan chat order ini
        /media/{mediaId}           ← foto/video bukti & chat
    /escrow_transactions/{txId}    ← transaksi keuangan
    /chat_rooms/{roomId}           ← room chat anonim
        /messages/{msgId}          ← isi chat
    /notifications/{notifId}       ← log notifikasi
    /audit_logs/{logId}            ← log semua aksi
    /vendor_scores/{vendorId}      ← skor & ranking vendor
    /dispute_cases/{caseId}        ← kasus dispute
```

### 6.2 Schema: tenants/config

```javascript
{
  tenant_id        : string,    // UUID v4
  brand: {
    name           : string,    // nama brand (bisa diubah)
    logo_url       : string,    // URL logo di Cloudinary
    primary_color  : string,    // hex color (#FF5733)
    secondary_color: string,
    tagline        : string,
  },
  domain           : string,    // domain/subdomain tenant
  commission: {
    type           : 'percentage' | 'fixed' | 'hybrid',
    percentage     : number,    // default: 10
    minimum_amount : number,    // default: 50000
    charged_to     : 'customer' | 'vendor',
  },
  timers: {
    t1_minutes     : number,    // default: 15
    t2_minutes     : number,    // default: 60
    t3_hours       : number,    // default: 2
  },
  operating_hours: {
    monday         : { open: string, close: string, is_open: boolean },
    tuesday        : { open: string, close: string, is_open: boolean },
    // dst semua hari
  },
  wa_blast: {
    active_number_id: string,   // ID nomor WA yang aktif sekarang
    auto_switch    : boolean,   // auto ganti nomor jika error
  },
  payment: {
    xendit_active  : boolean,
    transfer_manual_active: boolean,
    bank_accounts  : [{
      bank_name    : string,
      account_number: string,
      account_name : string,
    }],
  },
  subscription: {
    plan           : 'trial' | 'basic' | 'pro' | 'enterprise',
    expires_at     : Timestamp,
    is_active      : boolean,
  },
  created_at       : Timestamp,
  updated_at       : Timestamp,
}
```

### 6.3 Schema: orders

```javascript
{
  order_id         : string,    // UUID v4
  tenant_id        : string,    // WAJIB ADA di setiap dokumen
  status           : enum {
    'PENDING',
    'T1_AUCTION',
    'T2_PAYMENT',
    'ESCROW_LOCKED',
    'IN_PROGRESS',
    'PROOF_SUBMITTED',
    'T3_REVIEW',
    'COMPLETED',
    'DISPUTE',
    'CANCELLED'
  },
  customer_info: {
    uid            : string,
    name           : string,    // nama asli (tersimpan, tidak ditampilkan ke vendor)
    wa_number      : string,    // tersimpan, tidak ditampilkan ke vendor
    platform       : 'WEB' | 'APP' | 'WHATSAPP',
    alias          : string,    // "Pelanggan #123" — yang tampil ke vendor
  },
  requirement: {
    category_id    : string,    // referensi ke /categories
    category_name  : string,    // snapshot nama saat order dibuat
    description    : string,
    budget         : number,
    city_id        : string,
    city_name      : string,
    lat_lng        : { lat: number, lng: number },
    deliver_date   : Timestamp,
  },
  price_details: {
    vendor_quote   : number,    // harga dari vendor
    shipping_cost  : number,    // ongkos kirim dari vendor
    subtotal       : number,    // vendor_quote + shipping_cost
    commission     : number,    // dihitung di server
    total_customer : number,    // yang dibayar customer
    total_vendor   : number,    // yang diterima vendor
  },
  assigned_vendor  : string | null,
  vendor_alias     : string,    // "Mitra #456" — yang tampil ke customer
  sla_timers: {
    t1_start       : Timestamp,
    t1_deadline    : Timestamp,
    t2_start       : Timestamp,
    t2_deadline    : Timestamp,
    t3_start       : Timestamp,
    t3_deadline    : Timestamp,
  },
  payment: {
    method         : 'XENDIT_QRIS' | 'XENDIT_VA' | 'TRANSFER_MANUAL',
    gateway_tx_id  : string,
    unique_code    : number,    // untuk Transfer Manual (3 digit)
    status         : 'PENDING' | 'PAID' | 'EXPIRED',
    paid_at        : Timestamp | null,
  },
  timestamps: {
    created_at     : Timestamp,
    updated_at     : Timestamp,
    completed_at   : Timestamp | null,
  },
}
```

### 6.4 Schema: bids (sub-koleksi di dalam orders)

```javascript
{
  bid_id           : string,    // UUID v4
  order_id         : string,
  tenant_id        : string,
  vendor_id        : string,
  vendor_alias     : string,    // "Mitra #456"
  status           : 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED',
  bid_details: {
    can_handle     : boolean,   // konfirmasi sanggup handle
    bid_price      : number,    // harga yang ditawarkan vendor
    published_price: number,    // snapshot harga publish saat bid
    shipping_cost  : number,    // ongkos kirim
    estimated_days : number,    // estimasi pengerjaan (hari)
    can_ontime     : boolean,   // konfirmasi ontime delivery
    notes          : string,    // catatan tambahan vendor
  },
  submitted_at     : Timestamp,
  responded_at     : Timestamp | null,
}
```

### 6.5 Schema: chat_messages (sub-koleksi di dalam orders)

```javascript
{
  message_id       : string,    // UUID v4
  order_id         : string,
  tenant_id        : string,
  sender_role      : 'CUSTOMER' | 'VENDOR' | 'ADMIN' | 'BOT',
  sender_alias     : string,    // "Pelanggan #123" atau "Mitra #456"
  sender_uid       : string,    // UID asli (tersimpan, tidak ditampilkan)
  content: {
    type           : 'TEXT' | 'IMAGE' | 'VIDEO',
    text           : string | null,
    media_url      : string | null,   // URL Cloudinary
    media_thumbnail: string | null,   // thumbnail Cloudinary
    is_censored    : boolean,         // true jika ada info pribadi yang disensor
    original_text  : string | null,   // teks asli sebelum sensor (hanya admin bisa lihat)
  },
  sent_at          : Timestamp,       // serverTimestamp()
  is_deleted       : false,           // tidak pernah bisa true
}
```

### 6.6 Schema: vendors

```javascript
{
  vendor_id        : string,    // UUID v4
  tenant_id        : string,
  user_id          : string,    // referensi ke /users
  wa_number        : string,    // nomor HP (tidak tampil ke customer)
  store: {
    name           : string,    // nama toko
    description    : string,
    logo_url       : string,    // Cloudinary URL
    banner_url     : string,    // Cloudinary URL
    alias_prefix   : string,    // "Mitra" (bisa dikustomisasi per tenant)
    alias_number   : number,    // nomor urut anonim
  },
  categories       : string[], // ID kategori yang dilayani
  cities           : string[], // ID kota yang dilayani
  verification: {
    status         : 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED',
    submitted_docs : string[], // URL dokumen di Cloudinary
    notes          : string,   // catatan admin
    verified_at    : Timestamp | null,
  },
  performance: {
    rating         : number,   // 0.0 - 5.0
    total_completed: number,
    total_cancelled: number,
    response_rate  : number,   // persentase respon bid
    on_time_rate   : number,   // persentase ontime delivery
  },
  virtual_balance  : number,   // saldo pending belum dicairkan
  is_active        : boolean,
  created_at       : Timestamp,
}
```

### 6.7 Schema: audit_logs

```javascript
{
  log_id           : string,    // UUID v4
  tenant_id        : string,
  order_id         : string | null,
  action           : enum {
    'TENANT_CREATED', 'CONFIG_UPDATED',
    'VENDOR_REGISTERED', 'VENDOR_APPROVED', 'VENDOR_REJECTED',
    'PRODUCT_CREATED', 'PRODUCT_UPDATED',
    'ORDER_CREATED', 'BLAST_SENT',
    'BID_SUBMITTED', 'BID_ACCEPTED', 'BID_REJECTED',
    'PAYMENT_INITIATED', 'PAYMENT_CONFIRMED',
    'ESCROW_LOCKED', 'ESCROW_RELEASED', 'ESCROW_REFUNDED',
    'PROOF_UPLOADED', 'ORDER_COMPLETED',
    'DISPUTE_OPENED', 'DISPUTE_RESOLVED',
    'CHAT_CENSORED', 'MANUAL_OVERRIDE',
    'WA_NUMBER_SWITCHED', 'SYSTEM_AUTO_T1', 'SYSTEM_AUTO_T2', 'SYSTEM_AUTO_T3'
  },
  actor            : 'SYSTEM' | string,  // SYSTEM atau user_id
  actor_role       : string,
  metadata         : {
    device         : string,
    browser        : string,
    ip_address     : string,
    user_agent     : string,
    additional_data: object,
  },
  timestamp        : Timestamp,  // serverTimestamp() — tidak bisa dimanipulasi
}
```

---

## BAB 7 — KONTRAK INTEGRASI ANTAR MODUL

> **WAJIB DIIKUTI OLEH SETIAP MODUL YANG DIBANGUN**

```
=== KONTRAK INTEGRASI v2.0 — JANGAN DILANGGAR ===

1. IDENTITAS DATA
   - Semua ID: UUID v4 (tidak boleh angka berurutan)
   - Semua timestamp: admin.firestore.FieldValue.serverTimestamp()
   - Semua harga dihitung HANYA di server (Next.js API Route)
   - Setiap dokumen WAJIB memiliki field tenant_id

2. SATU DATABASE — SEMUA MODUL
   - Tidak ada modul yang punya database sendiri
   - Semua baca/tulis ke Firestore via Firebase SDK resmi
   - Tidak boleh ada hardcoded data — semua dari Firestore
   - Konfigurasi dibaca dari /tenants/{tenantId}/config

3. STATUS ORDER — STATE MACHINE (urutan wajib)
   PENDING → T1_AUCTION → T2_PAYMENT → ESCROW_LOCKED
   → IN_PROGRESS → PROOF_SUBMITTED → T3_REVIEW
   → COMPLETED | DISPUTE | CANCELLED
   (Tidak boleh skip status atau kembali ke status sebelumnya)

4. EVENT SYSTEM — CARA MODUL BERKOMUNIKASI
   - Modul tidak memanggil modul lain secara langsung
   - Modul mengubah status di Firestore
   - Cloud Function mendeteksi perubahan dan menjalankan logika
   - Contoh: Order status berubah ke T1_AUCTION
             → Cloud Function M6 blast WA ke vendor
             → Cloud Function M4 mulai timer T1

5. KEAMANAN — WAJIB ADA DI SETIAP MODUL
   - Setiap API Route: validasi dengan Zod
   - Setiap action sensitif: catat ke audit_logs
   - Setiap halaman: cek role via Firebase Custom Claims
   - Setiap request: validasi tenant_id
   - Nomor HP & alamat: sensor di semua output chat

6. KODE WAJIB BISA DIBACA MANUSIA
   - Setiap fungsi: ada komentar penjelasan dalam Bahasa Indonesia
   - Nama variabel: deskriptif (bukan a, b, x)
   - Tidak ada magic number — semua pakai konstanta bernama
   - Semua nilai konfigurasi: baca dari Firestore, bukan hardcode
```

---

## BAB 8 — STANDAR KEAMANAN

| # | Standar | Modul | Status |
|---|---------|-------|--------|
| ☐ | Kalkulasi harga & komisi hanya di server | M5 | Belum |
| ☐ | Semua ID: UUID v4 | Semua | Belum |
| ☐ | Link sensitif: JWT dengan TTL max 2 jam | M4, M7 | Belum |
| ☐ | MFA untuk semua role Admin ke atas | M1 | Belum |
| ☐ | Firestore Security Rules: validasi tenant_id di setiap rule | M1, M12 | Belum |
| ☐ | Audit log append-only (delete & update diblokir) | M12 | Belum |
| ☐ | Input validation dengan Zod di semua API Route | M12 | Belum |
| ☐ | Nomor HP & alamat di-sensor di semua output chat | M7 | Belum |
| ☐ | Chat media di-scan sebelum ditampilkan | M7 | Belum |
| ☐ | CSP header di Next.js config | M12 | Belum |
| ☐ | Cloudflare WAF aktif di depan Vercel | M12 | Belum |
| ☐ | Server-side IDOR check: cek tenant_id & kepemilikan | M12 | Belum |
| ☐ | Foto & video bukti di-lock (immutable) setelah konfirmasi | M5 | Belum |
| ☐ | Rate limiting untuk WA blast per tenant | M6 | Belum |
| ☐ | Enkripsi data sensitif (nomor HP, rekening) at rest | M12 | Belum |
| ☐ | Multi-tenant isolation: query WAJIB include tenant_id filter | Semua | Belum |

---

*— Akhir FILE_A Context untuk AI v2.0 — 27 Maret 2026 —*
