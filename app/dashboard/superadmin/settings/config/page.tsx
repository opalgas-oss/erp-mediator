// Layout sudah verifikasi JWT — page tidak perlu verifikasi ulang
import { getAdminDb } from '@/lib/firebase-admin'
import { ConfigPageClient } from './ConfigPageClient'

export default async function LoginSettingsPage() {
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
