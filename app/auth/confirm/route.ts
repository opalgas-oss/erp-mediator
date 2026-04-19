import { redirect }      from 'next/navigation'
import { type NextRequest } from 'next/server'

// Route ini TIDAK langsung verifikasi token
// Tujuan: cegah Gmail scanner consume token saat preview email
// Token hanya diverifikasi setelah user klik tombol di halaman /auth/verify
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type       = searchParams.get('type')
  const next       = searchParams.get('next') ?? '/reset-password'

  if (token_hash && type) {
    redirect(`/auth/verify?token_hash=${token_hash}&type=${type}&next=${encodeURIComponent(next)}`)
  }

  redirect('/reset-password?error=invalid_link')
}