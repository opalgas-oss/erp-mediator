// app/dashboard/superadmin/memberships/[uid]/page.tsx
// Halaman Detail User — SuperAdmin Dashboard.
// RSC: fetch user info + semua membership via service → pass ke MembershipDetailClient.
//
// Dibuat: Sesi #136 — M8 User Membership Management

export const dynamic = 'force-dynamic'

import { notFound }                              from 'next/navigation'
import { MembershipService_getUserMemberships }  from '@/lib/services/membership.service'
import { MembershipDetailClient }                from './MembershipDetailClient'

interface Props {
  params: Promise<{ uid: string }>
}

export default async function MembershipDetailPage({ params }: Props) {
  const { uid } = await params

  try {
    const data = await MembershipService_getUserMemberships(uid)
    return <MembershipDetailClient initialData={data} userId={uid} />
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (message.includes('tidak ditemukan')) notFound()
    return (
      <div className="p-6">
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Gagal memuat data user. Silakan refresh halaman.
        </div>
      </div>
    )
  }
}
