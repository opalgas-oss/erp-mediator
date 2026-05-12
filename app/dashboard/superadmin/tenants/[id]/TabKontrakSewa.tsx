'use client'

// app/dashboard/superadmin/tenants/[id]/TabKontrakSewa.tsx
// Tab Kontrak Sewa — info kontrak + status + tanggal
// Referensi: PAGE_SPEC_SUPERADMIN_v2 BAB 8.2.2
//
// Dibuat: Sesi #132 — M6 FASE 3 Step 3.7

import { useState } from 'react'
import { toast }    from 'sonner'
import { Button }   from '@/components/ui/button'
import { Input }    from '@/components/ui/input'
import { Label }    from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Tenant, TenantContractStatus } from '@/lib/types/tenant.types'
import { TENANT_CONTRACT_STATUS_LABEL }      from '@/lib/constants/tenant.constant'

interface Props { tenant: Tenant; onRefresh: () => void }

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm">{value || <span className="text-muted-foreground italic">—</span>}</span>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border p-4 space-y-3">
      <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">{title}</h3>
      {children}
    </div>
  )
}

export function TabKontrakSewa({ tenant, onRefresh }: Props) {
  const [editing, setEditing] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [form,    setForm]    = useState<Record<string, string | boolean | null>>({})

  const set = (k: string, v: string | boolean | null) =>
    setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    try {
      const res  = await fetch(`/api/superadmin/tenants/${tenant.id}?section=contract`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message)
      toast.success('Info kontrak diperbarui')
      setEditing(false)
      setForm({})
      onRefresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal menyimpan')
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : null

  return (
    <div className="space-y-4 max-w-3xl">

      <div className="flex justify-end">
        {editing ? (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setEditing(false); setForm({}) }} disabled={saving}>
              Batal
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            Edit Kontrak
          </Button>
        )}
      </div>

      {/* Info Kontrak */}
      <Section title="Info Kontrak">
        <div className="grid grid-cols-2 gap-4">
          {editing ? (
            <>
              <div className="space-y-1.5">
                <Label>Status Kontrak</Label>
                <Select
                  defaultValue={tenant.contract_status ?? 'draft'}
                  onValueChange={v => set('contract_status', v)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TENANT_CONTRACT_STATUS_LABEL).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Nomor Kontrak</Label>
                <Input defaultValue={tenant.contract_number ?? ''} onChange={e => set('contract_number', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Tanggal Mulai</Label>
                <Input type="date" defaultValue={tenant.contract_start_date?.split('T')[0] ?? ''} onChange={e => set('contract_start_date', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Tanggal Berakhir</Label>
                <Input type="date" defaultValue={tenant.contract_end_date?.split('T')[0] ?? ''} onChange={e => set('contract_end_date', e.target.value)} />
              </div>
            </>
          ) : (
            <>
              <Field label="Status Kontrak"  value={tenant.contract_status ? TENANT_CONTRACT_STATUS_LABEL[tenant.contract_status] : null} />
              <Field label="Nomor Kontrak"   value={tenant.contract_number} />
              <Field label="Tanggal Mulai"   value={formatDate(tenant.contract_start_date)} />
              <Field label="Tanggal Berakhir" value={formatDate(tenant.contract_end_date)} />
            </>
          )}
          <Field label="Kontrak Ditandatangani" value={tenant.contract_signed ? 'Ya' : 'Tidak'} />
          <Field label="Auto Renewal"           value={tenant.auto_renewal ? 'Ya' : 'Tidak'} />
        </div>
      </Section>

      {/* Dokumen */}
      <Section title="Dokumen Kontrak">
        {tenant.contract_file_url ? (
          <a
            href={tenant.contract_file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary underline underline-offset-2"
          >
            Lihat dokumen kontrak →
          </a>
        ) : (
          <p className="text-sm text-muted-foreground italic">Belum ada dokumen kontrak yang diunggah.</p>
        )}
        {editing && (
          <div className="space-y-1.5 mt-2">
            <Label>URL Dokumen</Label>
            <Input
              defaultValue={tenant.contract_file_url ?? ''}
              onChange={e => set('contract_file_url', e.target.value)}
              placeholder="https://..."
            />
          </div>
        )}
      </Section>

      {/* Perpanjangan */}
      <Section title="Ketentuan Perpanjangan">
        <div className="grid grid-cols-2 gap-4">
          {editing ? (
            <>
              <div className="space-y-1.5">
                <Label>Notifikasi Sebelum Berakhir (hari)</Label>
                <Input
                  type="number" min={7} max={365}
                  defaultValue={tenant.renewal_notice_days}
                  onChange={e => set('renewal_notice_days', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Biaya Terminasi Dini (Rp)</Label>
                <Input
                  type="number"
                  defaultValue={tenant.early_termination_fee ?? ''}
                  onChange={e => set('early_termination_fee', e.target.value || null)}
                />
              </div>
            </>
          ) : (
            <>
              <Field label="Notifikasi Sebelum Berakhir" value={`${tenant.renewal_notice_days} hari`} />
              <Field label="Biaya Terminasi Dini"        value={tenant.early_termination_fee ? `Rp ${Number(tenant.early_termination_fee).toLocaleString('id-ID')}` : null} />
            </>
          )}
        </div>
      </Section>
    </div>
  )
}
