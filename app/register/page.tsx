'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getTenantConfig } from '@/lib/getTenantConfig';

// ============================================================
// KONSTANTA — Tenant ID utama (dari Firestore, bukan hardcode nilai lain)
// ============================================================
const TENANT_ID = 'tenant_erpmediator';

// ============================================================
// TIPE DATA
// ============================================================
type Role = 'CUSTOMER' | 'VENDOR';

interface FormData {
  nama: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  kota: string;
  // Field khusus Vendor
  namaToko: string;
  kategori: string;
}

interface FormErrors {
  nama?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
  kota?: string;
  namaToko?: string;
  kategori?: string;
  general?: string;
}

// ============================================================
// FUNGSI VALIDASI — Sesuai tabel validasi di dokumen
// ============================================================
function validasiForm(data: FormData, role: Role): FormErrors {
  const errors: FormErrors = {};

  // Nama lengkap — wajib, minimal 3 karakter
  if (!data.nama || data.nama.trim().length < 3) {
    errors.nama = 'Nama minimal 3 karakter';
  }

  // Email — wajib, format valid
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!data.email || !emailRegex.test(data.email)) {
    errors.email = 'Format email tidak valid';
  }

  // Nomor WA — wajib, format 08xx atau +628xx, 10-13 digit
  const phoneRegex = /^(\+62|62|0)8[1-9][0-9]{7,11}$/;
  if (!data.phone || !phoneRegex.test(data.phone.replace(/\s|-/g, ''))) {
    errors.phone = 'Format nomor WA tidak valid';
  }

  // Password — wajib, minimal 8 karakter, ada angka
  const passwordRegex = /^(?=.*[0-9]).{8,}$/;
  if (!data.password || !passwordRegex.test(data.password)) {
    errors.password = 'Password min 8 karakter dan harus ada angka';
  }

  // Konfirmasi password — harus identik
  if (!data.confirmPassword || data.confirmPassword !== data.password) {
    errors.confirmPassword = 'Password tidak cocok';
  }

  // Field khusus Vendor
  if (role === 'VENDOR') {
    if (!data.namaToko || data.namaToko.trim().length < 3) {
      errors.namaToko = 'Nama toko minimal 3 karakter';
    }
    if (!data.kota) {
      errors.kota = 'Pilih kota operasional Anda';
    }
    if (!data.kategori) {
      errors.kategori = 'Pilih kategori layanan Anda';
    }
  }

  return errors;
}

