// components/register/RegisterClient/RegisterClient.hook.ts
// ---------------------------------------------------------------------------
// Lahir: Sesi #489 — pemecahan `components/register/RegisterClient.tsx`
//   (9.941 B = 97,08% plafon kode 10.240 B — sisa 299 B; hutang #97).
//   Commit tersendiri, NOL perubahan perilaku. Bentuk folder + `index.ts` sebagai
//   MASTER: ATURAN 50.5, sama dengan pemecahan FormFieldRegistryClient di sesi ini.
//   Isi di bawah DIPINDAH byte-exact oleh program dari berkas asal — nol karakter
//   diketik ulang, nol kalimat diringkas, urutan asli dipertahankan.
//   Arsip byte-exact asal: _arsip/coding-history/sesi-489c-pecah-register-client/
// ISI BERKAS INI: baris 38–97 berkas asal — SELURUH keadaan formulir + pengiriman.
// ---------------------------------------------------------------------------
//   Baris 38–97 dipindah sebagai SATU blok: urutan pemanggilan hook React tidak boleh
//   berubah. `ubah` dan `kirim` sengaja TIDAK dimemoisasi, persis seperti asalnya.

import { useMemo, useState } from 'react'
import { validasiSemuaKolom } from '@/lib/utils/validasi-form-field.util'
import type { NilaiJawaban } from '@/lib/types/vendor-register.types'
import type { KelompokKolom } from './RegisterClient.kontrak'

export function useRegisterForm({ kelompok }: { kelompok: KelompokKolom[] }) {
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

  return {
    akun, setAkun,
    jawaban,
    setuju, setSetuju,
    umpan, setUmpan,
    galat,
    pesan,
    mengirim,
    selesai,
    ubah,
    kirim,
  }
}
