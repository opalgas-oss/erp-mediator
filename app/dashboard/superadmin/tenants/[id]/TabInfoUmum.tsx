'use client'

// app/dashboard/superadmin/tenants/[id]/TabInfoUmum.tsx
// Tab Info Umum — 5 cluster field (Identitas, Legalitas, Kontak, Klasifikasi, Branding)
// Referensi: PAGE_SPEC_SUPERADMIN_v2 BAB 8.2.1
//
// Dibuat: Sesi #132 — M6 FASE 3 Step 3.7

import { useState }  from 'react'
import { toast }     from 'sonner'
import { Button }    from '@/components/ui/button'
import { Input }     from '@/components/ui/input'
import { Label }     from '@/components/ui/label'
import { Textarea }  from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Tenant, UpdateTenantInfoPayload, TenantLifecycleStatus } from '@/lib/types/tenant.types'
import { TENANT_LIFECYCLE_LABEL } from '@/lib/constants/tenant.constant'

interface Props { tenant: Tenant; onRefresh: () => void }

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border p-4 space-y-3">
      <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">{title}</h3>
      {children}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm">{value || <span className="text-muted-foreground italic">—</span>}</span>
    </div>
  )
}

// ─── Komponen ─────────────────────────────────────────────────────────────────

export function TabInfoUmum({ tenant, onRefresh }: Props) {
  const [editing, setEditing]   = useState(false)
  const [saving,  setSaving]    = useState(false)
  const [form,    setForm]      = useState<Partial<UpdateTenantInfoPayload>>({})

  const set = (k: keyof UpdateTenantInfoPayload, v: string) =>
    setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    try {
      const res  = await fetch(`/api/superadmin/tenants/${tenant.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message)
      toast.success('Info tenant diperbarui')
      setEditing(false)
      setForm({})
      onRefresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal menyimpan')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 max-w-3xl">

      {/* Header edit toggle */}
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
            Edit Info
          </Button>
        )}
      </div>

      {/* Cluster 1: Identitas */}
      <Section title="Identitas">
        <div className="grid grid-cols-2 gap-4">
          {editing ? (
            <>
              <div className="space-y-1.5">
                <Label>Nama Brand</Label>
                <Input defaultValue={tenant.nama_brand} onChange={e => set('nama_brand', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Nama Legal</Label>
                <Input defaultValue={tenant.nama_legal ?? ''} onChange={e => set('nama_legal', e.target.value)} />
              </div>
            </>
          ) : (
            <>
              <Field label="Nama Brand"    value={tenant.nama_brand} />
              <Field label="Nama Legal"    value={tenant.nama_legal} />
            </>
          )}
          <Field label="Kode Tenant"      value={tenant.slug} />
          <Field label="Display ID"       value={tenant.tenant_display_id} />
        </div>
      </Section>

      {/* Cluster 2: Legalitas */}
      <Section title="Legalitas">
        <div className="grid grid-cols-2 gap-4">
          {editing ? (
            <>
              <div className="space-y-1.5">
                <Label>NPWP</Label>
                <Input defaultValue={tenant.npwp ?? ''} onChange={e => set('npwp', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>NIB</Label>
                <Input defaultValue={tenant.nib ?? ''} onChange={e => set('nib', e.target.value)} />
              </div>
            </>
          ) : (
            <>
              <Field label="NPWP"   value={tenant.npwp} />
              <Field label="NIB"    value={tenant.nib} />
            </>
          )}
          <Field label="Status PKP"   value={tenant.status_pkp?.toUpperCase()} />
          <Field label="Bentuk Badan" value={tenant.bentuk_badan_usaha?.toUpperCase()} />
        </div>
      </Section>

      {/* Cluster 3: Kontak */}
      <Section title="Kontak &amp; Domisili">
        <div className="grid grid-cols-2 gap-4">
          {editing ? (
            <>
              <div className="space-y-1.5">
                <Label>Email Resmi</Label>
                <Input defaultValue={tenant.email_resmi ?? ''} onChange={e => set('email_resmi', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>WA Bisnis</Label>
                <Input defaultValue={tenant.nomor_wa_bisnis ?? ''} onChange={e => set('nomor_wa_bisnis', e.target.value)} />
              </div>
            </>
          ) : (
            <>
              <Field label="Email Resmi" value={tenant.email_resmi} />
              <Field label="WA Bisnis"   value={tenant.nomor_wa_bisnis} />
            </>
          )}
          <Field label="Alamat"   value={tenant.alamat} />
          <Field label="Kota"     value={[tenant.kota, tenant.provinsi].filter(Boolean).join(', ')} />
        </div>
      </Section>

      {/* Cluster 4: Klasifikasi */}
      <Section title="Klasifikasi Internal">
        <div className="grid grid-cols-2 gap-4">
          {editing ? (
            <>
              <div className="space-y-1.5">
                <Label>Catatan Internal</Label>
                <Textarea
                  defaultValue={tenant.catatan_internal ?? ''}
                  onChange={e => set('catatan_internal', e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Region Coverage</Label>
                <Input defaultValue={tenant.region_coverage ?? ''} onChange={e => set('region_coverage', e.target.value)} />
              </div>
            </>
          ) : (
            <>
              <Field label="Catatan Internal" value={tenant.catatan_internal} />
              <Field label="Region"           value={tenant.region_coverage} />
            </>
          )}
          <Field label="Timezone" value={tenant.timezone} />
          <Field label="Bahasa"   value={tenant.bahasa} />
        </div>
      </Section>

      {/* Cluster 5: Status lifecycle (read-only dari tab ini) */}
      <Section title="Status Lifecycle">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Status Aktif"       value={TENANT_LIFECYCLE_LABEL[tenant.status]} />
          <Field label="Refund Auto Approve" value={tenant.refund_auto_approve ? 'Ya' : 'Tidak'} />
          <Field label="Dibuat"             value={new Date(tenant.created_at).toLocaleDateString('id-ID')} />
          <Field label="Diperbarui"         value={new Date(tenant.updated_at).toLocaleDateString('id-ID')} />
        </div>
        <p className="text-xs text-muted-foreground">Untuk ubah status lifecycle (suspend/terminate), gunakan menu aksi di header.</p>
      </Section>
    </div>
  )
}
