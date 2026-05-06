'use client'
// app/dashboard/superadmin/providers/ProvidersClient.tsx
// UI split view — panel kiri (daftar provider) + panel kanan (instances per provider).
// Dialog: Tambah Instance, Isi Credential, Test Koneksi.
// Dibuat: Sesi #107 — M3 Credential Management

import { useState, useCallback }                  from 'react'
import { toast }                                   from 'sonner'
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card'
import { Button }                                  from '@/components/ui/button'
import { Input }                                   from '@/components/ui/input'
import { Label }                                   from '@/components/ui/label'
import { Textarea }                                from '@/components/ui/textarea'
import { Switch }                                  from '@/components/ui/switch'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { HealthBadge }              from '@/components/superadmin/HealthBadge'
import { ICON_ACTION, ICON_STATUS } from '@/lib/constants/icons.constant'
import { TYPOGRAPHY }               from '@/lib/constants/ui-tokens.constant'
import type {
  ServiceProvider,
  ProviderInstance,
  ProviderFieldDef,
  InstanceCredential,
} from '@/lib/types/provider.types'

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  initialProviders: ServiceProvider[]
}

// ─── State dialog ─────────────────────────────────────────────────────────────

type DialogMode = 'tambah-instance' | 'isi-credential' | null

// ─── Komponen ─────────────────────────────────────────────────────────────────

