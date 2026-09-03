'use client'

// components/register/RegisterClient.tsx
// Formulir pendaftaran Vendor — isinya DIBACA dari Field Registry, bukan ditulis di sini.
// Ditulis ulang: Sesi #486 (sebelumnya placeholder "sedang dalam pengembangan" sejak S#037).
// Arsip byte-exact versi lama: _arsip/coding-history/sesi-486-register-vendor/components/register/
//
// 🔴 SAKLAR SUPERADMIN BERAKIBAT DI SINI. Kolom yang `Tampil` dimatikan tidak sampai ke komponen ini;
//   kolom yang `Wajib` dinyalakan langsung menahan tombol kirim. Loop C-02 tertutup (ATURAN 34).
// ⛔ Tab Pelanggan BELUM ada — di luar C-02, dan dinyatakan terang di layar, bukan disembunyikan.

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input }  from '@/components/ui/input'
import { Label }  from '@/components/ui/label'
import { TYPOGRAPHY } from '@/lib/constants/ui-tokens.constant'
import { KolomFormulir } from '@/components/register/KolomFormulir'
import { validasiSemuaKolom } from '@/lib/utils/validasi-form-field.util'
import type { FormFieldPublik } from '@/lib/types/form-field-registry.types'
import type { NilaiJawaban, OpsiPilihan } from '@/lib/types/vendor-register.types'

export interface KelompokKolom { group_key: string; fields: FormFieldPublik[] }

export interface RegisterClientProps {
  kelompok:      KelompokKolom[]
  opsi:          Record<string, OpsiPilihan[]>
  teksPersetujuan: string
  labelCentang:  { snk: string; data: string; pasal33: string }
}

const KOTAK_TEKS = 'max-h-56 overflow-y-auto rounded-md border border-[#d1d5db] bg-[#fafafa] p-3 whitespace-pre-wrap text-[12px] leading-relaxed'

