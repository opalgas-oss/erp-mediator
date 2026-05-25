// app/login/components/StatusRegistrasiModal.tsx
// Pop-up informatif status registrasi saat user login tapi belum bisa masuk
//
// HUTANG-LOGIN-STATUS-POPUP S#213 — Keputusan Philips S#212:
//   Ganti redirect error vendor_not_approved yang tidak informatif
//   dengan pop-up spesifik per kondisi register_status + lifecycle_status.
//
// S#215: Tambah tombol "Kirim Ulang Email Aktivasi" untuk kondisi approved+pending.
//
// 5 kondisi yang ditangani (pesan dari message_library DB — anti-hardcode):
//   pending/review (Vendor)       → login_status_review_vendor        (email PIC AT)
//   pending/review (AdminTenant)  → login_status_review_admintenant   (email SuperAdmin)
//   approved + lifecycle pending  → login_status_belum_aktivasi       (cek inbox email)
//   rejected (Vendor)             → login_status_ditolak_vendor       (email PIC AT)
//   rejected (AdminTenant)        → login_status_ditolak_admintenant  (email SuperAdmin)

'use client'

import { useState }       from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button }         from '@/components/ui/button'
import { AlertCircle, Clock, Mail, Loader2 } from 'lucide-react'
import { kirimUlangEmailAktivasiAction } from '@/app/login/aktivasi-actions'

// ─── Tipe ──────────────────────────────────────────────────────────────────────

interface StatusPopupData {
  pesan_key:        string
  email_kontak:     string
  register_status:  string
  lifecycle_status: string | null
  user_email?:      string
}

interface Props {
  data:    StatusPopupData | null
  m:       (key: string, vars?: Record<string, string>) => string
  onTutup: () => void
}

// ─── Komponen ─────────────────────────────────────────────────────────────────

export function StatusRegistrasiModal({ data, m, onTutup }: Props) {
  const [loadingKirim, setLoadingKirim] = useState(false)
  const [sudahKirim,   setSudahKirim]   = useState(false)
  const [errorKirim,   setErrorKirim]   = useState('')

  if (!data) return null

  const isBelumAktivasi =
    data.register_status === 'approved' && data.lifecycle_status === 'pending'

  const pesan = m(
    data.pesan_key,
    data.email_kontak ? { email_kontak: data.email_kontak } : {}
  )

  // Tentukan judul + ikon berdasarkan kondisi
  let judul: string
  let ikon: React.ReactNode

  if (isBelumAktivasi) {
    judul = 'Akun Belum Diaktivasi'
    ikon  = <Mail className="h-6 w-6 text-amber-500 flex-shrink-0" />
  } else if (data.register_status === 'rejected') {
    judul = 'Registrasi Tidak Disetujui'
    ikon  = <AlertCircle className="h-6 w-6 text-red-500 flex-shrink-0" />
  } else {
    // pending / review
    judul = 'Registrasi Dalam Proses Review'
    ikon  = <Clock className="h-6 w-6 text-amber-500 flex-shrink-0" />
  }

  async function handleKirimUlang() {
    if (!data?.user_email || loadingKirim || sudahKirim) return
    setLoadingKirim(true)
    setErrorKirim('')
    try {
      const result = await kirimUlangEmailAktivasiAction({ userEmail: data.user_email })
      if (result.ok) {
        setSudahKirim(true)
      } else {
        setErrorKirim(m(result.errorKey ?? 'login_aktivasi_gagal_kirim'))
      }
    } catch {
      setErrorKirim(m('login_aktivasi_gagal_kirim'))
    } finally {
      setLoadingKirim(false)
    }
  }

  return (
    <Dialog open={!!data} onOpenChange={(open) => { if (!open) onTutup() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {ikon}
            <DialogTitle className="text-left">{judul}</DialogTitle>
          </div>
        </DialogHeader>

        <p className="text-sm text-muted-foreground leading-relaxed py-2 whitespace-pre-line">
          {pesan}
        </p>

        {/* Konfirmasi kirim berhasil */}
        {sudahKirim && (
          <p className="text-sm text-green-600 font-medium">
            {m('login_aktivasi_terkirim')}
          </p>
        )}

        {/* Error kirim */}
        {errorKirim && (
          <p className="text-sm text-red-600">
            {errorKirim}
          </p>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          {/* Tombol Kirim Ulang Aktivasi — hanya untuk kondisi belum aktivasi */}
          {isBelumAktivasi && data.user_email && !sudahKirim && (
            <Button
              variant="outline"
              className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
              onClick={handleKirimUlang}
              disabled={loadingKirim}
            >
              {loadingKirim ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Mengirim...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {m('login_button_kirim_ulang_aktivasi')}
                </span>
              )}
            </Button>
          )}

          <Button onClick={onTutup} className="w-full">
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
