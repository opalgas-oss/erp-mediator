'use client'

// app/dashboard/superadmin/team-contacts/TeamContactsClient.tsx
// Client component page Kontak Tim SA — tabel + dialog tambah/ubah + geser prioritas.
// Dibuat: Sesi #423 — Direktori Kontak Tim Tahap A, FASE 3.6d
//
// Mengikuti mockup v2 yang DISETUJUI Philips S#419 + STANDAR_UI_UX (S1 font/spacing,
// S2 warna, S4 komponen, S5 perilaku). Ikon memakai Tabler webfont `<i className="ti ti-*" />`
// persis seperti mockup — CSS-nya sudah dimuat global di root layout.
//
// KEPUTUSAN TEKNIS S#423 (disebut terbuka, bukan diselundupkan):
//  1. JALAN A (K-423-4, disetujui Philips): dirakit dari primitif `components/ui/*`.
//     Alasan: `DataTable`/`EmptyState`/`PageHeader`/`SearchToolbar`/`StatusBadge` yang
//     tertulis di daftar "7 aset wajib dipakai ulang" TERBUKTI TIDAK ADA di repo
//     (diverifikasi 3 cara: listing folder, glob seluruh `components/`, listing root).
//  2. `Checkbox` shadcn juga TIDAK ADA di `components/ui/` — dipakai `<input type="checkbox">`
//     native ber-`accent-color`, sama dengan mockup.
//  3. TABEL INI TIDAK SORTABLE PER-KOLOM. Urutannya ADALAH urutan prioritas, dan tombol
//     panah bekerja atas dasar posisi baris. Menyalakan sort kolom membuat "naik/turun"
//     kehilangan makna. `useSortableTable` sengaja TIDAK dipakai di sini — bukan lupa.
//  4. Nol pagination: mockup menyatakan pagination baru muncul di >20 baris; daftar kontak
//     tim SA tidak akan sepanjang itu. Kalau nanti melewati 20, ini yang ditambahkan.

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast }     from 'sonner'
import { Button }    from '@/components/ui/button'
import { Input }     from '@/components/ui/input'
import { Label }     from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import type { KontakTimBaris, JabatanKontak } from '@/lib/types/team-contact.types'

// ─── Konstanta tampilan ───────────────────────────────────────────────────────

const JABATAN_OPSI: { nilai: JabatanKontak; label: string }[] = [
  { nilai: 'penanggung_jawab', label: 'Penanggung Jawab' },
  { nilai: 'operator',         label: 'Operator'         },
  { nilai: 'finance',          label: 'Finance'          },
  { nilai: 'warehouse',        label: 'Warehouse'        },
  { nilai: 'sales',            label: 'Sales'            },
  { nilai: 'lainnya',          label: 'Lainnya'          },
]

function labelJabatan(j: JabatanKontak): string {
  return JABATAN_OPSI.find((o) => o.nilai === j)?.label ?? j
}

// Warna badge — nilai semantik STANDAR_UI_UX S2. Ditulis sebagai style inline karena
// shadcn Badge tidak punya variant ini (S2 Bab 8).
const BADGE = {
  success:  { background: '#EAF3DE', color: '#3B6D11', border: '0.5px solid #97C459' },
  info:     { background: '#E6F1FB', color: '#185FA5', border: '0.5px solid #85B7EB' },
  neutral:  { background: '#F1EFE8', color: '#5F5E5A', border: '0.5px solid #B4B2A9' },
  internal: { background: '#EEEDFE', color: '#534AB7', border: '0.5px solid #AFA9EC' },
  off:      { background: '#ffffff', color: '#9ca3af', border: '0.5px dashed rgba(0,0,0,0.12)' },
} as const

function Badge({
  gaya, ikon, children,
}: {
  gaya: keyof typeof BADGE
  ikon?: string
  children: React.ReactNode
}) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap"
      style={BADGE[gaya]}
    >
      {ikon && <i className={`ti ${ikon} text-[13px] leading-none`} aria-hidden="true" />}
      {children}
    </span>
  )
}

// ─── Bentuk form dialog ───────────────────────────────────────────────────────

