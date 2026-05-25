// ARSIP ATURAN 12 — S#215 sebelum tambah fitur Kirim Ulang Email Aktivasi
// app/login/components/StatusRegistrasiModal.tsx
// Pop-up informatif status registrasi saat user login tapi belum bisa masuk
//
// HUTANG-LOGIN-STATUS-POPUP S#213 — Keputusan Philips S#212:
//   Ganti redirect error vendor_not_approved yang tidak informatif
//   dengan pop-up spesifik per kondisi register_status + lifecycle_status.
//
// 5 kondisi yang ditangani (pesan dari message_library DB — anti-hardcode):
//   pending/review (Vendor)       → login_status_review_vendor        (email PIC AT)
//   pending/review (AdminTenant)  → login_status_review_admintenant   (email SuperAdmin)
//   approved + lifecycle pending  → login_status_belum_aktivasi       (cek inbox email)
//   rejected (Vendor)             → login_status_ditolak_vendor       (email PIC AT)
//   rejected (AdminTenant)        → login_status_ditolak_admintenant  (email SuperAdmin)

'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertCircle, Clock, Mail } from 'lucide-react'

interface StatusPopupData {
  pesan_key:        string
  email_kontak:     string
  register_status:  string
  lifecycle_status: string | null
}

interface Props {
  data:    StatusPopupData | null
  m:       (key: string, vars?: Record<string, string>) => string
  onTutup: () => void
}

export function StatusRegistrasiModal({ data, m, onTutup }: Props) {
  if (!data) return null

  const pesan = m(
    data.pesan_key,
    data.email_kontak ? { email_kontak: data.email_kontak } : {}
  )

  let judul: string
  let ikon: React.ReactNode

  if (data.register_status === 'approved' && data.lifecycle_status === 'pending') {
    judul = 'Akun Belum Diaktivasi'
    ikon  = <Mail className="h-6 w-6 text-amber-500 flex-shrink-0" />
  } else if (data.register_status === 'rejected') {
    judul = 'Registrasi Tidak Disetujui'
    ikon  = <AlertCircle className="h-6 w-6 text-red-500 flex-shrink-0" />
  } else {
    judul = 'Registrasi Dalam Proses Review'
    ikon  = <Clock className="h-6 w-6 text-amber-500 flex-shrink-0" />
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
        <DialogFooter>
          <Button onClick={onTutup} className="w-full">
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
