// components/register/RegisterClient/RegisterClient.kontrak.ts
// ---------------------------------------------------------------------------
// Lahir: Sesi #489 — pemecahan `components/register/RegisterClient.tsx`
//   (9.941 B = 97,08% plafon kode 10.240 B — sisa 299 B; hutang #97).
//   Commit tersendiri, NOL perubahan perilaku. Bentuk folder + `index.ts` sebagai
//   MASTER: ATURAN 50.5, sama dengan pemecahan FormFieldRegistryClient di sesi ini.
//   Isi di bawah DIPINDAH byte-exact oleh program dari berkas asal — nol karakter
//   diketik ulang, nol kalimat diringkas, urutan asli dipertahankan.
//   Arsip byte-exact asal: _arsip/coding-history/sesi-489c-pecah-register-client/
// ISI BERKAS INI: baris 24–31 berkas asal — bentuk data yang masuk dari server.
// ---------------------------------------------------------------------------

import type { FormFieldPublik } from '@/lib/types/form-field-registry.types'
import type { OpsiPilihan } from '@/lib/types/vendor-register.types'

export interface KelompokKolom { group_key: string; fields: FormFieldPublik[] }

export interface RegisterClientProps {
  kelompok:      KelompokKolom[]
  opsi:          Record<string, OpsiPilihan[]>
  teksPersetujuan: string
  labelCentang:  { snk: string; data: string; pasal33: string }
}
