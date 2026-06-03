import { redirect }      from 'next/navigation'
import { type NextRequest } from 'next/server'

// Route ini TIDAK langsung verifikasi token
// Tujuan: cegah Gmail scanner consume token saat preview email
// Token hanya diverifikasi setelah user klik tombol di halaman /auth/verify
//
// Dua format token yang masuk:
// 1. token_hash + type  — dari signInWithOtp / magic link
// 2. token + type       — dari admin.generateLink (aktivasi AT)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const token      = searchParams.get('token')
  const type       = searchParams.get('type')
  const next       = searchParams.get('next') ?? '/reset-password'

  // Format 1: token_hash (magic link / OTP)
  if (token_hash && type) {
    redirect(`/auth/verify?token_hash=${token_hash}&type=${type}&next=${encodeURIComponent(next)}`)
  }

  // Format 2: token (admin.generateLink — aktivasi AT)
  if (token && type) {
    redirect(`/auth/verify?token_hash=${token}&type=${type}&next=${encodeURIComponent(next)}`)
  }

  redirect('/reset-password?error=invalid_link')
}