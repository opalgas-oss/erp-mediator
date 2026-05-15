'use client'
// app/dashboard/superadmin/providers/DialogKonfigurasiKoneksi.tsx
// Orchestrator modal konfigurasi — state management + API calls.
// Visual rendering di: DialogKonfigurasi.body.tsx + DialogKonfigurasi.fields.tsx
// Update S#152: fix DialogTitle (accessibility), hapus panduan prop (sekarang per-field)
// Dibuat: Sesi #107 — Update: Sesi #151, S#152

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { DialogKonfigHeader, DialogKonfigBody, DialogKonfigFooter } from './DialogKonfigurasi.body'
import type { ServiceProvider, ProviderFieldDef } from '@/lib/types/provider.types'

const MONITOR = new Set(['supabase-management', 'github', 'vercel', 'qstash'])

interface TR { berhasil: boolean; pesan: string | null; latency_ms: number | null }
interface Props { open: boolean; provider: ServiceProvider | null; onClose: () => void; onSuccess: () => void }

export function DialogKonfigurasiKoneksi({ open, provider, onClose, onSuccess }: Props) {
  const [fds,    setFds]    = useState<ProviderFieldDef[]>([])
  const [ns,     setNs]     = useState('')
  const [cred,   setCred]   = useState<Record<string, string>>({})
  const [show,   setShow]   = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)
  const [res,    setRes]    = useState<TR | null>(null)

  const isMon = provider ? MONITOR.has(provider.kode) : false
  const isQS  = provider?.kode === 'qstash'
  const link  = fds.find(f => f.deep_link_url)?.deep_link_url ?? null
  // panduan dihapus S#152 — sekarang inline per-field di CredentialFields via panduan_langkah

  useEffect(() => {
    if (!open || !provider) return
    setFds([]); setCred({}); setShow({}); setRes(null)
    setNs(provider.nama + ' Production')
    fetch(`/api/superadmin/providers/${provider.id}/field-defs`)
      .then(r => r.json()).then(j => { if (j.success) setFds(j.data) })
      .catch(() => toast.error('Gagal memuat field definisi'))
  }, [open, provider])

  const onToggle = useCallback((id: string) => setShow(p => ({ ...p, [id]: !p[id] })), [])
  const onChange = useCallback((id: string, v: string) => setCred(p => ({ ...p, [id]: v })), [])
  const close = () => { setRes(null); onClose() }

  const save = useCallback(async () => {
    if (!provider || !ns.trim()) { toast.error('Nama instance harus diisi'); return }
    const fields = Object.entries(cred).filter(([, v]) => v.trim()).map(([id, v]) => ({ field_def_id: id, field_key: '', nilai: v }))
    if (!fields.length) { toast.error('Minimal satu credential harus diisi'); return }
    setSaving(true); setRes(null)
    try {
      const r1 = await (await fetch('/api/superadmin/providers/instances', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider_id: provider.id, nama_server: ns.trim(), is_default: true, deskripsi: null }),
      })).json()
      if (!r1.success) { toast.error(r1.message ?? 'Gagal membuat instance'); return }
      toast.success('Instance dibuat — menyimpan credential...')
      const iid: string = r1.data.id

      const r2 = await (await fetch(`/api/superadmin/providers/instances/${iid}/credentials`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }),
      })).json()
      if (!r2.success) { toast.error(r2.message ?? 'Gagal menyimpan credential'); return }
      toast.success('Credential tersimpan — menjalankan test...')

      const r3 = await (await fetch(`/api/superadmin/providers/instances/${iid}/test`, { method: 'POST' })).json()
      const d = r3.data ?? {}
      setRes({ berhasil: d.berhasil ?? false, pesan: d.pesan ?? null, latency_ms: d.latency_ms ?? null })
      if (d.berhasil) setTimeout(onSuccess, 1500)
    } catch { toast.error('Terjadi error jaringan') }
    finally { setSaving(false) }
  }, [provider, ns, cred, onSuccess])

  return (
    <Dialog open={open} onOpenChange={o => !o && close()}>
      {/* sm:max-w-2xl (672px) — lebar cukup untuk form multi-field + panel panduan */}
      <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden" showCloseButton={false}>
        {/* DialogTitle wajib ada untuk aksesibilitas screen reader — disembunyikan visual */}
        <DialogTitle className="sr-only">
          {provider?.nama ? `Konfigurasi ${provider.nama}` : 'Konfigurasi Provider'}
        </DialogTitle>

        <DialogKonfigHeader provider={provider} isMon={isMon} />
        <DialogKonfigBody
          provider={provider} isQS={isQS} isMon={isMon}
          ns={ns} onNs={setNs}
          fds={fds} cred={cred} show={show}
          onChange={onChange} onToggle={onToggle}
          res={res}
        />
        <DialogKonfigFooter
          isQS={isQS} saving={saving}
          link={link} providerNama={provider?.nama ?? ''}
          onSave={save} onClose={close}
        />
      </DialogContent>
    </Dialog>
  )
}