// ============================================================
// KOMPONEN UTAMA
// ============================================================
export default function RegisterPage() {
  const router = useRouter();

  // State utama
  const [role, setRole] = useState<Role>('CUSTOMER');
  const [formData, setFormData] = useState<FormData>({
    nama: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    kota: '',
    namaToko: '',
    kategori: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);

  // Data dari Firestore (tidak hardcode)
  const [daftarKota, setDaftarKota] = useState<{ id: string; name: string }[]>([]);
  const [daftarKategori, setDaftarKategori] = useState<{ id: string; name: string }[]>([]);

  // ============================================================
  // AMBIL DATA KOTA & KATEGORI DARI FIRESTORE
  // Sesuai prinsip: SEMUA nilai dari DB, tidak hardcode
  // ============================================================
  useEffect(() => {
    async function muatKonfigurasi() {
      try {
        const { collection, getDocs } = await import('firebase/firestore');

        // Ambil daftar kota dari Firestore
        const kotaSnap = await getDocs(
          collection(db, `tenants/${TENANT_ID}/cities`)
        );
        const kotaList = kotaSnap.docs.map((d) => ({
          id: d.id,
          name: d.data().name as string,
        }));
        setDaftarKota(kotaList);

        // Ambil daftar kategori dari Firestore
        const katSnap = await getDocs(
          collection(db, `tenants/${TENANT_ID}/categories`)
        );
        const katList = katSnap.docs.map((d) => ({
          id: d.id,
          name: d.data().name as string,
        }));
        setDaftarKategori(katList);
      } catch (err) {
        console.error('Gagal memuat konfigurasi:', err);
      } finally {
        setIsLoadingConfig(false);
      }
    }

    muatKonfigurasi();
  }, []);

  // ============================================================
  // HANDLER — Update form field
  // ============================================================
  function handleChange(field: keyof FormData, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Hapus error field yang sedang diketik
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  // ============================================================
  // HANDLER — Submit form register
  // ============================================================
  async function handleDaftar() {
    // 1. Validasi semua field
    const validasiErrors = validasiForm(formData, role);
    if (Object.keys(validasiErrors).length > 0) {
      setErrors(validasiErrors);
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      // 2. Buat akun di Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      const user = userCredential.user;

      // 3. Panggil API server untuk set custom claims (role + tenant_id)
      // API ini wajib di server — tidak bisa dari browser
      const claimsResponse = await fetch('/api/auth/set-custom-claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          role: role,
          tenant_id: TENANT_ID,
        }),
      });

      if (!claimsResponse.ok) {
        throw new Error('Gagal menetapkan hak akses akun');
      }

      // 4. Simpan profil ke Firestore — /users/{uid}
      const profilUser = {
        uid: user.uid,
        nama: formData.nama.trim(),
        email: formData.email,
        phone: formData.phone,
        role: role,
        tenant_id: TENANT_ID,
        status: role === 'VENDOR' ? 'pending_approval' : 'active',
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      };

      await setDoc(
        doc(db, `tenants/${TENANT_ID}/users/${user.uid}`),
        profilUser
      );

      // 5. Jika Vendor — simpan dokumen toko di /vendors/{uid}
      // Vendor membuat 2 dokumen sekaligus (sesuai dokumen panduan)
      if (role === 'VENDOR') {
        await setDoc(
          doc(db, `tenants/${TENANT_ID}/vendors/${user.uid}`),
          {
            uid: user.uid,
            tenant_id: TENANT_ID,
            store: {
              name: formData.namaToko.trim(),
              city_id: formData.kota,
              category_id: formData.kategori,
            },
            is_active: false, // Aktif setelah Admin approve
            cities: [formData.kota],
            categories: [formData.kategori],
            products: [],
            created_at: serverTimestamp(),
            updated_at: serverTimestamp(),
          }
        );
      }

      // 6. Force refresh token — WAJIB agar role langsung terbaca
      // Tanpa ini, browser masih pakai token lama tanpa role
      await user.getIdToken(true);

      // 7. Catat audit log
      await setDoc(
        doc(db, `tenants/${TENANT_ID}/audit_logs/${Date.now()}`),
        {
          action: 'USER_REGISTER',
          actor: user.uid,
          role: role,
          tenant_id: TENANT_ID,
          timestamp: serverTimestamp(),
        }
      );

      // 8. Redirect sesuai role
      if (role === 'CUSTOMER') {
        router.push('/dashboard');
      } else {
        router.push('/pending-approval');
      }
    } catch (err: any) {
      // Tangani error Firebase yang umum
      if (err.code === 'auth/email-already-in-use') {
        setErrors({ email: 'Email ini sudah terdaftar' });
      } else if (err.code === 'auth/weak-password') {
        setErrors({ password: 'Password terlalu lemah' });
      } else {
        setErrors({ general: err.message || 'Terjadi kesalahan, coba lagi' });
      }
    } finally {
      setIsLoading(false);
    }
  }

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-10 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8">

        {/* Header */}
        <p className="text-xs text-gray-400 mb-1 font-mono">app/register/page.tsx</p>
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Buat akun baru</h1>

        {/* Error umum */}
        {errors.general && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {errors.general}
          </div>
        )}

        {/* ---- ROLE SELECTOR — 2 kartu pilihan ---- */}
        <div className="mb-6">
          <Label className="text-sm text-gray-500 mb-2 block">Daftar sebagai</Label>
          <div className="grid grid-cols-2 gap-3">

            {/* Kartu Customer */}
            <button
              type="button"
              onClick={() => { setRole('CUSTOMER'); setErrors({}); }}
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                role === 'CUSTOMER'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <p className={`font-semibold text-sm ${role === 'CUSTOMER' ? 'text-blue-700' : 'text-gray-700'}`}>
                Customer
              </p>
              <p className={`text-xs mt-1 ${role === 'CUSTOMER' ? 'text-blue-500' : 'text-gray-400'}`}>
                Langsung aktif setelah daftar
              </p>
            </button>

            {/* Kartu Vendor */}
            <button
              type="button"
              onClick={() => { setRole('VENDOR'); setErrors({}); }}
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                role === 'VENDOR'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <p className={`font-semibold text-sm ${role === 'VENDOR' ? 'text-blue-700' : 'text-gray-700'}`}>
                Vendor / Mitra
              </p>
              <p className={`text-xs mt-1 ${role === 'VENDOR' ? 'text-blue-500' : 'text-gray-400'}`}>
                Perlu persetujuan admin
              </p>
            </button>

          </div>
        </div>

        {/* ---- FIELD UTAMA (Customer + Vendor) ---- */}
        <div className="space-y-4">

          {/* Nama lengkap */}
          <div>
            <Label htmlFor="nama" className="text-sm text-gray-600 mb-1 block">Nama lengkap</Label>
            <Input
              id="nama"
              placeholder="Contoh: Budi Santoso"
              value={formData.nama}
              onChange={(e) => handleChange('nama', e.target.value)}
              className={errors.nama ? 'border-red-400' : ''}
            />
            {errors.nama && <p className="text-xs text-red-500 mt-1">{errors.nama}</p>}
          </div>

          {/* Email */}
          <div>
            <Label htmlFor="email" className="text-sm text-gray-600 mb-1 block">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="budi@email.com"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className={errors.email ? 'border-red-400' : ''}
            />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
          </div>

          {/* Nomor WhatsApp */}
          <div>
            <Label htmlFor="phone" className="text-sm text-gray-600 mb-1 block">Nomor WhatsApp</Label>
            <Input
              id="phone"
              placeholder="08xxx"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              className={errors.phone ? 'border-red-400' : ''}
            />
            {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
            <p className="text-xs text-gray-400 mt-1">Dipakai untuk notifikasi order</p>
          </div>

          {/* Password + Konfirmasi */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="password" className="text-sm text-gray-600 mb-1 block">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                className={errors.password ? 'border-red-400' : ''}
              />
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
            </div>
            <div>
              <Label htmlFor="confirmPassword" className="text-sm text-gray-600 mb-1 block">Ulangi password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                className={errors.confirmPassword ? 'border-red-400' : ''}
              />
              {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>}
            </div>
          </div>

        </div>

        {/* ---- FIELD TAMBAHAN VENDOR (muncul hanya jika pilih Vendor) ---- */}
        {role === 'VENDOR' && (
          <div className="mt-4 space-y-4 pt-4 border-t border-gray-100">
            <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">
              Informasi Toko Anda
            </p>

            {/* Nama toko */}
            <div>
              <Label htmlFor="namaToko" className="text-sm text-gray-600 mb-1 block">Nama toko</Label>
              <Input
                id="namaToko"
                placeholder="Contoh: Toko Budi AC"
                value={formData.namaToko}
                onChange={(e) => handleChange('namaToko', e.target.value)}
                className={errors.namaToko ? 'border-red-400' : ''}
              />
              {errors.namaToko && <p className="text-xs text-red-500 mt-1">{errors.namaToko}</p>}
            </div>

            {/* Kota operasional — dari Firestore */}
            <div>
              <Label htmlFor="kota" className="text-sm text-gray-600 mb-1 block">Kota operasional</Label>
              <select
                id="kota"
                value={formData.kota}
                onChange={(e) => handleChange('kota', e.target.value)}
                disabled={isLoadingConfig}
                className={`w-full h-10 px-3 rounded-md border text-sm bg-white
                  ${errors.kota ? 'border-red-400' : 'border-gray-200'}
                  focus:outline-none focus:ring-2 focus:ring-blue-500`}
              >
                <option value="">
                  {isLoadingConfig ? 'Memuat kota...' : 'Pilih kota coverage'}
                </option>
                {daftarKota.map((k) => (
                  <option key={k.id} value={k.id}>{k.name}</option>
                ))}
              </select>
              {errors.kota && <p className="text-xs text-red-500 mt-1">{errors.kota}</p>}
              <p className="text-xs text-gray-400 mt-1">Pilihan diambil otomatis dari database Firestore</p>
            </div>

            {/* Kategori layanan — dari Firestore */}
            <div>
              <Label htmlFor="kategori" className="text-sm text-gray-600 mb-1 block">Kategori layanan</Label>
              <select
                id="kategori"
                value={formData.kategori}
                onChange={(e) => handleChange('kategori', e.target.value)}
                disabled={isLoadingConfig}
                className={`w-full h-10 px-3 rounded-md border text-sm bg-white
                  ${errors.kategori ? 'border-red-400' : 'border-gray-200'}
                  focus:outline-none focus:ring-2 focus:ring-blue-500`}
              >
                <option value="">
                  {isLoadingConfig ? 'Memuat kategori...' : 'Pilih kategori jasa'}
                </option>
                {daftarKategori.map((k) => (
                  <option key={k.id} value={k.id}>{k.name}</option>
                ))}
              </select>
              {errors.kategori && <p className="text-xs text-red-500 mt-1">{errors.kategori}</p>}
            </div>

          </div>
        )}

        {/* Notifikasi info Vendor (untuk Customer, sebagai pengingat) 
        {role === 'CUSTOMER' && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-700">
              Khusus Vendor: ditambah field nama toko, kategori jasa, dan deskripsi bisnis
            </p>
          </div>
        )}*/}

        {/* Tombol Daftar */}
        <Button
          className="w-full mt-6 h-11 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white"
          onClick={handleDaftar}
          disabled={isLoading}
        >
          {isLoading ? 'Mendaftarkan...' : 'Daftar Sekarang'}
        </Button>

        {/* Link ke Login */}
        <p className="text-center text-sm text-gray-400 mt-4">
          Sudah punya akun?{' '}
          <a href="/login" className="text-blue-600 hover:underline font-medium">
            Masuk di sini
          </a>
        </p>

      </div>
    </div>
  );
}