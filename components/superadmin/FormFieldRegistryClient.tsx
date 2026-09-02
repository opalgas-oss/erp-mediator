'use client'

// components/superadmin/FormFieldRegistryClient.tsx
// Panel KOLOM pada halaman konfigurasi formulir SuperAdmin.
// Satu baris = satu kolom formulir, dengan empat saklar: Tampil · Wajib · Verifikasi · Aktif.
//
// Dibuat: Sesi #483 — K-483-4 (Philips). Verbatim: "kamu tampilkan dulu juga tidak masalah,
//   suatu saat tidak diperlukan cukup disable/tidak di tampilkan, ini semua harus bisa di
//   maintaince oleh SA, lewat dashboard".
//
// 🔴 DASAR HUKUM MEMBERI TAHU, TIDAK MENOLAK.
//   Saat SA mematikan kolom yang punya `dasar_hukum`, peringatan muncul berisi dasar itu —
//   dan tombol Simpan TETAP bisa ditekan. Mengunci saklar berarti memindahkan keputusan
//   kebijakan ke dalam kode, dan itu persis yang K-483-4 larang.

import { useMemo, useState } from 'react'
import { toast }             from 'sonner'
import { Button }            from '@/components/ui/button'
import { Badge }             from '@/components/ui/badge'
import { Switch }            from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TYPOGRAPHY }        from '@/lib/constants/ui-tokens.constant'
import { ICON_STATUS }       from '@/lib/constants/icons.constant'
import type { FormFieldRow } from '@/lib/types/form-field-registry.types'

export interface FormFieldGroupData {
  group_key: string
  fields:    FormFieldRow[]
}

/** Keempat saklar yang boleh digeser SA. Nama sengaja sama dengan nama kolom DB. */
type SaklarKey = 'is_visible' | 'is_required' | 'butuh_verifikasi_admin' | 'is_active'

const SAKLAR: { key: SaklarKey; judul: string; keterangan: string }[] = [
  { key: 'is_visible',             judul: 'Tampil',     keterangan: 'Kolom muncul di formulir pendaftaran' },
  { key: 'is_required',            judul: 'Wajib',      keterangan: 'Pendaftar tidak bisa lanjut tanpa mengisinya' },
  { key: 'butuh_verifikasi_admin', judul: 'Verifikasi', keterangan: 'Diperiksa manusia; bukan sekadar pernyataan pendaftar' },
  { key: 'is_active',              judul: 'Aktif',      keterangan: 'Kolom dipakai sama sekali — dimatikan berarti berhenti divalidasi' },
]

