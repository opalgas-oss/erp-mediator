'use client'

// app/dashboard/superadmin/messages/MessageLibraryClient.tsx
// Komponen client Message Library — tabel + search + filter + dialog edit/tambah.
// Data di-load sekali dari server, semua filter dikerjakan client-side.
//
// Dibuat: Sesi #098 — PL-S08 M2 Message Library
//
// PERUBAHAN Sesi #100 — Sentralisasi UI:
//   - Hapus Page Header inline (<h1>Message Library</h1>) — judul tampil di DashboardHeader
//   - Hapus fungsi kategoriColor() inline → pakai resolveKategoriColor dari ui-tokens.constant
//   - Pakai TYPOGRAPHY.tableHead + TYPOGRAPHY.tableCell dari ui-tokens.constant
//   - Scroll dihandle DashboardShell — tidak ada overflow di sini

import type { JSX }    from 'react'
import { useState, useMemo, useTransition } from 'react'
import { toast }       from 'sonner'
import type { MessageItem } from '@/lib/message-library'
import { resolveKategoriColor } from '@/lib/constants/ui-tokens.constant'
import { TYPOGRAPHY }           from '@/lib/constants/ui-tokens.constant'

import { Input }       from '@/components/ui/input'
import { Button }      from '@/components/ui/button'
import { Badge }       from '@/components/ui/badge'
import { Textarea }    from '@/components/ui/textarea'
import { Label }       from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// ─── Tipe ────────────────────────────────────────────────────────────────────

interface Props {
  initialData:  MessageItem[]
  kategoriList: string[]
}

interface EditState {
  open:       boolean
  item:       MessageItem | null
  teks:       string
  keterangan: string
  saving:     boolean
  error:      string
}

interface AddState {
  open:       boolean
  key:        string
  kategori:   string
  channel:    string
  teks:       string
  keterangan: string
  saving:     boolean
  error:      string
}

const EMPTY_EDIT: EditState = { open: false, item: null, teks: '', keterangan: '', saving: false, error: '' }
const EMPTY_ADD: AddState   = { open: false, key: '', kategori: '', channel: 'ui', teks: '', keterangan: '', saving: false, error: '' }

const CHANNEL_OPTIONS = ['ui', 'wa', 'email', 'sms'] as const

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

// ─── Komponen utama ───────────────────────────────────────────────────────────

