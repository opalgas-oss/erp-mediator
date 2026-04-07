'use client';

import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';

export default function PendingApprovalPage() {
  const router = useRouter();

  async function handleKeluar() {
    await signOut(auth);
    router.push('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">

        {/* Ikon status */}
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <div className="w-8 h-8 bg-amber-400 rounded-full" />
        </div>

        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          Pendaftaran Berhasil!
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Akun Vendor Anda sedang menunggu persetujuan dari Admin.
          Kami akan menghubungi Anda via WhatsApp setelah akun diaktifkan.
        </p>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-left">
          <p className="text-xs font-semibold text-amber-700 mb-2">Yang terjadi selanjutnya:</p>
          <p className="text-xs text-amber-600">1. Admin mereview data toko Anda</p>
          <p className="text-xs text-amber-600">2. Notifikasi dikirim via WhatsApp</p>
          <p className="text-xs text-amber-600">3. Anda bisa mulai terima order</p>
        </div>

        <button
          onClick={handleKeluar}
          className="text-sm text-gray-400 hover:text-gray-600 underline"
        >
          Keluar dari akun ini
        </button>

      </div>
    </div>
  );
}