export function FormFieldRegistryClient({
  formKey,
  initialData,
}: {
  formKey:     string
  initialData: FormFieldGroupData[]
}) {
  const [groups, setGroups]   = useState<FormFieldGroupData[]>(initialData)
  const [asli]                = useState<FormFieldGroupData[]>(
    () => JSON.parse(JSON.stringify(initialData)) as FormFieldGroupData[]
  )
  const [saving, setSaving]   = useState(false)

  const LoadingIcon = ICON_STATUS.loading

  // Peta baris asli, supaya perbandingan tidak bergantung posisi indeks.
  const petaAsli = useMemo(() => {
    const peta = new Map<string, FormFieldRow>()
    for (const g of asli) for (const f of g.fields) peta.set(f.id, f)
    return peta
  }, [asli])

  const semuaField = useMemo(() => groups.flatMap(g => g.fields), [groups])

  /** Baris yang berubah, beserta saklar mana saja yang berubah. */
  const perubahan = useMemo(() => {
    const hasil: { field: FormFieldRow; saklar: SaklarKey[] }[] = []
    for (const field of semuaField) {
      const awal = petaAsli.get(field.id)
      if (!awal) continue
      const berubah = SAKLAR.map(s => s.key).filter(k => field[k] !== awal[k])
      if (berubah.length > 0) hasil.push({ field, saklar: berubah })
    }
    return hasil
  }, [semuaField, petaAsli])

  /**
   * Kolom ber-dasar-hukum yang sedang DIMATIKAN (Tampil/Wajib/Verifikasi/Aktif dari true ke false).
   * Inilah yang memunculkan peringatan — bukan setiap perubahan.
   */
  const peringatan = useMemo(() => {
    return perubahan
      .filter(({ field, saklar }) =>
        field.dasar_hukum && saklar.some(k => field[k] === false)
      )
      .map(({ field }) => field)
  }, [perubahan])

  const adaPerubahan = perubahan.length > 0

  const geser = (fieldId: string, key: SaklarKey, nilai: boolean): void => {
    setGroups(prev =>
      prev.map(g => ({
        ...g,
        fields: g.fields.map(f => (f.id === fieldId ? { ...f, [key]: nilai } : f)),
      }))
    )
  }

  const simpan = async (): Promise<void> => {
    if (!adaPerubahan || saving) return
    setSaving(true)
    try {
      const body = {
        perubahan: perubahan.map(({ field, saklar }) => {
          const patch: Record<string, unknown> = { id: field.id }
          for (const k of saklar) patch[k] = field[k]
          return patch
        }),
      }
      const res  = await fetch(`/api/form-fields/${formKey}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.message ?? 'Gagal menyimpan')

      toast.success(`${json.jumlah} kolom disimpan`)
      // Muat ulang dari server supaya layar memakai keadaan yang benar-benar tersimpan,
      // bukan tebakan optimistis di sisi klien.
      window.location.reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan')
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">

      {peringatan.length > 0 && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium text-amber-900">
            {peringatan.length} kolom yang Anda matikan punya dasar hukum. Perubahan tetap bisa disimpan.
          </p>
          <ul className="mt-2 space-y-1">
            {peringatan.map(f => (
              <li key={f.id} className="text-xs text-amber-800 leading-relaxed">
                <span className="font-medium">{f.label}</span> — {f.dasar_hukum}
                {f.catatan_risiko ? <span className="block text-amber-700">{f.catatan_risiko}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      {groups.map(group => (
        <Card key={group.group_key} className="bg-white/80 backdrop-blur-sm border-slate-200 shadow-sm">
          <CardHeader className="pt-2 pb-1 px-4 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <CardTitle className={TYPOGRAPHY.cardTitle}>{group.group_key}</CardTitle>
              <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-xs border-0">
                {group.fields.length} kolom
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-1 pb-2 px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[220px]">Kolom</TableHead>
                  <TableHead className="w-[110px]">Tipe</TableHead>
                  {SAKLAR.map(s => (
                    <TableHead key={s.key} className="w-[96px] text-center" title={s.keterangan}>
                      {s.judul}
                    </TableHead>
                  ))}
                  <TableHead className="min-w-[220px]">Dasar hukum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {group.fields.map(field => (
                  <TableRow key={field.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm text-slate-800">{field.label}</span>
                        <span className="text-xs text-slate-400 font-mono">{field.field_key}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">{field.tipe_input}</TableCell>
                    {SAKLAR.map(s => (
                      <TableCell key={s.key} className="text-center">
                        <Switch
                          checked={field[s.key]}
                          onCheckedChange={v => geser(field.id, s.key, v)}
                          aria-label={`${s.judul} — ${field.label}`}
                        />
                      </TableCell>
                    ))}
                    <TableCell className="text-xs text-slate-500 leading-relaxed">
                      {field.dasar_hukum || <span className="text-slate-300">—</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}

      <div className="flex items-center justify-end gap-3 px-1">
        {adaPerubahan && (
          <span className="text-xs text-slate-500">{perubahan.length} kolom berubah</span>
        )}
        <Button onClick={simpan} disabled={!adaPerubahan || saving}>
          {saving ? <LoadingIcon className="w-4 h-4 mr-2 animate-spin" /> : null}
          Simpan Kolom
        </Button>
      </div>
    </div>
  )
}
