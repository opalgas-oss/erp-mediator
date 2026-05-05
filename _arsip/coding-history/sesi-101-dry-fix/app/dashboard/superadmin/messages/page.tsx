// ARSIP sesi-101-dry-fix — app/dashboard/superadmin/messages/page.tsx
// Sebelum: ganti query DB langsung → MessageLibraryService_getAllForAdmin()
export const dynamic = 'force-dynamic'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { MessageLibraryClient } from './MessageLibraryClient'
import type { MessageItem } from '@/lib/message-library'
export default async function MessageLibraryPage() {
  const db = createServerSupabaseClient()
  const { data, error } = await db.from('message_library').select('id, key, kategori, channel, teks, variabel, keterangan, is_active, updated_at, updated_by').order('kategori', { ascending: true }).order('key', { ascending: true })
  if (error) return (<div className="p-6"><div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">Gagal memuat data pesan. Silakan refresh halaman.</div></div>)
  const messages = (data ?? []) as MessageItem[]
  const kategoriList = [...new Set(messages.map(m => m.kategori))].sort()
  return <MessageLibraryClient initialData={messages} kategoriList={kategoriList} />
}