export default function RegisterClient({
  kelompok, opsi, teksPersetujuan, labelCentang,
}: RegisterClientProps) {
  const [akun, setAkun]         = useState({ nama: '', email: '', nomor_wa: '', password: '', ulangi: '' })
  const [jawaban, setJawaban]   = useState<Record<string, NilaiJawaban>>({})
  const [setuju, setSetuju]     = useState({ snk: false, data_pribadi: false, pasal_3_3: false })
  const [umpan, setUmpan]       = useState('')
  const [galat, setGalat]       = useState<Record<string, string>>({})
  const [pesan, setPesan]       = useState<string | null>(null)
  const [mengirim, setMengirim] = useState(false)
  const [selesai, setSelesai]   = useState(false)

  const semuaKolom = useMemo(() => kelompok.flatMap((g) => g.fields), [kelompok])

  const ubah = (fieldKey: string, nilai: NilaiJawaban): void => {
    setJawaban((lama) => ({ ...lama, [fieldKey]: nilai }))
    setGalat((lama) => { const baru = { ...lama }; delete baru[fieldKey]; return baru })
  }

  const kirim = async (): Promise<void> => {
    setPesan(null)

    const galatAkun: Record<string, string> = {}
    if (!akun.nama.trim())                      galatAkun.nama = 'Nama lengkap wajib diisi'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(akun.email.trim()))
      galatAkun.email = 'Format email tidak valid. Contoh: nama@email.com'
    if (!akun.nomor_wa.trim())                  galatAkun.nomor_wa = 'Nomor WhatsApp wajib diisi'
    if (akun.password.length < 8)               galatAkun.password = 'Password minimal 8 karakter'
    if (akun.ulangi !== akun.password)          galatAkun.ulangi   = 'Password tidak cocok'

    const galatKolom = validasiSemuaKolom(semuaKolom, jawaban)
    const gabung = { ...galatAkun, ...galatKolom }

    if (!setuju.snk || !setuju.data_pribadi || !setuju.pasal_3_3) {
      gabung.persetujuan = 'Ketiga pernyataan wajib dicentang'
    }
    if (Object.keys(gabung).length > 0) { setGalat(gabung); return }

    setMengirim(true)
    try {
      const res = await fetch('/api/auth/vendor-register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          akun: {
            nama: akun.nama, email: akun.email, nomor_wa: akun.nomor_wa, password: akun.password,
          },
          jawaban: semuaKolom.map((k) => ({ field_key: k.field_key, nilai: jawaban[k.field_key] ?? null })),
          persetujuan: setuju,
          situs_web:   umpan,
        }),
      })
      const json = await res.json() as { success: boolean; message?: string; galatKolom?: Record<string, string> }
      if (!res.ok || !json.success) {
        if (json.galatKolom) setGalat(json.galatKolom)
        throw new Error(json.message ?? 'Gagal mendaftar. Coba lagi atau hubungi admin.')
      }
      setSelesai(true)
    } catch (err) {
      setPesan(err instanceof Error ? err.message : 'Gagal mendaftar. Coba lagi atau hubungi admin.')
      setMengirim(false)
    }
  }

  if (selesai) {
    return (
      <Kerangka>
        <CardContent className="pb-6 space-y-3 text-center">
          <p className="text-[28px]">⏳</p>
          <h2 className={TYPOGRAPHY.h2}>Pendaftaran Berhasil Dikirim</h2>
          <p className={TYPOGRAPHY.muted}>
            Akun Anda sedang menunggu verifikasi dari Admin. Anda belum bisa masuk sampai
            pendaftaran disetujui.
          </p>
          <Link href="/" className="inline-block text-[13px] text-[#185FA5] font-medium">
            Kembali ke Halaman Utama
          </Link>
        </CardContent>
      </Kerangka>
    )
  }

  return (
    <Kerangka>
      <CardContent className="pb-6 space-y-5">
        <section className="space-y-3">
          <h3 className={TYPOGRAPHY.cardTitle}>Data Akun</h3>
          <Isian label="Nama Lengkap" id="nama" nilai={akun.nama} galat={galat.nama}
                 onUbah={(v) => setAkun({ ...akun, nama: v })} />
          <Isian label="Email" id="email" tipe="email" nilai={akun.email} galat={galat.email}
                 onUbah={(v) => setAkun({ ...akun, email: v })} />
          <Isian label="Nomor WhatsApp" id="wa" nilai={akun.nomor_wa} galat={galat.nomor_wa}
                 onUbah={(v) => setAkun({ ...akun, nomor_wa: v })} />
          <Isian label="Password" id="pw" tipe="password" nilai={akun.password} galat={galat.password}
                 onUbah={(v) => setAkun({ ...akun, password: v })} />
          <Isian label="Ulangi Password" id="pw2" tipe="password" nilai={akun.ulangi} galat={galat.ulangi}
                 onUbah={(v) => setAkun({ ...akun, ulangi: v })} />
        </section>

        {kelompok.map((g) => (
          <section key={g.group_key} className="space-y-3">
            <h3 className={TYPOGRAPHY.cardTitle}>{g.group_key}</h3>
            {g.fields.map((k) => (
              <KolomFormulir
                key={k.field_key}
                kolom={k}
                opsi={opsi[k.field_key] ?? []}
                nilai={jawaban[k.field_key] ?? null}
                galat={galat[k.field_key]}
                onUbah={ubah}
              />
            ))}
          </section>
        ))}

        <section className="space-y-3">
          <h3 className={TYPOGRAPHY.cardTitle}>Persetujuan</h3>
          <div className={KOTAK_TEKS}>{teksPersetujuan}</div>
          <Centang teks={labelCentang.snk}     nilai={setuju.snk}
                   onUbah={(v) => setSetuju({ ...setuju, snk: v })} />
          <Centang teks={labelCentang.data}    nilai={setuju.data_pribadi}
                   onUbah={(v) => setSetuju({ ...setuju, data_pribadi: v })} />
          <Centang teks={labelCentang.pasal33} nilai={setuju.pasal_3_3}
                   onUbah={(v) => setSetuju({ ...setuju, pasal_3_3: v })} />
          {galat.persetujuan && <span className={TYPOGRAPHY.error}>{galat.persetujuan}</span>}
        </section>

        {/* Kolom umpan — disembunyikan dari manusia, diisi robot. */}
        <input type="text" value={umpan} onChange={(e) => setUmpan(e.target.value)}
               name="situs_web" tabIndex={-1} autoComplete="off" aria-hidden="true"
               className="hidden" />

        {pesan && (
          <div className="rounded-md border border-[#F09595] bg-[#FCEBEB] px-3 py-2">
            <span className="text-[12px] text-[#A32D2D]">{pesan}</span>
          </div>
        )}

        <Button className="w-full" onClick={() => { void kirim() }} disabled={mengirim}>
          {mengirim ? 'Mengirim pendaftaran...' : 'Kirim Pendaftaran'}
        </Button>

        <p className={`${TYPOGRAPHY.muted} text-center`}>
          Sudah punya akun?{' '}
          <Link href="/login" className="text-[#185FA5] font-medium">Masuk di sini</Link>
        </p>
      </CardContent>
    </Kerangka>
  )
}

function Kerangka({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f9fafb] flex items-start justify-center px-4 py-8">
      <Card className="w-full max-w-[520px]">
        <CardHeader>
          <CardTitle className="text-center">Pendaftaran Vendor / Mitra</CardTitle>
          <p className={`${TYPOGRAPHY.muted} text-center`}>
            Pendaftaran Pelanggan belum dibuka di halaman ini.
          </p>
        </CardHeader>
        {children}
      </Card>
    </div>
  )
}

function Isian({ label, id, nilai, galat, onUbah, tipe = 'text' }: {
  label: string; id: string; nilai: string; galat?: string
  onUbah: (v: string) => void; tipe?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className={TYPOGRAPHY.label}>
        {label}<span className="text-[#A32D2D]"> *</span>
      </Label>
      <Input id={id} type={tipe} value={nilai} onChange={(e) => onUbah(e.target.value)} />
      {galat && <span className={TYPOGRAPHY.error}>{galat}</span>}
    </div>
  )
}

function Centang({ teks, nilai, onUbah }: { teks: string; nilai: boolean; onUbah: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-2 text-[12px] leading-relaxed cursor-pointer">
      <input type="checkbox" checked={nilai} onChange={(e) => onUbah(e.target.checked)}
             className="h-4 w-4 mt-0.5 shrink-0" />
      <span>{teks}</span>
    </label>
  )
}