export function ProvidersClient({ initialProviders }: Props) {
  const [providers,        setProviders]        = useState<ServiceProvider[]>(initialProviders)
  const [selectedProvider, setSelectedProvider] = useState<ServiceProvider | null>(null)
  const [instances,        setInstances]        = useState<ProviderInstance[]>([])
  const [fieldDefs,        setFieldDefs]        = useState<ProviderFieldDef[]>([])
  const [fingerprints,     setFingerprints]     = useState<InstanceCredential[]>([])
  const [loadingInstances, setLoadingInstances] = useState(false)
  const [testingId,        setTestingId]        = useState<string | null>(null)
  const [dialogMode,       setDialogMode]       = useState<DialogMode>(null)
  const [activeInstanceId, setActiveInstanceId] = useState<string | null>(null)
  const [saving,           setSaving]           = useState(false)

  // Form state: tambah instance
  const [formInstance, setFormInstance] = useState({ nama_server: '', deskripsi: '', is_default: false })

  // Form state: isi credential (map field_def_id → nilai)
  const [formCred, setFormCred] = useState<Record<string, string>>({})

  // ─── Load instances saat provider dipilih ──────────────────────────────────

  const handleSelectProvider = useCallback(async (provider: ServiceProvider) => {
    setSelectedProvider(provider)
    setInstances([])
    setLoadingInstances(true)
    try {
      const res  = await fetch(`/api/superadmin/providers/${provider.id}/instances`)
      const json = await res.json()
      if (json.success) setInstances(json.data)
    } catch {
      toast.error('Gagal memuat instances')
    } finally {
      setLoadingInstances(false)
    }
  }, [])

  // ─── Test koneksi per instance ─────────────────────────────────────────────

  const handleTestKoneksi = useCallback(async (instanceId: string) => {
    setTestingId(instanceId)
    try {
      const res  = await fetch(`/api/superadmin/providers/instances/${instanceId}/test`, { method: 'POST' })
      const json = await res.json()
      if (json.success) {
        const result = json.data
        toast[result.berhasil ? 'success' : 'error'](
          result.berhasil
            ? `Koneksi berhasil${result.latency_ms ? ` (${result.latency_ms}ms)` : ''}`
            : result.pesan ?? 'Koneksi gagal'
        )
        // Update health_status di list lokal
        setInstances(prev =>
          prev.map(i => i.id === instanceId
            ? { ...i, health_status: result.health_status, health_pesan: result.pesan }
            : i
          )
        )
      }
    } catch {
      toast.error('Gagal menjalankan test koneksi')
    } finally {
      setTestingId(null)
    }
  }, [])

  // ─── Buka dialog Tambah Instance ───────────────────────────────────────────

  const handleOpenTambahInstance = useCallback(() => {
    setFormInstance({ nama_server: '', deskripsi: '', is_default: false })
    setDialogMode('tambah-instance')
  }, [])

  // ─── Submit Tambah Instance ────────────────────────────────────────────────

  const handleSimpanInstance = useCallback(async () => {
    if (!selectedProvider || !formInstance.nama_server.trim()) return
    setSaving(true)
    try {
      const res  = await fetch('/api/superadmin/providers/instances', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          provider_id: selectedProvider.id,
          nama_server: formInstance.nama_server.trim(),
          deskripsi:   formInstance.deskripsi.trim() || null,
          is_default:  formInstance.is_default,
        }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Instance berhasil ditambahkan')
        setInstances(prev => [...prev, json.data])
        setDialogMode(null)
      } else {
        toast.error(json.message ?? 'Gagal menyimpan instance')
      }
    } catch {
      toast.error('Gagal menyimpan instance')
    } finally {
      setSaving(false)
    }
  }, [selectedProvider, formInstance])

  // ─── Buka dialog Isi Credential ────────────────────────────────────────────

  const handleOpenIsiCredential = useCallback(async (instanceId: string) => {
    if (!selectedProvider) return
    setActiveInstanceId(instanceId)
    setFormCred({})
    // Load field definitions untuk provider ini
    try {
      const res  = await fetch(`/api/superadmin/providers/${selectedProvider.id}/field-defs`)
      const json = await res.json()
      if (json.success) setFieldDefs(json.data)
    } catch {
      toast.error('Gagal memuat field definitions')
    }
    setDialogMode('isi-credential')
  }, [selectedProvider])

  // ─── Submit Isi Credential ─────────────────────────────────────────────────

  const handleSimpanCredential = useCallback(async () => {
    if (!activeInstanceId) return
    const fields = Object.entries(formCred)
      .filter(([, v]) => v.trim())
      .map(([field_def_id, nilai]) => ({ field_def_id, field_key: '', nilai }))

    if (fields.length === 0) {
      toast.error('Minimal satu field harus diisi')
      return
    }
    setSaving(true)
    try {
      const res  = await fetch(`/api/superadmin/providers/instances/${activeInstanceId}/credentials`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ fields }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Credential berhasil disimpan')
        setDialogMode(null)
      } else {
        toast.error(json.message ?? 'Gagal menyimpan credential')
      }
    } catch {
      toast.error('Gagal menyimpan credential')
    } finally {
      setSaving(false)
    }
  }, [activeInstanceId, formCred])

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 sm:p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── Panel Kiri — Daftar Provider ── */}
        <Card className="h-fit">
          <CardHeader className="pb-2">
            <CardTitle className={TYPOGRAPHY.cardTitle}>Daftar Provider</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul>
              {providers.map(p => (
                <li key={p.id}>
                  <button
                    onClick={() => handleSelectProvider(p)}
                    className={`w-full text-left px-4 py-3 border-b border-slate-100 flex items-center gap-3 transition-colors
                      ${selectedProvider?.id === p.id ? 'bg-accent' : 'hover:bg-slate-50'}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{p.nama}</p>
                      <p className={`${TYPOGRAPHY.caption} capitalize`}>{p.kategori}</p>
                    </div>
                    <HealthBadge status={p.health_overall} size="sm" />
                  </button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* ── Panel Kanan — Instances ── */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className={TYPOGRAPHY.cardTitle}>
              {selectedProvider ? `Instance — ${selectedProvider.nama}` : 'Pilih provider di kiri'}
            </CardTitle>
            {selectedProvider && (
              <Button size="sm" onClick={handleOpenTambahInstance}>
                <ICON_ACTION.add size={14} className="mr-1" />
                Tambah Instance
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {!selectedProvider && (
              <p className={`${TYPOGRAPHY.caption} text-center py-8`}>
                Pilih provider di sebelah kiri untuk melihat instances.
              </p>
            )}

            {selectedProvider && loadingInstances && (
              <div className="py-8 flex justify-center">
                <ICON_STATUS.loading size={20} className="animate-spin text-slate-400" />
              </div>
            )}

            {selectedProvider && !loadingInstances && instances.length === 0 && (
              <div className="py-8 text-center space-y-3">
                <p className={TYPOGRAPHY.caption}>Belum ada instance untuk provider ini.</p>
                <Button size="sm" variant="outline" onClick={handleOpenTambahInstance}>
                  Tambah Instance Pertama
                </Button>
              </div>
            )}

            {selectedProvider && !loadingInstances && instances.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className={`text-left py-2 px-3 ${TYPOGRAPHY.tableHead}`}>Nama</th>
                      <th className={`text-left py-2 px-3 ${TYPOGRAPHY.tableHead}`}>Status</th>
                      <th className={`text-left py-2 px-3 ${TYPOGRAPHY.tableHead}`}>Dites</th>
                      <th className={`text-right py-2 px-3 ${TYPOGRAPHY.tableHead}`}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {instances.map(inst => (
                      <tr key={inst.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="py-2.5 px-3">
                          <p className="font-medium text-slate-800 text-xs">{inst.nama_server}</p>
                          {inst.is_default && (
                            <span className="text-[10px] text-blue-600 font-medium">Default</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <HealthBadge status={inst.health_status} size="sm" />
                        </td>
                        <td className={`py-2.5 px-3 ${TYPOGRAPHY.caption}`}>
                          {inst.last_tested_at
                            ? new Date(inst.last_tested_at).toLocaleDateString('id-ID')
                            : '—'
                          }
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleTestKoneksi(inst.id)}
                              disabled={testingId === inst.id}
                              className="text-xs h-7 px-2"
                            >
                              {testingId === inst.id
                                ? <ICON_STATUS.loading size={12} className="animate-spin" />
                                : <ICON_ACTION.refresh size={12} />
                              }
                              <span className="ml-1">Test</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenIsiCredential(inst.id)}
                              className="text-xs h-7 px-2"
                            >
                              <ICON_ACTION.edit size={12} />
                              <span className="ml-1">Credential</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Dialog Tambah Instance ── */}
      <Dialog open={dialogMode === 'tambah-instance'} onOpenChange={o => !o && setDialogMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Instance — {selectedProvider?.nama}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="nama_server">Nama Instance *</Label>
              <Input
                id="nama_server"
                placeholder="Contoh: Xendit Production"
                value={formInstance.nama_server}
                onChange={e => setFormInstance(p => ({ ...p, nama_server: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="deskripsi">Keterangan</Label>
              <Textarea
                id="deskripsi"
                placeholder="Opsional"
                value={formInstance.deskripsi}
                onChange={e => setFormInstance(p => ({ ...p, deskripsi: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="is_default"
                checked={formInstance.is_default}
                onCheckedChange={v => setFormInstance(p => ({ ...p, is_default: v }))}
              />
              <Label htmlFor="is_default">Jadikan instance default</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMode(null)}>Batal</Button>
            <Button onClick={handleSimpanInstance} disabled={saving || !formInstance.nama_server.trim()}>
              {saving ? <ICON_STATUS.loading size={14} className="animate-spin mr-1" /> : null}
              Buat Instance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Isi Credential ── */}
      <Dialog open={dialogMode === 'isi-credential'} onOpenChange={o => !o && setDialogMode(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Isi Credential</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto">
            <p className="text-xs text-slate-500">
              Nilai credential tidak ditampilkan setelah disimpan. Hanya 4 karakter terakhir yang terlihat.
            </p>
            {fieldDefs.map(f => (
              <div key={f.id} className="space-y-1.5">
                <Label htmlFor={f.id}>
                  {f.label}{f.is_required && <span className="text-red-500 ml-0.5">*</span>}
                </Label>
                <Input
                  id={f.id}
                  type={f.is_secret ? 'password' : 'text'}
                  placeholder={f.placeholder ?? ''}
                  value={formCred[f.id] ?? ''}
                  onChange={e => setFormCred(p => ({ ...p, [f.id]: e.target.value }))}
                  autoComplete="off"
                />
                {f.deskripsi && (
                  <p className={TYPOGRAPHY.caption}>{f.deskripsi}</p>
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMode(null)}>Batal</Button>
            <Button onClick={handleSimpanCredential} disabled={saving}>
              {saving ? <ICON_STATUS.loading size={14} className="animate-spin mr-1" /> : null}
              Simpan Credential
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
