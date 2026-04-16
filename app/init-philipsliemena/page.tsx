'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/lib/firebase'

function PasswordInput({ value, onChange, placeholder }: { value: string, onChange: (v: string) => void, placeholder: string }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-slate-300 rounded-lg px-3 py-2 pr-10 text-sm text-slate-900 focus:outline-none focus:border-blue-500"
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
      >
        {show ? 'Sembunyikan' : 'Tampilkan'}
      </button>
    </div>
  )
}

export default function SetupPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [isLocked, setIsLocked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState({
    nama: '',
    email: '',
    password: '',
    confirmPassword: '',
    setupKey: '',
  })

  useEffect(() => {
    const checkSetup = async () => {
      try {
        const res = await fetch('/api/setup/check')
        const data = await res.json()
        if (data.is_setup_complete) setIsLocked(true)
      } catch {
        setError('Gagal memeriksa status setup.')
      } finally {
        setChecking(false)
      }
    }
    checkSetup()
  }, [])

  const handleSubmit = async () => {
    setError('')
    if (!form.nama || !form.email || !form.password || !form.confirmPassword || !form.setupKey) {
      setError('Semua field wajib diisi.')
      return
    }
    if (form.password !== form.confirmPassword) {
      setError('Password tidak cocok. Periksa kembali password dan ulangi password.')
      return
    }
    if (form.password.length < 8) {
      setError('Password minimal 8 karakter.')
      return
    }
    try {
      setLoading(true)
      const res = await fetch('/api/setup/create-superadmin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama: form.nama,
          email: form.email,
          password: form.password,
          setupKey: form.setupKey,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || 'Gagal membuat akun SuperAdmin.')
        return
      }
      await signInWithEmailAndPassword(auth, form.email, form.password)
      setSuccess(true)
      setTimeout(() => router.push('/dashboard/superadmin'), 1500)
    } catch (err: any) {
      setError('Gagal login otomatis. Silakan login manual.')
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500 text-sm">Memeriksa status setup...</p>
      </div>
    )
  }

  if (isLocked) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Setup Sudah Selesai</h1>
          <p className="text-slate-500 text-sm mb-6">Akun SuperAdmin sudah pernah dibuat. Halaman ini tidak bisa diakses lagi.</p>
          <button onClick={() => router.push('/login')} className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-colors">
            Ke Halaman Login
          </button>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">✅</div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Akun SuperAdmin Berhasil Dibuat</h1>
          <p className="text-slate-500 text-sm">Mengarahkan ke Dashboard SuperAdmin...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="text-3xl mb-3">⚙️</div>
          <h1 className="text-xl font-bold text-slate-900">Setup Awal Platform</h1>
          <p className="text-slate-500 text-sm mt-1">Buat akun SuperAdmin untuk mengelola platform ini. Halaman ini hanya bisa digunakan satu kali.</p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Nama Lengkap</label>
            <input type="text" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} placeholder="Nama lengkap SuperAdmin" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@domain.com" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Password</label>
            <PasswordInput value={form.password} onChange={(v) => setForm({ ...form, password: v })} placeholder="Minimal 8 karakter" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Ulangi Password
              {form.confirmPassword && form.password && (
                <span className={`ml-2 font-normal ${form.password === form.confirmPassword ? 'text-green-500' : 'text-red-500'}`}>
                  {form.password === form.confirmPassword ? '✓ Cocok' : '✗ Tidak cocok'}
                </span>
              )}
            </label>
            <PasswordInput value={form.confirmPassword} onChange={(v) => setForm({ ...form, confirmPassword: v })} placeholder="Ulangi password" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Setup Key <span className="text-slate-400 font-normal">(lihat file .env.local)</span></label>
            <PasswordInput value={form.setupKey} onChange={(v) => setForm({ ...form, setupKey: v })} placeholder="Masukkan setup key" />
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <p className="text-red-700 text-xs">{error}</p>
            </div>
          )}
          <button onClick={handleSubmit} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-colors">
            {loading ? 'Membuat akun...' : 'Buat Akun SuperAdmin'}
          </button>
        </div>
        <p className="text-center text-xs text-slate-400 mt-4">Setelah berhasil, halaman ini terkunci permanen.</p>
      </div>
    </div>
  )
}
