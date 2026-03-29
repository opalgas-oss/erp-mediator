# 📋 STATUS PROJECT
## Platform Marketplace Jasa Reverse Auction
## (Multi-Tenant | Multi-Brand | Fully Configurable)

> **CARA PAKAI:** Lampirkan file ini di awal setiap sesi chat baru.
> Update file ini setiap akhir sesi dengan menambahkan entri baru di bagian Riwayat Sesi.
> File lama dihapus, file ini yang selalu dipakai.

---

## 📍 POSISI SEKARANG

```
FASE SETUP          ✅ SELESAI
FASE DEVELOPMENT    🔄 BELUM DIMULAI

Modul berikutnya yang harus dikerjakan: M1 — Foundation & Config
Langkah berikutnya yang harus dilakukan:
  1. Hubungkan folder project ke GitHub (git init & push)
  2. Install Firebase SDK (npm install firebase)
  3. Install shadcn/ui
  4. Mulai bangun M1
```

---

## ✅ SUDAH SELESAI

### [27 Mar 2026 — Sesi #001] Setup Awal Semua Tools & Akun

| Item | Detail | Status |
|------|--------|--------|
| Node.js | v24.14.0 terinstall | ✅ |
| NPM | v11.9.0 terinstall | ✅ |
| Git | v2.53.0.windows.1 terinstall | ✅ |
| Git Config | user.name: opalgas-oss, user.email: opal.gas2026@gmail.com | ✅ |
| GitHub Akun | username: opalgas-oss | ✅ |
| GitHub Repo | erp-mediator dibuat di https://github.com/opalgas-oss/erp-mediator | ✅ |
| Cursor AI | Terinstall, terbuka, terminal berfungsi | ✅ |
| Firebase Project | erp-mediator, Spark Plan, Project Number: 678360972568 | ✅ |
| Firestore Database | Aktif, database (default) siap | ✅ |
| Firebase Auth | Aktif, Email/Password + Google enabled | ✅ |
| Firebase CLI | v15.11.0, login sebagai opal.gas2026@gmail.com | ✅ |
| Firebase Web App | Terdaftar, firebaseConfig sudah didapat | ✅ |
| Vercel Akun | username: opalgas-oss, Hobby Plan | ✅ |
| Vercel CLI | v50.37.1, login sebagai opalgas-oss | ✅ |
| Project Next.js | Dibuat di D:\Philips\Project\erp-mediator\ | ✅ |
| npm run dev | Berhasil, localhost:3000 bisa dibuka | ✅ |
| Dokumen v2.0 | FILE_A v2, Lampiran Teknis v2, Status Project dibuat | ✅ |

---

## 🔄 SEDANG DALAM PROSES

### Menghubungkan GitHub dengan Folder Project di Laptop
**Belum dilakukan** — akan dikerjakan di sesi berikutnya.

Perintah yang perlu dijalankan (berurutan):
```
📍 Di mana: Terminal Cursor AI (bagian bawah layar)

⌨️ Ketik: git init
⏎ Lalu: Tekan Enter

⌨️ Ketik: git remote add origin https://github.com/opalgas-oss/erp-mediator.git
⏎ Lalu: Tekan Enter

⌨️ Ketik: git add .
⏎ Lalu: Tekan Enter

⌨️ Ketik: git commit -m "Initial commit - setup Next.js"
⏎ Lalu: Tekan Enter

⌨️ Ketik: git push -u origin main
⏎ Lalu: Tekan Enter
```

---

## 📋 LANGKAH BERIKUTNYA (BERURUTAN)

```
LANGKAH 1 — Hubungkan GitHub (perintah di atas)
      ↓
LANGKAH 2 — Install Firebase SDK
      📍 Terminal Cursor AI
      ⌨️ npm install firebase
      ⏎ Enter

LANGKAH 3 — Install shadcn/ui
      📍 Terminal Cursor AI
      ⌨️ npx shadcn@latest init
      ⏎ Enter

LANGKAH 4 — Buat file koneksi Firebase
      Buat file: lib/firebase.ts
      Isi dengan firebaseConfig yang sudah disimpan

LANGKAH 5 — Mulai bangun M1 (Foundation & Config)
      - Setup multi-tenant di Firestore
      - Login & Register Customer/Vendor
      - Super Admin panel konfigurasi
```

---

## ⚠️ CATATAN PENTING & KEPUTUSAN FINAL

### Keputusan Teknis yang Sudah Final

| # | Keputusan | Detail |
|---|-----------|--------|
| 1 | Firebase Storage → Cloudinary | Firebase Storage berbayar sejak 2024. Cloudinary gratis 25GB |
| 2 | Midtrans → Xendit | Xendit lebih mudah, dokumentasi lebih baik, fitur lebih lengkap |
| 3 | Tambah shadcn/ui | Komponen UI profesional gratis, percepat development 3x |
| 4 | Multi-Tenant Opsi B | Setiap tenant punya database terisolasi, dari awal |
| 5 | Semua konfigurasi dinamis | Tidak ada yang hardcode — semua diatur dari dashboard |
| 6 | Model bisnis ganda | Opsi A (operasikan sendiri) + Opsi B (sewakan/SaaS) berjalan paralel |