export function MessageLibraryClient({ initialData, kategoriList }: Props): JSX.Element {
  const [messages, setMessages] = useState<MessageItem[]>(initialData)
  const [search,   setSearch]   = useState('')
  const [katFilter, setKatFilter] = useState('semua')
  const [edit, setEdit] = useState<EditState>(EMPTY_EDIT)
  const [add,  setAdd]  = useState<AddState>(EMPTY_ADD)
  const [, startTransition] = useTransition()

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return messages.filter(m => {
      const matchKat    = katFilter === 'semua' || m.kategori === katFilter
      const matchSearch = !q || m.key.toLowerCase().includes(q) || m.teks.toLowerCase().includes(q)
      return matchKat && matchSearch
    })
  }, [messages, search, katFilter])

  function openEdit(item: MessageItem) {
    setEdit({ open: true, item, teks: item.teks, keterangan: item.keterangan ?? '', saving: false, error: '' })
  }

  async function handleSaveEdit() {
    if (!edit.item) return
    if (!edit.teks.trim()) {
      setEdit(e => ({ ...e, error: 'Teks pesan tidak boleh kosong' }))
      return
    }
    setEdit(e => ({ ...e, saving: true, error: '' }))
    try {
      const res  = await fetch(`/api/superadmin/messages/${edit.item.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ teks: edit.teks, keterangan: edit.keterangan }),
      })
      const json = await res.json() as { success: boolean; message?: string; data?: MessageItem }
      if (!json.success) {
        setEdit(e => ({ ...e, saving: false, error: json.message ?? 'Gagal menyimpan' }))
        return
      }
      if (json.data) {
        startTransition(() => {
          setMessages(prev => prev.map(m => m.id === edit.item!.id ? json.data! : m))
        })
      }
      setEdit(EMPTY_EDIT)
      toast.success('Pesan berhasil disimpan')
    } catch {
      setEdit(e => ({ ...e, saving: false, error: 'Koneksi bermasalah. Coba lagi.' }))
    }
  }

  async function handleSaveAdd() {
    if (!add.key.trim() || !add.kategori.trim() || !add.teks.trim()) {
      setAdd(a => ({ ...a, error: 'Key, kategori, dan teks wajib diisi' }))
      return
    }
    if (!/^[a-z0-9_]+$/.test(add.key)) {
      setAdd(a => ({ ...a, error: 'Format key tidak valid. Gunakan huruf kecil, angka, dan underscore.' }))
      return
    }
    setAdd(a => ({ ...a, saving: true, error: '' }))
    try {
      const res  = await fetch('/api/superadmin/messages', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          key:        add.key.trim(),
          kategori:   add.kategori.trim(),
          channel:    add.channel,
          teks:       add.teks.trim(),
          keterangan: add.keterangan.trim() || undefined,
        }),
      })
      const json = await res.json() as { success: boolean; message?: string; data?: MessageItem }
      if (!json.success) {
        setAdd(a => ({ ...a, saving: false, error: json.message ?? 'Gagal menyimpan' }))
        return
      }
      if (json.data) {
        startTransition(() => {
          setMessages(prev => [...prev, json.data!].sort((a, b) =>
            a.kategori.localeCompare(b.kategori) || a.key.localeCompare(b.key)
          ))
        })
      }
      setAdd(EMPTY_ADD)
      toast.success('Pesan baru berhasil ditambahkan')
    } catch {
      setAdd(a => ({ ...a, saving: false, error: 'Koneksi bermasalah. Coba lagi.' }))
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">

      {/*
       * Page header DIHAPUS dari sini.
       * Judul "Message Library" + deskripsi sekarang tampil di DashboardHeader
       * via page-meta.constant — konsisten dengan semua halaman lain.
       * Tombol "+ Tambah Pesan" tetap di sini karena ini aksi spesifik halaman ini.
       */}
      <div className="flex items-center justify-end">
        <Button size="sm" onClick={() => setAdd({ ...EMPTY_ADD, open: true })}>
          + Tambah Pesan
        </Button>
      </div>

      {/* Toolbar — Search + Filter */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Cari key atau teks..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-8 text-sm w-full sm:w-64"
        />
        <Select value={katFilter} onValueChange={setKatFilter}>
          <SelectTrigger className="h-8 text-sm w-full sm:w-48">
            <SelectValue placeholder="Semua Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua Kategori</SelectItem>
            {kategoriList.map(k => (
              <SelectItem key={k} value={k}>{k}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className={`${TYPOGRAPHY.caption} ml-auto`}>{filtered.length} pesan</span>
        {(search || katFilter !== 'semua') && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-slate-500"
            onClick={() => { setSearch(''); setKatFilter('semua') }}
          >
            Reset Filter
          </Button>
        )}
      </div>

      {/* Tabel */}
      <div className="rounded-md border border-slate-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className={`${TYPOGRAPHY.tableHead} w-56`}>Key</TableHead>
              <TableHead className={`${TYPOGRAPHY.tableHead} w-32`}>Kategori</TableHead>
              <TableHead className={TYPOGRAPHY.tableHead}>Preview Teks</TableHead>
              <TableHead className={`${TYPOGRAPHY.tableHead} w-28`}>Diupdate</TableHead>
              <TableHead className={`${TYPOGRAPHY.tableHead} w-16 text-right`}>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-sm text-slate-400">
                  {search || katFilter !== 'semua'
                    ? 'Tidak ada pesan yang cocok dengan filter ini.'
                    : 'Belum ada pesan.'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(msg => (
                <TableRow key={msg.id} className="hover:bg-slate-50/50">
                  <TableCell className="py-2">
                    <span className="font-mono text-xs text-slate-700 break-all">{msg.key}</span>
                  </TableCell>
                  <TableCell className="py-2">
                    {/* Badge warna dari resolveKategoriColor — terpusat di ui-tokens.constant */}
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${resolveKategoriColor(msg.kategori)}`}>
                      {msg.kategori}
                    </span>
                  </TableCell>
                  <TableCell className="py-2">
                    <span className="text-xs text-slate-600 line-clamp-2 break-all">
                      {msg.teks.length > 80 ? msg.teks.slice(0, 80) + '…' : msg.teks}
                    </span>
                    {msg.variabel.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {msg.variabel.map(v => (
                          <Badge key={v} variant="outline" className="text-xs px-1 py-0 font-mono text-slate-500">
                            {'{' + v + '}'}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className={`py-2 ${TYPOGRAPHY.caption}`}>{fmtDate(msg.updated_at)}</TableCell>
                  <TableCell className="py-2 text-right">
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => openEdit(msg)}>
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog Edit */}
      <Dialog open={edit.open} onOpenChange={open => !open && setEdit(EMPTY_EDIT)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Edit Pesan</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Key (tidak bisa diubah)</Label>
              <Input value={edit.item?.key ?? ''} readOnly className="font-mono text-xs bg-slate-50 text-slate-500 cursor-not-allowed" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Kategori</Label>
              <Input value={edit.item?.kategori ?? ''} readOnly className="text-xs bg-slate-50 text-slate-500 cursor-not-allowed" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Teks Pesan <span className="text-red-500">*</span></Label>
              {edit.item?.variabel && edit.item.variabel.length > 0 && (
                <p className="text-xs text-slate-400">
                  Variabel tersedia:{' '}
                  {edit.item.variabel.map(v => (
                    <code key={v} className="bg-slate-100 px-1 rounded mr-1">{'{' + v + '}'}</code>
                  ))}
                </p>
              )}
              <Textarea
                value={edit.teks}
                onChange={e => setEdit(ev => ({ ...ev, teks: e.target.value, error: '' }))}
                rows={4}
                className="text-sm resize-none"
                placeholder="Teks pesan..."
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Keterangan (opsional)</Label>
              <Input
                value={edit.keterangan}
                onChange={e => setEdit(ev => ({ ...ev, keterangan: e.target.value }))}
                className="text-sm"
                placeholder="Catatan internal..."
              />
            </div>
            {edit.error && <p className={TYPOGRAPHY.error}>{edit.error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEdit(EMPTY_EDIT)} disabled={edit.saving}>Batal</Button>
            <Button size="sm" onClick={handleSaveEdit} disabled={edit.saving}>
              {edit.saving ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Tambah */}
      <Dialog open={add.open} onOpenChange={open => !open && setAdd(EMPTY_ADD)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Tambah Pesan</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Key <span className="text-red-500">*</span></Label>
              <Input
                value={add.key}
                onChange={e => setAdd(a => ({ ...a, key: e.target.value.toLowerCase(), error: '' }))}
                className="font-mono text-sm"
                placeholder="modul_aksi_detail"
              />
              <p className="text-xs text-slate-400">Format: huruf kecil, angka, underscore. Contoh: login_error_sesi_habis</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Kategori <span className="text-red-500">*</span></Label>
              <Input
                value={add.kategori}
                onChange={e => setAdd(a => ({ ...a, kategori: e.target.value, error: '' }))}
                className="text-sm"
                placeholder="login_ui"
                list="kategori-list"
              />
              <datalist id="kategori-list">
                {kategoriList.map(k => <option key={k} value={k} />)}
              </datalist>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Channel</Label>
              <Select value={add.channel} onValueChange={v => setAdd(a => ({ ...a, channel: v }))}>
                <SelectTrigger className="text-sm h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CHANNEL_OPTIONS.map(c => (
                    <SelectItem key={c} value={c} className="text-sm">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Teks Pesan <span className="text-red-500">*</span></Label>
              <Textarea
                value={add.teks}
                onChange={e => setAdd(a => ({ ...a, teks: e.target.value, error: '' }))}
                rows={4}
                className="text-sm resize-none"
                placeholder="Teks pesan... Gunakan {nama_variabel} untuk nilai dinamis."
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Keterangan (opsional)</Label>
              <Input
                value={add.keterangan}
                onChange={e => setAdd(a => ({ ...a, keterangan: e.target.value }))}
                className="text-sm"
                placeholder="Catatan internal..."
              />
            </div>
            {add.error && <p className={TYPOGRAPHY.error}>{add.error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setAdd(EMPTY_ADD)} disabled={add.saving}>Batal</Button>
            <Button size="sm" onClick={handleSaveAdd} disabled={add.saving}>
              {add.saving ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
