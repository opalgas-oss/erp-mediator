// app/api/form-fields/[form_key]/route.ts
// GET   — susunan kolom satu formulir (untuk layar SA: termasuk yang sedang dimatikan).
// PATCH — SuperAdmin menggeser saklar Tampil / Wajib / Aktif / Verifikasi, mengubah urutan,
//         atau — sejak S#492 — menyunting `label` dan `validasi` (SPEK §1 A1 + B1).
//
// Dibuat: Sesi #483 — K-483-4 (Philips). Kolom formulir dikelola SA dari dashboard,
//   bukan dari kode ⇒ perubahan aturan pemerintah = geser saklar, nol deploy.
//
// ⚠️ GET DI SINI BUTUH SUPERADMIN — berbeda dari /api/config/[feature_key] yang publik.
//   Sebabnya: jawaban rute ini memuat kolom yang SEDANG DIMATIKAN beserta `catatan_risiko`-nya.
//   Formulir publik `/register` TIDAK memakai rute ini; ia memanggil
//   `getFormFieldsUntukFormulir()` langsung di server, yang hanya memulangkan kolom aktif.

//
// 🔴 GERBANG AUTH — `requireSuperAdminCookie()`, ⛔ BUKAN `requireSuperAdmin()`. S#493.
//   Sebabnya DIUKUR di `dev` online, bukan ditaksir:
//   1. `requireSuperAdmin()` memercayai header `x-is-super-admin` yang disuntikkan middleware
//      Guard 6, dan Guard 6 hanya menyuntik untuk EMPAT prefiks: `/api/superadmin/` ·
//      `/api/admintenant/` · `/api/config/` · `/api/monitoring/`. Rute ini tidak termasuk.
//   2. Akibat pertama: SuperAdmin sungguhan yang menekan Simpan dari layar selalu ditolak
//      403 "Akses ditolak" — dijatuhkan layar Philips S#493.
//   3. Akibat kedua, lebih berat: karena Guard 6 juga yang MENGHAPUS header kiriman klien,
//      rute di luar keempat prefiks itu menerima header `x-user-id` + `x-user-role` +
//      `x-is-super-admin` apa adanya dari siapa pun.
//      🔴 KOREKSI S#494 atas kalimat yang berdiri di sini sebelumnya (E-493-2): kalimat lama
//      menulis bahwa permintaan "TANPA sesi apa pun" LOLOS gerbang. Itu MELEBIHI buktinya —
//      permintaan uji itu membawa cookie peramban bawaan Claude, yang ternyata memegang sesi
//      SuperAdmin sah (T-493-1). Yang benar-benar terbukti waktu itu: header DIPERCAYA dan
//      mengalahkan ketiadaan header. Bahwa anonim murni tembus pada versi lama adalah
//      PEMBACAAN KODE, ⛔ bukan hasil uji. Sesudah perbaikan, anonim (`credentials:'omit'`)
//      dijawab 401 — itu yang diuji dan itu yang berlaku. Sisa lubangnya = hutang #129.
//   ⇒ `requireSuperAdminCookie()` tidak membaca header sama sekali; ia memverifikasi klaim
//   `is_super_admin` langsung dari JWT bertanda tangan Supabase — sumber yang SAMA dengan yang
//   middleware pakai (`extractMembershipsFromPayload`: `payload['is_super_admin'] === true`).
import { NextRequest, NextResponse }  from 'next/server'
import { requireSuperAdminCookie }    from '@/lib/auth-server'
import { getFormFieldsUntukAdmin, invalidateFormFieldsCache } from '@/lib/services/form-field-registry.service'
import { getPolaKeyAktif } from '@/lib/services/form-field-pola.service'
import { FormFieldRegistryRepo_updateBaris } from '@/lib/repositories/form-field-registry.repository'
import { saringPerubahan } from '@/lib/utils/form-field-patch.util'
import { bacaSetelanPenjagaan } from '@/lib/services/form-field-penjagaan.service'
import { periksaKetergantungan, terapkanPatch } from '@/lib/utils/form-field-ketergantungan.util'

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ form_key: string }> },
) {
  try {
    const auth = await requireSuperAdminCookie()
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
 * Body: { perubahan: FormFieldPatch[] }
 * Ditulis satu per satu, bukan sekaligus — jumlah baris satu formulir kecil (puluhan),
 * dan menulis per baris membuat pesan galat menyebut baris mana yang gagal.
 * Penjagaan bentuknya tinggal di `lib/utils/form-field-patch.util.ts` (SPEK §4).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ form_key: string }> },
) {
  try {
    const auth = await requireSuperAdminCookie()
    if (!auth.ok) return auth.res
    const uid = auth.uid

    const { form_key } = await params
    const payload = await request.json()

    // Katalog pola dibaca LEBIH DULU: penjagaan butir 2 SPEK §4 menolak `nama` pola
    // yang tidak ada di katalog, dan itu tidak bisa diputuskan tanpa katalognya.
    const polaKeyAktif = await getPolaKeyAktif()

    const hasil = saringPerubahan(payload?.perubahan, polaKeyAktif)
    if (!hasil.ok) {
      return NextResponse.json({ success: false, message: hasil.pesan }, { status: 400 })
    }
    const bersih = hasil.patches

    // 🔴 PENJAGAAN KETERGANTUNGAN ANTAR-KOLOM — S#494, perintah Philips "perbaiki saklar Tampil".
    //   `saringPerubahan` di atas memeriksa tiap patch SENDIRI-SENDIRI; ia tidak bisa melihat
    //   bahwa mematikan satu kolom membunuh aturan kolom lain. Yang di bawah memeriksa keadaan
    //   AKHIR seluruh formulir, bukan potongan yang dikirim.
    //   ⚠️ `getFormFieldsUntukAdmin` sengaja TIDAK di-cache (temuan #109) ⇒ bahannya segar.
    const grupSekarang = await getFormFieldsUntukAdmin(form_key)
    const barisSekarang = grupSekarang.flatMap((g) => g.fields)

    // Setelan platform yang penjagaan pakai — DARI Config Registry, ⛔ bukan dari kode.
    //   ⛔ Setelan yang tidak terbaca TIDAK dianggap "lolos": penjaga yang bisa mati diam-diam
    //   lebih berbahaya daripada tidak ada penjaga. Dijawab 500 supaya ketahuan (lihat sebab
    //   per kunci di `form-field-penjagaan.service.ts`).
    const setelan = await bacaSetelanPenjagaan(form_key)
    if (!setelan.ok) {
      console.error(`[form-fields PATCH] Config "${setelan.kunci}" kosong atau tidak aktif`)
      return NextResponse.json({ success: false, message: setelan.pesan }, { status: 500 })
    }

    const galatKetergantungan = periksaKetergantungan(terapkanPatch(barisSekarang, bersih), setelan.setelan)
    if (galatKetergantungan) {
      return NextResponse.json({ success: false, message: galatKetergantungan }, { status: 400 })
    }

    for (const patch of bersih) {
      await FormFieldRegistryRepo_updateBaris(form_key, patch, uid)
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
