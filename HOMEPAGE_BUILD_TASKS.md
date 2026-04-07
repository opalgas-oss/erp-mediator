# HOMEPAGE_BUILD_TASKS.md
# Instruksi Build Homepage — ERP Mediator Hyperlocal
# Baca file ini dan kerjakan semua task secara berurutan.
# Kerjakan SATU file per task. Tunggu selesai sebelum lanjut ke task berikutnya.
# Setiap task: tampilkan isi file yang selesai dibuat, lalu lanjut ke task berikutnya.

---

## ATURAN WAJIB SEMUA FILE
- "use client" di baris pertama untuk semua komponen React
- Semua teks label, tombol, pesan: Bahasa Indonesia
- Semua komentar kode: Bahasa Indonesia
- TypeScript dengan tipe yang jelas — tidak ada 'any'
- Gunakan shadcn/ui untuk semua komponen UI
- Gunakan next/navigation untuk navigasi (bukan next/router)
- Tidak ada nilai hardcode bisnis — konstanta UI dan route boleh

---

## TASK 1 — components/homepage/LoginModal.tsx

Buat file baru: components/homepage/LoginModal.tsx
Buat folder components/homepage/ jika belum ada.

Props:
```typescript
interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
}
```

Tampilan modal dari atas ke bawah:
1. Ikon LockKeyhole dari lucide-react, ukuran 32px, warna biru #185FA5
2. Judul: "Masuk untuk melanjutkan"
3. Deskripsi: "Untuk melihat detail dan membuat order, silakan masuk atau daftar akun baru."
4. Tombol "Masuk" — full width, solid biru — navigasi ke /login
5. Tombol "Daftar" — full width, outline — navigasi ke /register
6. Garis pemisah tipis
7. Teks kecil: "Ingin bergabung sebagai mitra?"
8. Link teks: "Daftar sebagai Mitra →" — navigasi ke /register?tab=vendor

Komponen shadcn: Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, Button

Behavior:
- Klik "Masuk" → onClose() → router.push('/login')
- Klik "Daftar" → onClose() → router.push('/register')
- Klik "Daftar sebagai Mitra →" → onClose() → router.push('/register?tab=vendor')
- Klik luar modal atau Escape → onClose()

---

## TASK 2 — components/homepage/Navbar.tsx

Buat file baru: components/homepage/Navbar.tsx

Props: tidak ada (baca auth state dari cookie/context internal)

Layout kiri ke kanan:
[Logo] [GPS Kota Badge] [spacer flex-1] [Daftar sebagai Mitra] [Masuk] [Pasang Order]

Detail setiap elemen:

LOGO:
- Teks: "▲ Mediator"
- Warna: #185FA5
- Klik → router.push('/')

GPS KOTA BADGE:
- Deteksi kota via navigator.geolocation + fetch ke:
  https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lng}&format=json
- Ambil address.city atau address.county atau address.state
- Format tampil: "● [Nama Kota] ▾"
- Loading state: Skeleton kecil
- Kalau GPS tidak tersedia atau gagal: tampilkan "● Indonesia ▾"
- GPS di homepage TIDAK WAJIB — tidak memblokir tampilan apapun

LINK "Daftar sebagai Mitra":
- Variant: link/teks biasa (bukan tombol solid)
- navigasi ke /register?tab=vendor

TOMBOL "Masuk":
- Variant: outline
- navigasi ke /login

