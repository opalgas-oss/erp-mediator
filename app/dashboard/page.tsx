'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';

export default function DashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setEmail(user.email || '');
      user.getIdTokenResult().then((result) => {
        setRole(result.claims.role as string || '');
      });
    }
  }, []);

  async function handleKeluar() {
    await signOut(auth);
    router.push('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">

        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <div className="w-8 h-8 bg-blue-500 rounded-full" />
        </div>

        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          Dashboard
        </h1>
        <p className="text-sm text-gray-500 mb-2">Login berhasil!</p>
        <p className="text-sm text-gray-700 mb-1">Email: <span className="font-medium">{email}</span></p>
        <p className="text-sm text-gray-700 mb-6">Role: <span className="font-medium text-blue-600">{role}</span></p>

        <button
          onClick={handleKeluar}
          className="text-sm text-gray-400 hover:text-gray-600 underline"
        >
          Keluar
        </button>

      </div>
    </div>
  );
}