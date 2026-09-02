// app/api/form-fields/[form_key]/route.ts
// GET   — susunan kolom satu formulir (untuk layar SA: termasuk yang sedang dimatikan).
// PATCH — SuperAdmin menggeser saklar Tampil / Wajib / Aktif / Verifikasi, atau mengubah urutan.
//
// Dibuat: Sesi #483 — K-483-4 (Philips). Kolom formulir dikelola SA dari dashboard,
//   bukan dari kode ⇒ perubahan aturan pemerintah = geser saklar, nol deploy.
//
// ⚠️ GET DI SINI BUTUH SUPERADMIN — berbeda dari /api/config/[feature_key] yang publik.
//   Sebabnya: jawaban rute ini memuat kolom yang SEDANG DIMATIKAN beserta `catatan_risiko`-nya.
//   Formulir publik `/register` TIDAK memakai rute ini; ia memanggil
//   `getFormFieldsUntukFormulir()` langsung di server, yang hanya memulangkan kolom aktif.

import { NextRequest, NextResponse }  from 'next/server'
import { requireSuperAdmin }          from '@/lib/auth-server'
import { getFormFieldsUntukAdmin, invalidateFormFieldsCache } from '@/lib/services/form-field-registry.service'
import { FormFieldRegistryRepo_updateSaklar } from '@/lib/repositories/form-field-registry.repository'
import type { FormFieldSaklarPatch } from '@/lib/types/form-field-registry.types'

const SAKLAR_YANG_BOLEH_DIUBAH = [
  'is_visible', 'is_required', 'is_active', 'butuh_verifikasi_admin', 'urutan',
] as const

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ form_key: string }> },
) {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res

    const { form_key } = await params
    const groups = await getFormFieldsUntukAdmin(form_key)
    return NextResponse.json({ success: true, data: groups })
  } catch (err) {
    const pesan = err instanceof Error ? err.message : 'Gagal membaca susunan kolom'
    return NextResponse.json({ success: false, message: pesan }, { status: 500 })
  }
}

// ─── PATCH ────────────────────────────────────────────────────────────────────
/**
 * Body: { perubahan: FormFieldSaklarPatch[] }
 * Ditulis satu per satu, bukan sekaligus — jumlah baris satu formulir kecil (puluhan),
 * dan menulis per baris membuat pesan galat menyebut baris mana yang gagal.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ form_key: string }> },
) {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res
    const uid = auth.uid

    const { form_key } = await params
    const payload = await request.json()
    const perubahan: unknown = payload?.perubahan

    if (!Array.isArray(perubahan) || perubahan.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Body wajib memuat array "perubahan" yang tidak kosong' },
        { status: 400 },
      )
    }

    // Saring: hanya id + saklar yang diizinkan yang lolos. Field lain dibuang, tidak diam-diam ditulis.
    const bersih: FormFieldSaklarPatch[] = []
    for (const item of perubahan as Record<string, unknown>[]) {
      if (typeof item?.id !== 'string' || item.id.length === 0) {
        return NextResponse.json(
          { success: false, message: 'Setiap perubahan wajib punya "id" bertipe string' },
          { status: 400 },
        )
      }
      const patch: FormFieldSaklarPatch = { id: item.id }
      let adaIsi = false
      for (const kunci of SAKLAR_YANG_BOLEH_DIUBAH) {
        if (item[kunci] === undefined) continue
        if (kunci === 'urutan') {
          if (!Number.isInteger(item[kunci])) {
            return NextResponse.json(
              { success: false, message: `"urutan" pada ${item.id} harus bilangan bulat` },
              { status: 400 },
            )
          }
          patch.urutan = item[kunci] as number
        } else {
          if (typeof item[kunci] !== 'boolean') {
            return NextResponse.json(
              { success: false, message: `"${kunci}" pada ${item.id} harus boolean` },
              { status: 400 },
            )
          }
          patch[kunci] = item[kunci] as boolean
        }
        adaIsi = true
      }
      if (adaIsi) bersih.push(patch)
    }

    if (bersih.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Nol saklar yang bisa diubah pada payload ini' },
        { status: 400 },
      )
    }

    for (const patch of bersih) {
      await FormFieldRegistryRepo_updateSaklar(form_key, patch, uid)
    }

    // Cache susunan kolom dihapus di MOMEN YANG SAMA dengan penulisannya (pola S#451):
    // tanpa ini, layar SA sudah menampilkan "tersimpan" sementara formulir /register
    // masih merender susunan lama sampai TTL habis.
    invalidateFormFieldsCache(form_key)

    return NextResponse.json({ success: true, jumlah: bersih.length })
  } catch (err) {
    const pesan = err instanceof Error ? err.message : 'Gagal menyimpan perubahan'
    return NextResponse.json({ success: false, message: pesan }, { status: 500 })
  }
}
