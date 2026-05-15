'use client'
// app/dashboard/superadmin/providers/DialogTambahInstance.tsx
// Dialog tambah instance baru untuk satu provider.
// Dipecah dari ProvidersClient.tsx S#151 (ATURAN 9 — file sebelumnya 22.35 KB)
// Dibuat: Sesi #151

import { useState }    from 'react'
import { toast }       from 'sonner'
import { Button }      from '@/components/ui/button'
import { Input }       from '@/components/ui/input'
import { Label }       from '@/components/ui/label'
import { Textarea }    from '@/components/ui/textarea'
import { Switch }      from '@/components/ui/switch'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { ICON_STATUS } from '@/lib/constants/icons.constant'
import type { ServiceProvider, ProviderInstance } from '@/lib/types/provider.types'

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  open:     boolean
  provider: ServiceProvider | null
  onClose:  () => void
  onSuccess:(instance: ProviderInstance) => void
}

// ─── Komponen ─────────────────────────────────────────────────────────────────

export function DialogTambahInstance({ open, provider, onClose, onSuccess }: Props) {
  const [form,   setForm]   = useState({ nama_server: '', deskripsi: '', is_default: false })
  const [saving, setSaving] = useState(false)

  const handleSimpan = async () => {
    if (!provider || !form.nama_server.trim()) return
    setSaving(true)
    try {
      const res  = await fetch('/api/superadmin/providers/instances', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          provider_id: provider.id,
          nama_server: form.nama_server.trim(),
          deskripsi:   form.deskripsi.trim() || null,
          is_default:  form.is_default,
        }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Instance berhasil ditambahkan')
        setForm({ nama_server: '', deskripsi: '', is_default: false })
        onSuccess(json.data)
      } else {
        toast.error(json.message ?? 'Gagal menyimpan instance')
      }
    } catch {
      toast.error('Gagal menyimpan instance')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah Instance — {provider?.nama}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="nama_server">Nama Instance *</Label>
            <Input
              id="nama_server"
              placeholder="Contoh: Xendit Production"
              value={form.nama_server}
              onChange={e => setForm(p => ({ ...p, nama_server: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="deskripsi">Keterangan</Label>
            <Textarea
              id="deskripsi"
              placeholder="Opsional"
              value={form.deskripsi}
              onChange={e => setForm(p => ({ ...p, deskripsi: e.target.value }))}
              rows={2}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="is_default"
              checked={form.is_default}
              onCheckedChange={v => setForm(p => ({ ...p, is_default: v }))}
            />
            <Label htmlFor="is_default">Jadikan instance default</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={handleSimpan} disabled={saving || !form.nama_server.trim()}>
            {saving ? <ICON_STATUS.loading size={14} className="animate-spin mr-1" /> : null}
            Buat Instance
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