TOMBOL "Pasang Order":
- Variant: default (solid biru #185FA5)
- Behavior:
  - Belum login → panggil setIsLoginModalOpen(true) yang di-pass sebagai prop
  - Sudah login sebagai CUSTOMER → router.push('/order/baru') [placeholder Sprint 4]
  - Sudah login sebagai VENDOR/ADMIN/SUPERADMIN → tampilkan toast: "Fitur ini untuk pelanggan"

Tambahan props untuk modal:
```typescript
interface NavbarProps {
  onPasangOrderClick: () => void
}
```

Cek login state: baca cookie "session", decode JWT (atob bagian tengah), ambil field "role".
Kalau tidak ada cookie atau decode gagal → anggap belum login.

Komponen shadcn: Badge, Button, Skeleton, (toast dari sonner jika tersedia)

Styling navbar:
- Position: sticky top-0 z-50
- Background: white dengan border-bottom tipis
- Padding: px-4 md:px-6 py-3
- Shadow: shadow-sm

---

## TASK 3 — components/homepage/Hero.tsx

Buat file baru: components/homepage/Hero.tsx

Props:
```typescript
interface HeroProps {
  onPasangOrderClick: () => void
}
```

Layout dari atas ke bawah:

AREA BANNER PLACEHOLDER:
- Background: #e6f1fb (biru muda)
- Height: 80px
- Tidak ada teks atau gambar — hanya background warna solid
- Ini placeholder untuk banner slider Sprint 2

KONTEN HERO:
- Background: #e6f1fb (sama dengan banner, satu kesatuan)
- Padding: py-10 px-4
- Text align: center

Teks:
- Judul baris 1: "Pasang kebutuhan," — text-2xl md:text-3xl font-semibold
- Judul baris 2: "biarkan mitra bersaing" — text-2xl md:text-3xl font-semibold
- Subjudul: "Tulis kebutuhan dan budget — mitra lokal kirim penawaran, sistem pilihkan yang terbaik"
  text-sm md:text-base text-muted-foreground mt-2 mb-6

3 KOTAK LANGKAH (grid 3 kolom, max-width 600px, centered):
Setiap kotak: Card putih, border tipis, padding p-4

| No | Judul | Deskripsi |
|---|---|---|
| 1 | Pasang Order | Tulis kebutuhan & budget |
| 2 | Mitra Bersaing | Mitra lokal kirim penawaran |
| 3 | Diproses Otomatis | Sistem pilih terbaik untuk Anda |

Nomor: lingkaran biru #185FA5, teks putih, ukuran 28px

CTA BUTTONS (flex, gap-3, justify-center, mt-6):
- "Pasang Order — Gratis" → solid biru → panggil onPasangOrderClick()
- "Jelajahi Jasa" → outline → scroll ke section #product-grid via document.querySelector

Komponen shadcn: Card, CardContent, Button

---

## TASK 4 — components/homepage/StatsBar.tsx

Buat file baru: components/homepage/StatsBar.tsx

Komponen ini KONDISIONAL — hanya render kalau Config mengizinkan.

Logika:
1. Import getConfigValue dari @/lib/config-registry
2. Coba baca getConfigValue(tenantId, 'homepage/show_stats_bar')
   - tenantId: baca dari env NEXT_PUBLIC_TENANT_ID atau gunakan 'tenant_erpmediator' sebagai fallback
3. Kalau nilai false atau tidak ada atau error → return null (tidak render apapun)
4. Kalau nilai true → render stats bar

Kalau render, baca juga:
- getConfigValue(tenantId, 'homepage/stats_mitra_count') → default '0'
- getConfigValue(tenantId, 'homepage/stats_kota_count') → default '0'
- getConfigValue(tenantId, 'homepage/stats_respons_menit') → default '0'

Tampilan stats bar:
- Background: #f5f9ff
- Border atas dan bawah: border-y tipis
- Layout: flex justify-center gap-12 py-3
- 3 item: [Angka bold] + [Label muted kecil]

| Angka | Label |
|---|---|
| {stats_mitra_count}+ | Mitra Aktif |
| {stats_kota_count}+ | Kota Terlayani |
| {stats_respons_menit} mnt | Rata-rata Respons |

Karena ini Server Component (tidak ada interaktivitas), tidak perlu "use client".
Gunakan async/await untuk baca Config.
Wrap seluruh logika dalam try-catch — kalau error apapun, return null.

---

## TASK 5 — components/homepage/CategoryFilter.tsx

Buat file baru: components/homepage/CategoryFilter.tsx

Props:
```typescript
interface CategoryFilterProps {
  activeKategori: string
  onKategoriChange: (kategori: string) => void
}
```

Daftar kategori (data static untuk fondasi ini):
const KATEGORI = [
  'Semua',
  'Bunga Papan',
  'Bersih Rumah',
  'Jasa Kirim',
  'Servis AC',
  'Servis Elektronik',
  'Katering',
  'Foto & Video',
  'Renovasi',
  'Pijat & Relaksasi',
]

Layout:
- Wrapper: div dengan overflow-x-auto, scrollbar disembunyikan (scrollbar-hide atau [&::-webkit-scrollbar]:hidden)
- Inner: flex gap-2 px-4 py-3 border-b
- Setiap pill: tombol kecil rounded-full

Styling pill AKTIF:
- Background: #185FA5
- Teks: putih
- Border: border-blue-600

Styling pill TIDAK AKTIF:
- Background: white
- Teks: muted
- Border: border-gray-200
- Hover: bg-gray-50

Behavior:
- Klik pill → panggil onKategoriChange(namaKategori)
- Pill aktif ditandai secara visual berbeda

---

## TASK 6 — components/homepage/ProductCard.tsx

Buat file baru: components/homepage/ProductCard.tsx

Type data produk:
```typescript
export interface Product {
  id: string
  nama: string
  kategori: string
  harga: number
  foto_url: string
}
```

Props:
```typescript
interface ProductCardProps {
  product: Product
  showKategoriBadge: boolean  // true saat filter 'Semua', false saat filter spesifik
  onKlikCard: () => void      // dipanggil saat user klik — parent yang handle cek login
}
```

Tampilan card dari atas ke bawah:

AREA FOTO (tinggi 160px, relative, overflow-hidden):
- Gunakan next/image dengan fill, object-cover, lazy loading
- Alt text: product.nama
- Kalau foto_url kosong atau error: tampilkan placeholder warna abu-abu #e5e7eb
- KATEGORI BADGE (conditional — tampil hanya kalau showKategoriBadge = true):
  - Posisi: absolute top-2 left-2
  - Komponen: Badge variant secondary
  - Isi: product.kategori
  - Background: putih semi-transparan

INFO PRODUK (padding p-3):
- Nama produk: text-sm, font-medium, line-clamp-2 (max 2 baris)
- Harga: text-base, font-semibold, warna #185FA5
  Format: "Rp " + harga.toLocaleString('id-ID')

YANG TIDAK TAMPIL (aturan bisnis):
- Rating — JANGAN tampilkan dalam kondisi apapun
- Nama vendor — JANGAN tampilkan dalam kondisi apapun
- Nama toko — JANGAN tampilkan dalam kondisi apapun
- Identitas vendor lainnya — JANGAN tampilkan dalam kondisi apapun

Styling card:
- border rounded-lg overflow-hidden cursor-pointer
- transition hover:shadow-md
- Klik seluruh card → panggil onKlikCard()

Komponen shadcn: Badge
Import: Image dari next/image

---

## TASK 7 — components/homepage/ProductGrid.tsx

Buat file baru: components/homepage/ProductGrid.tsx

Props:
```typescript
interface ProductGridProps {
  activeKategori: string
  onKlikProduk: () => void  // dipanggil saat klik produk — parent handle cek login
}
```

DATA MOCK (gunakan data ini untuk versi fondasi):
```typescript
const MOCK_PRODUCTS: Product[] = [
  { id: '1', nama: 'Papan Ucapan Selamat & Sukses', kategori: 'Bunga Papan', harga: 450000, foto_url: 'https://images.unsplash.com/photo-1487530811015-780df050f2f6?w=400&q=80' },
  { id: '2', nama: 'Papan Bunga Duka Cita', kategori: 'Bunga Papan', harga: 350000, foto_url: 'https://images.unsplash.com/photo-1462275646964-a0e3386b89fa?w=400&q=80' },
  { id: '3', nama: 'Bersih Rumah 2 Kamar Tidur', kategori: 'Bersih Rumah', harga: 250000, foto_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80' },
  { id: '4', nama: 'Bersih Kantor hingga 50m2', kategori: 'Bersih Rumah', harga: 180000, foto_url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&q=80' },
  { id: '5', nama: 'Kirim Barang Motor — Intra Kota', kategori: 'Jasa Kirim', harga: 35000, foto_url: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=400&q=80' },
  { id: '6', nama: 'Kirim Barang Pickup — Antar Kota', kategori: 'Jasa Kirim', harga: 120000, foto_url: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=400&q=80' },
  { id: '7', nama: 'Servis AC Split 1/2 PK sampai 2 PK', kategori: 'Servis AC', harga: 85000, foto_url: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&q=80' },
  { id: '8', nama: 'Servis Kulkas Tidak Dingin', kategori: 'Servis Elektronik', harga: 95000, foto_url: 'https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=400&q=80' },
  { id: '9', nama: 'Katering Nasi Box 50 Porsi', kategori: 'Katering', harga: 750000, foto_url: 'https://images.unsplash.com/photo-1555244162-803834f70033?w=400&q=80' },
  { id: '10', nama: 'Foto Produk Studio Mini', kategori: 'Foto & Video', harga: 300000, foto_url: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=400&q=80' },
  { id: '11', nama: 'Pasang Keramik Lantai per m2', kategori: 'Renovasi', harga: 85000, foto_url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&q=80' },
  { id: '12', nama: 'Pijat Relaksasi Panggilan', kategori: 'Pijat & Relaksasi', harga: 150000, foto_url: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&q=80' },
]
```

LOGIKA FILTER:
```typescript
const filteredProducts = activeKategori === 'Semua'
  ? MOCK_PRODUCTS
  : MOCK_PRODUCTS.filter(p => p.kategori === activeKategori)
```

DISPLAY COUNT: tampilkan 8 card pertama by default.
State: const [displayCount, setDisplayCount] = useState(8)
Tombol "Lihat Lebih Banyak" muncul kalau filteredProducts.length > displayCount

LOADING STATE:
- State: const [isLoading, setIsLoading] = useState(true)
- Simulasikan loading 800ms dengan setTimeout di useEffect
- Saat loading: tampilkan 8 Skeleton card
- Setiap skeleton: tinggi foto 160px abu-abu + 2 baris teks abu-abu

EMPTY STATE (kalau filteredProducts.length === 0):
```
[ikon Search dari lucide-react, ukuran 40px, warna muted]
Belum ada produk di kategori ini
Coba kategori lain atau lihat semua produk
[Tombol: "Lihat Semua" → reset filter ke 'Semua']
```

LAYOUT:
- Section wrapper dengan id="product-grid" (untuk scroll dari hero)
- Judul section: "Jelajahi Produk & Jasa" — font-semibold mb-4
- Grid: grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4
- Padding: px-4 md:px-6 py-6

KATEGORI BADGE LOGIC:
- showKategoriBadge = activeKategori === 'Semua'

Komponen shadcn: Skeleton, Button
Import: ProductCard dan Product type dari ./ProductCard

---

## TASK 8 — components/homepage/Footer.tsx

Buat file baru: components/homepage/Footer.tsx

Tidak ada props — komponen sederhana.

Cek login state: baca cookie "session", decode JWT (atob bagian tengah), ambil field "role".
Kalau ada session valid → sembunyikan link "Daftar sebagai Mitra" dan "Masuk"
Kalau tidak ada session → tampilkan keduanya

Layout footer (border-t, bg-white, px-4 md:px-6 py-6):

Baris 1 (flex justify-between items-center):
- Kiri: Logo "▲ Mediator" teks kecil warna muted + tagline "Platform Jasa Terpercaya Indonesia"
- Kanan (kalau belum login): link "Daftar sebagai Mitra" + link "Masuk"

Baris 2 (text-center mt-4):
- "© 2026 Mediator. All rights reserved." — text-xs text-muted-foreground

---

## TASK 9 — app/page.tsx

Update file: app/page.tsx
Ini file utama yang merakit semua komponen homepage.

State yang dikelola:
```typescript
const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
const [activeKategori, setActiveKategori] = useState('Semua')
```

Fungsi handler:
```typescript
// Dipanggil saat user yang belum login klik produk atau pasang order
const handleProtectedAction = () => {
  // Cek apakah user sudah login dengan baca cookie session
  // Kalau belum login → buka modal
  // Kalau sudah login → lakukan aksi (saat ini buka modal juga, Sprint 4 akan dibedakan)
  setIsLoginModalOpen(true)
}
```

Struktur JSX dari atas ke bawah:
```jsx
<div className="min-h-screen bg-white">
  <Navbar onPasangOrderClick={handleProtectedAction} />
  <main>
    <Hero onPasangOrderClick={handleProtectedAction} />
    <StatsBar />
    <CategoryFilter
      activeKategori={activeKategori}
      onKategoriChange={setActiveKategori}
    />
    <ProductGrid
      activeKategori={activeKategori}
      onKlikProduk={handleProtectedAction}
    />
  </main>
  <Footer />
  <LoginModal
    isOpen={isLoginModalOpen}
    onClose={() => setIsLoginModalOpen(false)}
  />
</div>
```

Import semua komponen dari:
- @/components/homepage/Navbar
- @/components/homepage/Hero
- @/components/homepage/StatsBar
- @/components/homepage/CategoryFilter
- @/components/homepage/ProductGrid
- @/components/homepage/Footer
- @/components/homepage/LoginModal

Tambahkan metadata halaman:
```typescript
export const metadata = {
  title: 'Mediator — Platform Jasa Terpercaya Indonesia',
  description: 'Pasang kebutuhan, mitra lokal bersaing memberikan penawaran terbaik.',
}
```

Catatan: metadata harus di Server Component. Pisahkan 'use client' ke komponen child kalau diperlukan.

=== SELESAI SEMUA TASK ===
Setelah Task 9 selesai, jalankan: npm run dev
Laporkan apakah server berjalan tanpa error di localhost:3000
