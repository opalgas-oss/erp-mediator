'use client'

// components/register/RegisterClient.tsx
// Formulir pendaftaran Vendor — isinya DIBACA dari Field Registry, bukan ditulis di sini.
// Ditulis ulang: Sesi #486 (sebelumnya placeholder "sedang dalam pengembangan" sejak S#037).
// Arsip byte-exact versi lama: _arsip/coding-history/sesi-486-register-vendor/components/register/
//
// 🔴 SAKLAR SUPERADMIN BERAKIBAT DI SINI. Kolom yang `Tampil` dimatikan tidak sampai ke komponen ini;
//   kolom yang `Wajib` dinyalakan langsung menahan tombol kirim. Loop C-02 tertutup (ATURAN 34).
// ⛔ Tab Pelanggan BELUM ada — di luar C-02, dan dinyatakan terang di layar, bukan disembunyikan.


// ---------------------------------------------------------------------------
// Alamat berkas ini sejak S#489: components/register/RegisterClient/RegisterClient.tsx.
//   Baris 3 di atas menyebut alamat LAMA dan sengaja TIDAK diubah — komentar sejarah
//   DILARANG disunting demi kerapian (K-426-2).
// Pemecahan S#489 (ATURAN 50.5), sumbu = ALASAN BERUBAH:
//   bentuk data yang masuk → `.kontrak.ts` · keadaan + pengiriman → `.hook.ts` ·
//   kerangka + isian + centang → `.subcomponents.tsx`.
// ⛔ `return` utama TIDAK dipotong: memecahnya jadi BagianAkun/BagianPersetujuan
//   (usul S#488) menuntut 8 nilai keadaan menyeberang sebagai props dan memperbesar
//   risiko DOM berubah, sementara induk sudah cukup jauh di bawah ambang tanpa itu.
// ---------------------------------------------------------------------------

import Link from 'next/link'
import { CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TYPOGRAPHY } from '@/lib/constants/ui-tokens.constant'
import { KolomFormulir } from '@/components/register/KolomFormulir'
import { useRegisterForm } from './RegisterClient.hook'
import { Kerangka, Isian, Centang } from './RegisterClient.subcomponents'
import type { RegisterClientProps } from './RegisterClient.kontrak'

const KOTAK_TEKS = 'max-h-56 overflow-y-auto rounded-md border border-[#d1d5db] bg-[#fafafa] p-3 whitespace-pre-wrap text-[12px] leading-relaxed'

export default function RegisterClient({
  kelompok, opsi, teksPersetujuan, labelCentang,
}: RegisterClientProps) {
  const {
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
  } = useRegisterForm({ kelompok })

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