### Keputusan Bisnis yang Sudah Final

| # | Keputusan | Detail |
|---|-----------|--------|
| 1 | Komisi | MAX(Rp50.000, 10% × harga_final). Semua nilai dinamis per tenant |
| 2 | Komisi bisa dibebankan | Ke customer (tambah tagihan) ATAU kurangi pendapatan vendor |
| 3 | Harga bidding | Tidak boleh lebih mahal dari harga publish. Sistem otomatis tolak |
| 4 | Chat anonim | Customer = "Pelanggan #XXX", Vendor = "Mitra #XXX" |
| 5 | Sensor chat | Nomor HP & alamat otomatis disensor di semua chat |
| 6 | Chat tersimpan | SEMUA chat (teks, foto, video) tersimpan permanen di Firestore |
| 7 | Dispute | AI chatbot dulu → undang vendor → eskalasi admin jika perlu |
| 8 | Transfer Manual | Kode unik 3 digit, konfirmasi admin via dashboard |
| 9 | WA Blast | Multi nomor, auto-switch, template dinamis dari dashboard |
| 10 | Kategori & Kota | Dinamis — admin tambah/hapus kapan saja, tidak hardcode |

### Hal yang Perlu Disiapkan Sebelum Go-Live

| # | Item | Keterangan |
|---|------|------------|
| 1 | Akun Cloudinary | Daftar di https://cloudinary.com — gratis, tidak perlu kartu kredit |
| 2 | Akun Xendit | Daftar di https://xendit.co — perlu KTP/dokumen bisnis untuk production |
| 3 | Nomor HP khusus untuk WA Blast | Sudah ada — setup di Fonnte saat M6 |
| 4 | Nama Brand | Belum final — bisa diisi di dashboard admin nanti |
| 5 | Domain | Belum — beli domain .id saat siap go-live (±Rp 200.000/tahun) |

---

## 🐛 ERROR YANG PERNAH TERJADI & SOLUSINYA

| # | Error | Penyebab | Solusi |
|---|-------|----------|--------|
| 1 | Menu "Build" tidak muncul di Firebase | Sidebar Firebase dalam mode collapsed | Klik area sidebar kiri untuk perluas menu |
| 2 | Firebase Storage minta upgrade | Storage tidak tersedia di Spark Plan sejak 2024 | Gunakan Cloudinary sebagai pengganti |
| 3 | Ikon </> tidak muncul di Firebase Overview | Tampilan Firebase Console sudah berubah | Klik tombol "+ Add app" yang fungsinya sama |
| 4 | node is not recognized | PATH belum update setelah install | Restart laptop, buka cmd baru |

---

## 📁 LOKASI FILE PENTING DI LAPTOP

```
D:\Philips\Project\
├── erp-mediator\                    ← FOLDER PROJECT UTAMA (buka ini di Cursor)
│   ├── app\                         ← Halaman website (masih default)
│   ├── node_modules\                ← Library (jangan diubah manual)
│   ├── public\                      ← Gambar & logo
│   ├── package.json                 ← Daftar library
│   ├── STATUS_PROJECT.md            ← File ini
│   └── ... file lainnya
│
└── firebase-config-RAHASIA.txt      ← API Keys Firebase
                                        JANGAN upload ke GitHub!
```

---

## 🔑 INFO AKUN (REFERENSI CEPAT)

```
GitHub    : https://github.com/opalgas-oss
Firebase  : https://console.firebase.google.com/project/erp-mediator
Vercel    : https://vercel.com/philips-liemenas-projects/erp-mediator
Cursor    : Sudah login
```

---

## 📅 RIWAYAT SESI

### Sesi #001 — Jumat, 27 Maret 2026
**Durasi:** Satu hari penuh
**Yang dicapai:**
- Install semua tools (Node.js, Git, Cursor AI)
- Buat semua akun (GitHub, Firebase, Vercel)
- Setup Firebase (Firestore, Auth)
- Buat project Next.js pertama
- Website berhasil jalan di localhost:3000
- Diskusi mendalam tentang visi, model bisnis, arsitektur
- Finalisasi semua keputusan teknis & bisnis
- Buat dokumen v2.0 (FILE_A, Lampiran Teknis, Status Project)

**Keputusan besar hari ini:**
- Platform = Multi-Tenant Opsi B (terisolasi) dari awal
- Model bisnis ganda (operasikan sendiri + SaaS) paralel
- Semua konfigurasi dinamis — tidak ada yang hardcode
- Stack final: +Cloudinary, +Xendit, +shadcn/ui

**Catatan:**
Pemilik adalah pemula vibe coding. Selalu gunakan format instruksi baku:
📍 Di mana: [lokasi]
⌨️ Ketik: [perintah]
⏎ Lalu: Tekan Enter

---
*File ini diupdate setiap akhir sesi. Hapus file lama, pakai file ini.*
*Terakhir diupdate: Jumat, 27 Maret 2026 — Sesi #001*
