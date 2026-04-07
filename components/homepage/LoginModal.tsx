"use client"

// Komponen modal login — muncul saat user belum login dan mencoba aksi yang butuh autentikasi
import { LockKeyhole } from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const router = useRouter()

  // Tutup modal lalu navigasi ke halaman login
  const handleMasuk = () => {
    onClose()
    router.push('/login')
  }

  // Tutup modal lalu navigasi ke halaman daftar
  const handleDaftar = () => {
    onClose()
    router.push('/register')
  }

  // Tutup modal lalu navigasi ke halaman daftar sebagai vendor
  const handleDaftarMitra = () => {
    onClose()
    router.push('/register?tab=vendor')
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          {/* Ikon kunci di bagian atas */}
          <div className="flex justify-center mb-2">
            <LockKeyhole
              size={32}
              style={{ color: '#185FA5' }}
              aria-hidden="true"
            />
          </div>
          <DialogTitle className="text-center">
            Masuk untuk melanjutkan
          </DialogTitle>
          <DialogDescription className="text-center">
            Untuk melihat detail dan membuat order, silakan masuk atau daftar akun baru.
          </DialogDescription>
        </DialogHeader>

        {/* Tombol aksi utama */}
        <div className="flex flex-col gap-3 mt-2">
          <Button
            className="w-full"
            style={{ backgroundColor: '#185FA5' }}
            onClick={handleMasuk}
          >
            Masuk
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={handleDaftar}
          >
            Daftar
          </Button>
        </div>

        {/* Garis pemisah */}
        <hr className="my-2 border-gray-100" />

        {/* Bagian daftar sebagai mitra */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">
            Ingin bergabung sebagai mitra?
          </p>
          <button
            onClick={handleDaftarMitra}
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            Daftar sebagai Mitra →
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