interface FormKontak {
  id:                    string | null   // null = mode tambah
  nama:                  string
  telepon:               string
  email:                 string
  jabatan:               JabatanKontak | ''
  publish_bug_dashboard: boolean
  publish_public_page:   boolean
}

const FORM_KOSONG: FormKontak = {
  id: null, nama: '', telepon: '', email: '', jabatan: '',
  publish_bug_dashboard: false, publish_public_page: false,
}

// ─── Komponen utama ───────────────────────────────────────────────────────────

export function TeamContactsClient({ initialData }: { initialData: KontakTimBaris[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [cari, setCari]         = useState('')
  const [fJabatan, setFJabatan] = useState<string>('semua')
  const [fStatus, setFStatus]   = useState<string>('semua')

  const [dialogBuka, setDialogBuka] = useState(false)
  const [form, setForm]             = useState<FormKontak>(FORM_KOSONG)
  const [menyimpan, setMenyimpan]   = useState(false)

  const [hapusTarget, setHapusTarget] = useState<KontakTimBaris | null>(null)

  const total       = initialData.length
  const jumlahAktif = initialData.filter((k) => k.isActive).length
  // §6.3 — sistem hanya punya alamat tujuan kalau ada baris AKTIF yang dicentang.
  const adaPublikasi = initialData.some(
    (k) => k.isActive && (k.publishBugDashboard || k.publishPublicPage)
  )

  const terfilter = useMemo(() => {
    const q = cari.trim().toLowerCase()
    return initialData.filter((k) => {
      if (q && !k.nama.toLowerCase().includes(q) && !k.email.toLowerCase().includes(q)) return false
      if (fJabatan !== 'semua' && k.jabatan !== fJabatan) return false
      if (fStatus === 'aktif'    && !k.isActive) return false
      if (fStatus === 'nonaktif' &&  k.isActive) return false
      return true
    })
  }, [initialData, cari, fJabatan, fStatus])

  // ─── Aksi ───────────────────────────────────────────────────────────────────

  function segarkan() {
    startTransition(() => router.refresh())
  }

  async function kirim(url: string, method: string, body?: unknown): Promise<boolean> {
    try {
      const res  = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body:    body ? JSON.stringify(body) : undefined,
      })
      const json = await res.json() as { success: boolean; message?: string }
      if (!json.success) throw new Error(json.message ?? 'Permintaan gagal')
      return true
    } catch (err) {
      // Nol catch kosong (BUG-034 · BUG-038) — galat selalu terlihat SA dan di console.
      console.error('[TeamContactsClient]', method, url, err)
      toast.error(err instanceof Error ? err.message : 'Terjadi kesalahan')
      return false
    }
  }

  function bukaTambah() { setForm(FORM_KOSONG); setDialogBuka(true) }

  function bukaUbah(k: KontakTimBaris) {
    setForm({
      id: k.id, nama: k.nama, telepon: k.telepon ?? '', email: k.email,
      jabatan: k.jabatan,
      publish_bug_dashboard: k.publishBugDashboard,
      publish_public_page:   k.publishPublicPage,
    })
    setDialogBuka(true)
  }

  async function simpan() {
    if (!form.nama.trim())  { toast.error('Nama wajib diisi');    return }
    if (!form.email.trim()) { toast.error('Email wajib diisi');   return }
    if (!form.jabatan)      { toast.error('Jabatan wajib dipilih'); return }

    setMenyimpan(true)
    const isi = {
      nama:                  form.nama.trim(),
      email:                 form.email.trim(),
      telepon:               form.telepon.trim() || null,
      jabatan:               form.jabatan,
      publish_bug_dashboard: form.publish_bug_dashboard,
      publish_public_page:   form.publish_public_page,
    }
    const ok = form.id
      ? await kirim(`/api/superadmin/team-contacts/${form.id}`, 'PATCH', { aksi: 'ubah', ...isi })
      : await kirim('/api/superadmin/team-contacts', 'POST', isi)
    setMenyimpan(false)

    if (ok) {
      toast.success(form.id ? 'Kontak berhasil diperbarui' : 'Kontak berhasil ditambahkan')
      setDialogBuka(false)
      segarkan()
    }
  }

  async function geser(k: KontakTimBaris, arah: 'naik' | 'turun') {
    const ok = await kirim(`/api/superadmin/team-contacts/${k.id}`, 'PATCH', { aksi: 'geser', arah })
    if (ok) segarkan()
  }

  async function toggleAktif(k: KontakTimBaris) {
    const ok = await kirim(`/api/superadmin/team-contacts/${k.id}`, 'PATCH', {
      aksi: 'ubah', is_active: !k.isActive,
    })
    if (ok) {
      toast.success(k.isActive ? 'Kontak dinonaktifkan' : 'Kontak diaktifkan kembali')
      segarkan()
    }
  }

  async function hapus() {
    if (!hapusTarget) return
    const ok = await kirim(`/api/superadmin/team-contacts/${hapusTarget.id}`, 'DELETE')
    setHapusTarget(null)
    if (ok) { toast.success('Kontak berhasil dihapus'); segarkan() }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6">

      {/* Body header — judul halaman TIDAK dirender di sini (DashboardHeader yang punya) */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <span className="text-[13px] text-[#6b7280]">
          {total === 0 ? '0 kontak' : `${total} kontak — ${jumlahAktif} aktif`}
        </span>
        <Button onClick={bukaTambah} className="text-[13px] h-9 bg-[#185FA5] hover:bg-[#134d86] text-white">
          <i className="ti ti-plus text-[15px] mr-1.5" aria-hidden="true" />
          Tambah Kontak
        </Button>
      </div>

      {/* Banner §6.3 — dua keadaan berbeda, teks mengikuti mockup v2 */}
      {total === 0 && (
        <BannerPeringatan>
          Belum ada kontak tim yang terdaftar. Selama daftar ini kosong, ajakan{' '}
          <strong>&ldquo;hubungi tim kami&rdquo;</strong> tidak ditampilkan di halaman maintenance
          publik maupun di halaman error dashboard — sesuai aturan §6.3: tidak ada ajakan
          menghubungi tanpa alamat di baliknya.
        </BannerPeringatan>
      )}
      {total > 0 && !adaPublikasi && (
        <BannerPeringatan>
          Daftar kontak sudah terisi, tetapi <strong>belum ada satu pun yang aktif dan dicentang
          untuk dipublikasikan</strong>. Akibatnya sistem tetap tidak punya alamat tujuan — ajakan
          &ldquo;hubungi tim kami&rdquo; tetap tidak ditampilkan. Centang minimal satu kontak lewat
          tombol Ubah.
        </BannerPeringatan>
      )}

      {total === 0 ? (
        <div className="rounded-xl border-[0.5px] border-dashed border-black/20 px-5 py-11 text-center">
          <i className="ti ti-address-book text-[34px] text-[#d1d5db]" aria-hidden="true" />
          <h2 className="mt-3 text-[14px] font-semibold text-[#1a1a1a]">Belum ada kontak tim</h2>
          <p className="mt-1.5 text-[13px] text-[#6b7280] max-w-md mx-auto">
            Tambahkan minimal satu kontak agar pengunjung dan pengguna dashboard tahu harus
            menghubungi siapa saat platform sedang diperbaiki atau ada halaman yang rusak.
          </p>
          <Button onClick={bukaTambah} className="mt-4 text-[13px] h-9 bg-[#185FA5] hover:bg-[#134d86] text-white">
            <i className="ti ti-plus text-[15px] mr-1.5" aria-hidden="true" />
            Tambah Kontak
          </Button>
        </div>
      ) : (
        <>
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <div className="relative max-w-[320px] w-full">
              <i className="ti ti-search absolute left-2.5 top-1/2 -translate-y-1/2 text-[14px] text-[#9ca3af]" aria-hidden="true" />
              <Input
                value={cari}
                onChange={(e) => setCari(e.target.value)}
                placeholder="Cari nama atau email..."
                className="h-9 pl-8 text-[13px]"
              />
            </div>
            <Select value={fJabatan} onValueChange={setFJabatan}>
              <SelectTrigger className="h-9 w-auto min-w-[150px] text-[13px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="semua" className="text-[13px]">Semua jabatan</SelectItem>
                {JABATAN_OPSI.map((o) => (
                  <SelectItem key={o.nilai} value={o.nilai} className="text-[13px]">{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={fStatus} onValueChange={setFStatus}>
              <SelectTrigger className="h-9 w-auto min-w-[130px] text-[13px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="semua"    className="text-[13px]">Semua status</SelectItem>
                <SelectItem value="aktif"    className="text-[13px]">Aktif</SelectItem>
                <SelectItem value="nonaktif" className="text-[13px]">Nonaktif</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tabel — 7 kolom, wajib dibungkus overflow-x (S5) */}
          <div className="rounded-xl border-[0.5px] border-black/[0.12] overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#f9f9f8]">
                    <TableHead className="text-[12px] font-medium text-[#6b7280] whitespace-nowrap min-w-[210px]">Nama &amp; Email</TableHead>
                    <TableHead className="text-[12px] font-medium text-[#6b7280] whitespace-nowrap min-w-[130px]">Telepon</TableHead>
                    <TableHead className="text-[12px] font-medium text-[#6b7280] whitespace-nowrap min-w-[140px]">Jabatan</TableHead>
                    <TableHead className="text-[12px] font-medium text-[#6b7280] whitespace-nowrap min-w-[170px]">Publikasi</TableHead>
                    <TableHead className="text-[12px] font-medium text-[#6b7280] whitespace-nowrap min-w-[104px]">Prioritas</TableHead>
                    <TableHead className="text-[12px] font-medium text-[#6b7280] whitespace-nowrap min-w-[90px]">Status</TableHead>
                    <TableHead className="text-[12px] font-medium text-[#6b7280] whitespace-nowrap min-w-[96px] text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {terfilter.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-[13px] text-[#6b7280]">
                        Tidak ada data yang sesuai filter.
                      </TableCell>
                    </TableRow>
                  ) : terfilter.map((k) => (
                    <TableRow key={k.id} className={k.isActive ? '' : 'opacity-[0.55]'}>
                      <TableCell>
                        <div className="text-[13px] font-medium text-[#1a1a1a]">{k.nama}</div>
                        <div className="text-[11px] text-[#6b7280]">{k.email}</div>
                      </TableCell>
                      <TableCell className="text-[12px] text-[#6b7280] whitespace-nowrap">
                        {k.telepon || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge gaya={k.jabatan === 'penanggung_jawab' ? 'internal' : 'neutral'}>
                          {labelJabatan(k.jabatan)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col items-start gap-1">
                          <Badge gaya={k.publishBugDashboard ? 'info' : 'off'} ikon={k.publishBugDashboard ? 'ti-bug' : 'ti-bug-off'}>
                            Bug Dashboard
                          </Badge>
                          <Badge gaya={k.publishPublicPage ? 'success' : 'off'} ikon={k.publishPublicPage ? 'ti-world' : 'ti-world-off'}>
                            Halaman Publik
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-md border-[0.5px] border-black/[0.12] bg-[#f9f9f8] text-[12px] text-[#6b7280] tabular-nums">
                            {k.prioritas}
                          </span>
                          <span className="flex flex-col gap-[2px]">
                            <button
                              type="button"
                              title="Naikkan prioritas"
                              aria-label={`Naikkan prioritas ${k.nama}`}
                              disabled={k.isPertama || pending}
                              onClick={() => geser(k, 'naik')}
                              className="h-4 w-[22px] rounded border-[0.5px] border-black/[0.12] leading-none disabled:opacity-35 disabled:cursor-not-allowed hover:bg-[#f1efe8]"
                            >
                              <i className="ti ti-chevron-up text-[12px]" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              title="Turunkan prioritas"
                              aria-label={`Turunkan prioritas ${k.nama}`}
                              disabled={k.isTerakhir || pending}
                              onClick={() => geser(k, 'turun')}
                              className="h-4 w-[22px] rounded border-[0.5px] border-black/[0.12] leading-none disabled:opacity-35 disabled:cursor-not-allowed hover:bg-[#f1efe8]"
                            >
                              <i className="ti ti-chevron-down text-[12px]" aria-hidden="true" />
                            </button>
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge gaya={k.isActive ? 'success' : 'neutral'}>
                          {k.isActive ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1.5">
                          <button type="button" title="Ubah" aria-label={`Ubah ${k.nama}`}
                            onClick={() => bukaUbah(k)}
                            className="rounded-lg border-[0.5px] border-black/[0.12] px-[7px] py-[5px] hover:bg-[#f9f9f8]">
                            <i className="ti ti-pencil text-[14px]" aria-hidden="true" />
                          </button>
                          <button type="button"
                            title={k.isActive ? 'Nonaktifkan' : 'Aktifkan kembali'}
                            aria-label={`${k.isActive ? 'Nonaktifkan' : 'Aktifkan'} ${k.nama}`}
                            onClick={() => toggleAktif(k)}
                            className="rounded-lg border-[0.5px] border-black/[0.12] px-[7px] py-[5px] hover:bg-[#f9f9f8]">
                            <i className={`ti ${k.isActive ? 'ti-player-pause' : 'ti-player-play'} text-[14px]`} aria-hidden="true" />
                          </button>
                          <button type="button" title="Hapus" aria-label={`Hapus ${k.nama}`}
                            onClick={() => setHapusTarget(k)}
                            className="rounded-lg border-[0.5px] px-[7px] py-[5px]"
                            style={{ borderColor: '#F09595', color: '#A32D2D' }}>
                            <i className="ti ti-trash text-[14px]" aria-hidden="true" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <p className="mt-2.5 text-[11px] text-[#6b7280]">
            Bila lebih dari satu kontak dicentang untuk tujuan yang sama, yang dipakai sistem adalah{' '}
            <strong>prioritas 1</strong> yang statusnya Aktif (§6.3). Geser dengan tombol panah —
            tidak ada angka yang perlu diketik atau diingat.
          </p>
        </>
      )}

      {/* ─── Dialog tambah / ubah ─────────────────────────────────────────── */}
      <Dialog open={dialogBuka} onOpenChange={setDialogBuka}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[16px] font-semibold">
              {form.id ? 'Ubah Kontak' : 'Tambah Kontak'}
            </DialogTitle>
            <DialogDescription className="text-[12px] text-[#6b7280]">
              Kontak tidak wajib punya akun login. Kontak baru otomatis masuk urutan paling bawah.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-[65vh] overflow-y-auto py-1">
            <div className="sm:col-span-2">
              <Label className="text-[12px] font-medium text-[#374151]">
                Nama <span style={{ color: '#A32D2D' }}>*</span>
              </Label>
              <Input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })}
                placeholder="Contoh: Tim Bantuan Mediator" className="h-9 mt-1 text-[13px]" />
            </div>

            <div>
              <Label className="text-[12px] font-medium text-[#374151]">Telepon</Label>
              <Input value={form.telepon} onChange={(e) => setForm({ ...form, telepon: e.target.value })}
                placeholder="Contoh: 0811-8001-234" className="h-9 mt-1 text-[13px]" />
              <p className="mt-1 text-[11px] text-[#6b7280]">Boleh dikosongkan.</p>
            </div>

            <div>
              <Label className="text-[12px] font-medium text-[#374151]">
                Email <span style={{ color: '#A32D2D' }}>*</span>
              </Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="Contoh: bantuan@mediator.id" className="h-9 mt-1 text-[13px]" />
            </div>

            <div className="sm:col-span-2">
              <Label className="text-[12px] font-medium text-[#374151]">
                Jabatan <span style={{ color: '#A32D2D' }}>*</span>
              </Label>
              <Select value={form.jabatan} onValueChange={(v) => setForm({ ...form, jabatan: v as JabatanKontak })}>
                <SelectTrigger className="h-9 mt-1 text-[13px]">
                  <SelectValue placeholder="Pilih jabatan..." />
                </SelectTrigger>
                <SelectContent>
                  {JABATAN_OPSI.map((o) => (
                    <SelectItem key={o.nilai} value={o.nilai} className="text-[13px]">{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-[11px] text-[#6b7280]">
                Enam jabatan resmi GLOSSARY BAB 7 — tidak bisa ditambah dari sini.
              </p>
            </div>

            <fieldset className="sm:col-span-2 rounded-lg border-[0.5px] border-black/[0.12] p-3.5 mt-1">
              <legend className="px-1 text-[12px] font-medium text-[#374151]">Publikasi kontak ini</legend>
              <p className="text-[11px] text-[#6b7280] mb-2">
                Satu kontak boleh dicentang untuk keduanya sekaligus. Tanpa centang, kontak
                tersimpan tapi tidak pernah dipakai sistem.
              </p>

              <label className="flex gap-2.5 rounded-md border-[0.5px] border-black/[0.12] p-2.5 cursor-pointer hover:bg-[#f9f9f8]">
                <input type="checkbox" className="mt-0.5 h-[15px] w-[15px] shrink-0"
                  style={{ accentColor: '#185FA5' }}
                  checked={form.publish_bug_dashboard}
                  onChange={(e) => setForm({ ...form, publish_bug_dashboard: e.target.checked })} />
                <span>
                  <span className="block text-[13px] text-[#1a1a1a]">
                    <i className="ti ti-bug mr-1 text-[13px]" style={{ color: '#185FA5' }} aria-hidden="true" />
                    Tampil saat ada Bug Code di Dashboard
                  </span>
                  <span className="block text-[11px] text-[#6b7280] mt-0.5">
                    Dipakai halaman error di Dashboard SuperAdmin dan AdminTenant. Boleh email
                    pribadi anggota tim.
                  </span>
                </span>
              </label>

              <label className="mt-2 flex gap-2.5 rounded-md border-[0.5px] border-black/[0.12] p-2.5 cursor-pointer hover:bg-[#f9f9f8]">
                <input type="checkbox" className="mt-0.5 h-[15px] w-[15px] shrink-0"
                  style={{ accentColor: '#185FA5' }}
                  checked={form.publish_public_page}
                  onChange={(e) => setForm({ ...form, publish_public_page: e.target.checked })} />
                <span>
                  <span className="block text-[13px] text-[#1a1a1a]">
                    <i className="ti ti-world mr-1 text-[13px]" style={{ color: '#3B6D11' }} aria-hidden="true" />
                    Tampil di halaman publik website
                  </span>
                  <span className="block text-[11px] text-[#6b7280] mt-0.5">
                    Dipakai halaman maintenance yang bisa dibuka siapa saja. Gunakan{' '}
                    <strong>alamat umum tim</strong>, bukan email pribadi — halaman publik dipanen
                    robot spam.
                  </span>
                </span>
              </label>
            </fieldset>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" className="text-[13px] h-9" onClick={() => setDialogBuka(false)} disabled={menyimpan}>
              Batal
            </Button>
            <Button className="text-[13px] h-9 bg-[#1a1a1a] hover:bg-black text-white" onClick={simpan} disabled={menyimpan}>
              {menyimpan ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog konfirmasi hapus ──────────────────────────────────────── */}
      <Dialog open={hapusTarget !== null} onOpenChange={(o) => !o && setHapusTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[16px] font-semibold">Hapus kontak ini?</DialogTitle>
            <DialogDescription className="text-[12px] text-[#6b7280]">
              {hapusTarget?.nama} ({hapusTarget?.email}) tidak akan lagi dipakai sebagai tujuan
              tautan &ldquo;hubungi tim kami&rdquo;. Data lamanya tetap tersimpan untuk audit.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="text-[13px] h-9" onClick={() => setHapusTarget(null)}>Batal</Button>
            <Button variant="destructive" className="text-[13px] h-9" onClick={hapus}>Ya, Hapus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Banner peringatan (kuning) ───────────────────────────────────────────────

function BannerPeringatan({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mb-4 flex gap-2.5 rounded-lg px-3.5 py-3 text-[12px] leading-relaxed"
      style={{ background: '#FAEEDA', color: '#854F0B', border: '0.5px solid #EF9F27' }}
    >
      <i className="ti ti-alert-triangle text-[15px] shrink-0 mt-0.5" aria-hidden="true" />
      <span>{children}</span>
    </div>
  )
}
