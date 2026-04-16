import { redirect } from 'next/navigation'
import { verifyJWT } from '@/lib/auth-server'
import { getAdminDb } from '@/lib/firebase-admin'
import { ConfigPageClient } from './ConfigPageClient'

export default async function LoginSettingsPage() {
  // verifyJWT() baca cookie sendiri — tidak perlu ambil cookie manual
  const decoded = await verifyJWT()
  if (!decoded || decoded.role !== 'SUPERADMIN') redirect('/login')

  const db = getAdminDb()
  const docSnap = await db
    .collection('platform_config')
    .doc('config_registry')
    .collection('items')
    .doc('security_login')
    .get()

  const groups = docSnap.exists ? (docSnap.data()?.groups ?? []) : []

  return <ConfigPageClient initialData={groups} />
}
