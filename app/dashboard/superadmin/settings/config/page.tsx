import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth-server'
import { getAdminDb } from '@/lib/firebase-admin'
import { ConfigPageClient } from './ConfigPageClient'

export default async function LoginSettingsPage() {
  const cookieStore = await cookies()
  const session = cookieStore.get('session')?.value

  if (!session) redirect('/login')

  const decoded = await verifyJWT(session)
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
