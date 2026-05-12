'use client'

// app/dashboard/superadmin/tenants/DialogTambahTenant.tsx
// Dialog Tambah Tenant — Opsi B staged minimal (3 field wajib + PIC awal)
// Referensi: PAGE_SPEC_SUPERADMIN_v2 BAB 8.4
//
// Dibuat: Sesi #132 — M6 FASE 3 Step 3.7

import { useState }       from 'react'
import { toast }          from 'sonner'
import { Button }         from '@/components/ui/button'
import { Input }          from '@/components/ui/input'
import { Label }          from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import type { BuatTenantPayload, TenantTipe } from '@/lib/types/tenant.types'

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  open:      boolean
  onClose:   () => void
  onSuccess: () => void
}

// ─── State default ────────────────────────────────────────────────────────────

const INIT: BuatTenantPayload = {
  nama_brand: '', nama_legal: '', slug: '',
  tipe: 'eksternal', npwp: '',
  pic_name: '', pic_email: '', pic_wa: '',
}

// ─── Helper: auto-generate slug dari nama brand ───────────────────────────────

function toSlug(s: string): string {
  return s.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim().replace(/\s+/g, '-').replace(/-+/g, '-')
    .slice(0, 50)
}

// ─── Komponen ─────────────────────────────────────────────────────────────────

export function DialogTambahTenant({ open, onClose, onSuccess }: Props) {
  const [form,    setForm]    = useState<BuatTenantPayload>(INIT)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')
  const [step,    setStep]    = useState<1 | 2>(1)

  const set = (key: keyof BuatTenantPayload, val: string) =>
    setForm(f => ({ ...f, [key]: val }))

  const handleNamaBrand = (val: string) => {
    setForm(f => ({ ...f, nama_brand: val, slug: toSlug(val) }))
  }

  const handleSubmit = async () => {
    setError('')
    setSaving(true)
    try {
      const res  = await fetch('/api/superadmin/tenants', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message)
      onSuccess()
      setForm(INIT)
      setStep(1)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal membuat tenant')
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    setForm(INIT)
    setStep(1)
    setError('')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Tambah Tenant Baru</DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex gap-2 mb-2">
          {[1, 2].map(s => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${
              step >= s ? 'bg-primary' : 'bg-muted'
            }`} />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Langkah 1 — Info dasar tenant</p>

            <div className="space-y-2">
              <Label>Nama Brand <span className="text-destructive">*</span></Label>
              <Input value={form.nama_brand} onChange={e => handleNamaBrand(e.target.value)}
                placeholder="Contoh: Jaya Motor" />
            </div>
            <div className="space-y-2">
              <Label>Nama Legal</Label>
              <Input value={form.nama_legal} onChange={e => set('nama_legal', e.target.value)}
                placeholder="PT / CV / nama usaha resmi" />
            </div>
            <div className="space-y-2">
              <Label>Kode Tenant (slug) <span className="text-destructive">*</span></Label>
              <Input value={form.slug} onChange={e => set('slug', e.target.value)}
                placeholder="jaya-motor" className="font-mono text-sm" />
              <p className="text-xs text-muted-foreground">Huruf kecil, angka, tanda hubung. Tidak bisa diubah setelah dibuat.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tipe <span className="text-destructive">*</span></Label>
                <Select value={form.tipe} onValueChange={v => set('tipe', v as TenantTipe)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="eksternal">Eksternal</SelectItem>
                    <SelectItem value="internal">Internal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>NPWP <span className="text-destructive">*</span></Label>
                <Input value={form.npwp} onChange={e => set('npwp', e.target.value)}
                  placeholder="15 atau 16 digit" />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Langkah 2 — PIC awal (Person In Charge)</p>

            <div className="space-y-2">
              <Label>Nama PIC <span className="text-destructive">*</span></Label>
              <Input value={form.pic_name} onChange={e => set('pic_name', e.target.value)}
                placeholder="Nama lengkap PIC" />
            </div>
            <div className="space-y-2">
              <Label>Email PIC <span className="text-destructive">*</span></Label>
              <Input type="email" value={form.pic_email} onChange={e => set('pic_email', e.target.value)}
                placeholder="email@perusahaan.com" />
            </div>
            <div className="space-y-2">
              <Label>WhatsApp PIC <span className="text-destructive">*</span></Label>
              <Input value={form.pic_wa} onChange={e => set('pic_wa', e.target.value)}
                placeholder="628xxx..." />
              <p className="text-xs text-muted-foreground">Format: 628xxxxxxxxxx</p>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={saving}>Batal</Button>
          {step === 1 ? (
            <Button
              onClick={() => setStep(2)}
              disabled={!form.nama_brand || !form.slug || !form.npwp}
            >
              Lanjut →
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep(1)} disabled={saving}>← Kembali</Button>
              <Button
                onClick={handleSubmit}
                disabled={saving || !form.pic_name || !form.pic_email || !form.pic_wa}
              >
                {saving ? 'Menyimpan...' : 'Buat Tenant'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
