'use client'
// app/dashboard/superadmin/providers/DialogKonfigurasiKoneksi.tsx
// Orchestrator modal konfigurasi — state management + API calls.
// Visual rendering di: DialogKonfigurasi.body.tsx + DialogKonfigurasi.fields.tsx
// Update S#152: fix DialogTitle (accessibility), hapus panduan prop (sekarang per-field)
// Update S#216: mode edit (Kelola) — pre-fill form dari DB + tidak buat instance baru
// Update S#246: tambah fdsAll state + load getFieldDefinitionsAll + handler onToggleIsAktif
// Update S#247: FieldsKelola→FieldsSetup, section tampil semua mode bukan hanya isEditMode
// Dibuat: Sesi #107 — Update: Sesi #151, S#152, S#216

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { DialogKonfigHeader, DialogKonfigBody, DialogKonfigFooter } from './DialogKonfigurasi.body'
import type { ServiceProvider, ProviderFieldDef, ProviderInstance } from '@/lib/types/provider.types'

const MONITOR = new Set(['supabase-management', 'github', 'vercel', 'qstash'])

interface TR { berhasil: boolean; pesan: string | null; latency_ms: number | null }
interface Props { open: boolean; provider: ServiceProvider | null; onClose: () => void; onSuccess: () => void }

