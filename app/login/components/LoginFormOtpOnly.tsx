// app/login/components/LoginFormOtpOnly.tsx
// Form login mode otp_only (Pengganti Password) — input nomor HP + kirim OTP WA
// Dibuat: Sesi #209 — Fitur OTP Mode Login (TDD Step 4)
//
// Semua teks via m() dari message_library DB (ATURAN 8 + H8 TECHNICAL_STANDARDS):
//   login_otp_only_title, login_otp_only_info_nomor, login_otp_only_label_nomor,
//   login_otp_only_placeholder, login_otp_only_button_kirim,
//   login_otp_only_button_loading, login_otp_only_link_password
//
// Mockup disetujui Philips S#204: tombol hijau + ikon WA + link fallback password.
// Accessibility H9: htmlFor terhubung ke id input, aria-label pada tombol.

'use client'

import { Button }      from '@/components/ui/button'
import { Input }       from '@/components/ui/input'
import { Label }       from '@/components/ui/label'
import {
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Wrapper, KotakError } from './shared'

// ─── Tipe ────────────────────────────────────────────────────────────────────

// m() dikirim dari parent (page.tsx via flow.m) — ikuti pola komponen login lain (OTPStage, dll)
type MessageFn = (key: string, vars?: Record<string, string>) => string

interface LoginFormOtpOnlyProps {
  nomorHp:         string
  isLoading:       boolean
  error:           string
  onNomorHpChange: (v: string) => void
  onKirimOTP:      () => void
  onMasukPassword: () => void
  m:               MessageFn
}

// ─── Komponen ─────────────────────────────────────────────────────────────────

export function LoginFormOtpOnly({
  nomorHp,
  isLoading,
  error,
  onNomorHpChange,
  onKirimOTP,
  onMasukPassword,
  m,
}: LoginFormOtpOnlyProps) {
  return (
    <Wrapper>
      {/* ── Header ── */}
      <CardHeader className="pb-2">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-1">
          <span className="text-blue-700 font-semibold text-lg" aria-hidden>M</span>
        </div>
        <CardTitle className="text-center text-lg font-semibold text-gray-900">
          {m('login_otp_only_title')}
        </CardTitle>
        <CardDescription className="text-center text-sm text-muted-foreground">
          {m('login_otp_only_info_nomor')}
        </CardDescription>
      </CardHeader>

      {/* ── Konten ── */}
      <CardContent className="pb-4 space-y-4">
        {/* Error box */}
        {error && <KotakError pesan={error} />}

        {/* Input nomor HP — H9.3 (TECHNICAL_STANDARDS): label htmlFor terhubung ke id input */}
        <div className="space-y-1.5">
          <Label htmlFor="nomor-hp-otp" className="text-sm text-gray-600">
            {m('login_otp_only_label_nomor')}
          </Label>
          <Input
            id="nomor-hp-otp"
            type="tel"
            inputMode="numeric"
            value={nomorHp}
            onChange={e => onNomorHpChange(e.target.value)}
            placeholder={m('login_otp_only_placeholder')}
            disabled={isLoading}
            onKeyDown={e => e.key === 'Enter' && !isLoading && onKirimOTP()}
            autoComplete="tel"
          />
        </div>

        {/* Tombol kirim OTP — hijau + ikon WA (mockup disetujui Philips S#204) */}
        <Button
          className="w-full bg-green-500 hover:bg-green-600 text-white font-medium"
          disabled={isLoading || !nomorHp.trim()}
          onClick={() => !isLoading && onKirimOTP()}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <svg
                className="animate-spin h-4 w-4 flex-shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
              </svg>
              {m('login_otp_only_button_loading')}
            </span>
          ) : (
            <span className="flex items-center gap-2">
              {/* Ikon WhatsApp SVG — aria-hidden karena label ada di tombol parent */}
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4 fill-white flex-shrink-0"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              {m('login_otp_only_button_kirim')}
            </span>
          )}
        </Button>

        {/* Link fallback password — RB-05: selalu tersedia sebagai fallback darurat */}
        <p className="text-sm text-center text-gray-500">
          <button
            type="button"
            onClick={onMasukPassword}
            disabled={isLoading}
            className="text-blue-600 hover:text-blue-700 font-medium underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 rounded"
          >
            {m('login_otp_only_link_password')}
          </button>
        </p>
      </CardContent>
    </Wrapper>
  )
}