export function DialogKonfigurasiKoneksi({ open, provider, onClose, onSuccess }: Props) {
  const [fds,                setFds]               = useState<ProviderFieldDef[]>([])
  const [fdsAll,             setFdsAll]            = useState<ProviderFieldDef[]>([])
  const [ns,                 setNs]                = useState('')
  const [cred,               setCred]              = useState<Record<string, string>>({})
  const [show,               setShow]              = useState<Record<string, boolean>>({})
  const [saving,             setSaving]            = useState(false)
  const [res,                setRes]               = useState<TR | null>(null)
  const [existingInstanceId, setExistingInstanceId]= useState<string | null>(null)
  const [loadingCred,        setLoadingCred]       = useState(false)
  const [togglingId,         setTogglingId]        = useState<string | null>(null)

  const isMon = provider ? MONITOR.has(provider.kode) : false
  const isQS  = provider?.kode === 'qstash'
  const link  = fds.find(f => f.deep_link_url)?.deep_link_url ?? null

  useEffect(() => {
    if (!open || !provider) return
    setFds([]); setFdsAll([]); setCred({}); setShow({}); setRes(null); setExistingInstanceId(null)
    setNs(provider.nama + ' Production')
    setLoadingCred(false)

    async function loadData() {
      // Paralel: load field defs + instances existing
      const [fdsRes, fdsAllRes, instRes] = await Promise.all([
        fetch(`/api/superadmin/providers/${provider!.id}/field-defs`).then(r => r.json()),
        fetch(`/api/superadmin/providers/${provider!.id}/field-defs/all`).then(r => r.json()),
        fetch(`/api/superadmin/providers/${provider!.id}/instances`).then(r => r.json()),
      ])

      if (fdsRes.success) setFds(fdsRes.data)
      if (fdsAllRes.success) setFdsAll(fdsAllRes.data)

      // Jika ada instance yang sudah terkonfigurasi — mode EDIT (Kelola)
      if (instRes.success && instRes.data?.length > 0) {
        // Ambil instance is_default, atau yang terbaru jika tidak ada default
        const instances: ProviderInstance[] = instRes.data
        const defaultInst = instances.find(i => i.is_default) ?? instances[instances.length - 1]
        setExistingInstanceId(defaultInst.id)
        setNs(defaultInst.nama_server)

        // Load credentials plaintext untuk pre-fill form
        setLoadingCred(true)
        try {
          const credRes = await fetch(
            `/api/superadmin/providers/instances/${defaultInst.id}/credentials`
          ).then(r => r.json())

          if (credRes.success && credRes.data) {
            // credRes.data = { [field_def_id]: plaintext }
            // Langsung set ke cred state (sudah pakai field_def_id sebagai key)
            setCred(credRes.data)
          }
        } catch {
          toast.error('Gagal memuat credential yang tersimpan')
        } finally {
          setLoadingCred(false)
        }
      }
    }

    loadData().catch(e => console.error('[DialogKonfigurasiKoneksi] loadData error:', e))
  }, [open, provider])

  const onToggleIsAktif = useCallback(async (fieldDefId: string, isAktif: boolean) => {
    if (!provider) return
    setTogglingId(fieldDefId)
    try {
      const r = await fetch(
        `/api/superadmin/providers/${provider.id}/field-defs/${fieldDefId}`,
        { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_aktif: isAktif }) }
      ).then(res => res.json())
      if (!r.success) { toast.error('Gagal mengubah status field'); return }
      // Update state lokal — tidak perlu refetch
      setFdsAll(prev => prev.map(f => f.id === fieldDefId ? { ...f, is_aktif: isAktif } : f))
      setFds(prev => isAktif
        ? (fdsAll.find(f => f.id === fieldDefId)
           ? [...prev, { ...fdsAll.find(f => f.id === fieldDefId)! }].sort((a, b) => a.sort_order - b.sort_order)
           : prev)
        : prev.filter(f => f.id !== fieldDefId)
      )
      toast.success(isAktif ? 'Field diaktifkan' : 'Field dinonaktifkan')
    } catch { toast.error('Terjadi error jaringan') }
    finally { setTogglingId(null) }
  }, [provider, fdsAll])

  const onToggle   = useCallback((id: string) => setShow(p => ({ ...p, [id]: !p[id] })), [])
  const onChange   = useCallback((id: string, v: string) => setCred(p => ({ ...p, [id]: v })), [])
  const close = () => { setRes(null); onClose() }

  const save = useCallback(async () => {
    if (!provider || !ns.trim()) { toast.error('Nama instance harus diisi'); return }

    // Dalam mode EDIT (existingInstanceId ada): field kosong = tidak diubah (skip)
    // Dalam mode BARU: minimal 1 field harus terisi
    const fields = Object.entries(cred)
      .filter(([, v]) => v.trim())
      .map(([id, v]) => ({ field_def_id: id, field_key: '', nilai: v }))

    if (!fields.length) { toast.error('Minimal satu credential harus diisi'); return }
    setSaving(true); setRes(null)

    try {
      let iid = existingInstanceId  // pakai instance existing jika mode Kelola

      if (!iid) {
        // Mode BARU — buat instance baru
        const r1 = await (await fetch('/api/superadmin/providers/instances', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider_id: provider.id, nama_server: ns.trim(), is_default: true, deskripsi: null }),
        })).json()
        if (!r1.success) { toast.error(r1.message ?? 'Gagal membuat instance'); return }
        toast.success('Instance dibuat — menyimpan credential...')
        iid = r1.data.id as string
      } else {
        toast.success('Menyimpan credential yang diubah...')
      }

      // Simpan credentials (upsert — idempotent, field kosong di-skip oleh filter di atas)
      const r2 = await (await fetch(`/api/superadmin/providers/instances/${iid}/credentials`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }),
      })).json()
      if (!r2.success) { toast.error(r2.message ?? 'Gagal menyimpan credential'); return }
      toast.success('Credential tersimpan — menjalankan test...')

      // Test koneksi
      const r3 = await (await fetch(`/api/superadmin/providers/instances/${iid}/test`, { method: 'POST' })).json()
      const d = r3.data ?? {}
      setRes({ berhasil: d.berhasil ?? false, pesan: d.pesan ?? null, latency_ms: d.latency_ms ?? null })
      if (d.berhasil) setTimeout(onSuccess, 1500)
    } catch { toast.error('Terjadi error jaringan') }
    finally { setSaving(false) }
  }, [provider, ns, cred, existingInstanceId, onSuccess])

  return (
    <Dialog open={open} onOpenChange={o => !o && close()}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden" showCloseButton={false}>
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
          loadingCred={loadingCred}
          isEditMode={!!existingInstanceId}
          fdsAll={fdsAll}
          onToggleIsAktif={onToggleIsAktif}
          togglingId={togglingId}
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
