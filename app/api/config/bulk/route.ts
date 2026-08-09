// app/api/config/bulk/route.ts
// POST — Update banyak config_registry sekaligus via sp_bulk_update_config (atomic).
// Rollback semua jika ada satu item yang gagal.
// Menggantikan pola Promise.all multiple PATCH di ConfigPageClient.
//
// Dibuat: Sesi #097 — PL-S08 M1 Config & Policy Management
//
// TAMBAH Sesi #453 — #75 BUTIR 4b: `bulk` menulis KEY GERBANG tutup situs.
//   AKAR MASALAHNYA, dikunci S#452 dari pembacaan kode: penawar butir 4 dipasang di
//   `PATCH /api/config/[feature_key]` — endpoint yang TIDAK PERNAH dipanggil layar SA. Tombol
//   Simpan memakai berkas INI sejak S#097. Akibatnya `bulk` MENGHAPUS cache `config:api:sistem`
//   tetapi TIDAK PERNAH MENULIS `gate:site_closed` ⇒ pembaca Edge kehilangan KEDUA sumber ⇒
//   fail-OPEN ⇒ situs tetap terbuka padahal layar SA sudah bilang "berhasil disimpan".
//   ⇒ Menekan Simpan bukan sekadar gagal menutup; `redis.del` justru MEMBUKA situs yang tadinya
//   (kebetulan) tertutup oleh cache ber-TTL 600 detik. Itu sebabnya hasil TC terlihat acak.
//   Rumah lengkap + kutipan kodenya: `KERJA_SESI/KERJA_SESI_452/KERJA_SESI_452_AKAR_MASALAH_75.md`
//   (ATURAN 36 — DIRUJUK, tidak disalin).
//   Arsip byte-exact sebelum perubahan ini:
//   `_arsip/coding-history/sesi-453-gerbang-bulk/api-config-bulk-route.ts`
//   4.222 B · SHA-256 a3f6e2d362647dd346ba03ffaf33374e2a9b72ccb266d0a1f6866c65e51e8119

import { NextRequest, NextResponse }  from 'next/server'
import { revalidateTag }              from 'next/cache'
import { requireSuperAdmin }          from '@/lib/auth-server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { invalidateConfigCache }      from '@/lib/config-registry'
import { getRedisClient }             from '@/lib/redis'
// Nama key & policy_key diimpor dari SATU rumah — pembaca (middleware) dan penulis (berkas ini)
// DILARANG punya salinan string masing-masing (ATURAN 36 + anti-hardcode ATURAN 10).
import { KEY_GERBANG_TUTUP_SITUS, POLICY_KEY_TUTUP_SITUS } from '@/lib/situs-tertutup-edge'

// Tipe satu item update
interface UpdateItem {
  id:                   string    // uuid config_registry
  feature_key:          string    // fitur key grup, mis. 'security_login'
  nilai?:               string    // nilai baru (string) — opsional jika hanya ubah is_active/tenant_can_override
  is_active?:           boolean   // aktif/nonaktif item
  tenant_can_override?: boolean   // izin AdminTenant override config ini per-tenant
  // CATATAN: akses_ubah/akses_baca SENGAJA TIDAK ada di sini.
  // Kolom RLS ACL itu di-manage backend (seeder, AdminTenant override flow), bukan dari UI SuperAdmin.
  // Lihat KONSEP_BISNIS_PLATFORM.md.
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Autentikasi — hanya SUPERADMIN (pakai requireSuperAdmin, FIX: role lowercase ATURAN 41)
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res
    const uid = auth.uid

    // Validasi payload
    const payload = await request.json() as { updates?: unknown }
    if (!Array.isArray(payload.updates) || payload.updates.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Field updates wajib berupa array dan tidak boleh kosong' },
        { status: 400 }
      )
    }

    const updates = payload.updates as UpdateItem[]

    // Validasi setiap item — minimal harus punya id + feature_key
    for (const item of updates) {
      if (!item.id || !item.feature_key) {
        return NextResponse.json(
          { success: false, message: 'Setiap item wajib punya id dan feature_key' },
          { status: 400 }
        )
      }
      if (item.nilai === undefined && item.is_active === undefined && item.tenant_can_override === undefined) {
        return NextResponse.json(
          { success: false, message: 'Setiap item wajib mengubah minimal satu field (nilai / is_active / tenant_can_override)' },
          { status: 400 }
        )
      }
    }

    // Panggil sp_bulk_update_config — atomic: rollback semua kalau ada yang gagal
    const db = await createServerSupabaseClient()
    const { data, error } = await db.rpc('sp_bulk_update_config', {
      p_updates:  updates,
      p_oleh_uid: uid,
    })

    if (error) {
      console.error('[POST /api/config/bulk] SP error:', error.message)
      return NextResponse.json(
        { success: false, message: 'Gagal menyimpan konfigurasi: ' + error.message },
        { status: 500 }
      )
    }

    // ─── #75 BUTIR 4b (S#453) — cari tahu apakah baris saklar tutup situs ikut tersimpan ──────
    // KENAPA SATU `SELECT` TAMBAHAN, bukan memakai hasil RPC: `sp_bulk_update_config` ber-
    // `RETURNS jsonb` dan satu-satunya nilai yang ia pulangkan adalah
    // `{ "berhasil": true, "jumlah": <panjang array masuk> }` — NOL baris data, NOL kolom
    // `config_registry` (definisi live dibaca S#453 lewat `pg_get_functiondef`, T-453-2).
    // Payload masuk pun hanya `id` + `feature_key` + `nilai?` + `is_active?` +
    // `tenant_can_override?`. ⇒ tanpa `SELECT` ini berkas ini TIDAK PERNAH TAHU `policy_key`
    // baris yang barusan diubah, dan tidak bisa memutuskan apakah key gerbang perlu ditulis.
    // Penanda barisnya WAJIB `policy_key`, BUKAN `label` — label bisa diubah SA dari layar
    // (T-451-4; pola sama dengan `cariNilaiSaklar()` di lib/situs-tertutup-edge.ts).
    // ⚠️ `jumlah` dari RPC BUKAN bukti keberhasilan: ia panjang array masuk, bukan jumlah baris
    //    yang benar-benar ter-update. Karena itu posisi saklar dibaca ULANG dari tabel, bukan
    //    disimpulkan dari payload yang dikirim layar.
    const idTersimpan = updates.map((u) => u.id)
    const { data: barisTersimpan, error: errBaris } = await db
      .from('config_registry')
      .select('policy_key, nilai')
      .in('id', idTersimpan)

    if (errBaris) {
      // BUKAN alasan menggagalkan permintaan: data sudah tersimpan benar oleh RPC di atas.
      // Yang hilang hanya kemampuan menyalurkannya ke gerbang — dan itu WAJIB terdengar.
      console.error('[POST /api/config/bulk] Baca balik policy_key GAGAL:', errBaris.message)
    }

    // Bentuk `[0] as ... | undefined` SENGAJA sama dengan yang sudah lulus build di
    // `PATCH /api/config/[feature_key]` (S#451) — bukan gaya baru yang belum pernah dikompilasi.
    const barisSaklar = (barisTersimpan ?? []).filter(
      (b) => (b as { policy_key?: string | null }).policy_key === POLICY_KEY_TUTUP_SITUS
    )[0] as { policy_key?: string | null; nilai?: string | null } | undefined

    // Invalidasi cache untuk semua feature_key yang diupdate
    const featureKeys = [...new Set(updates.map((u) => u.feature_key))]

    for (const fk of featureKeys) {
      // Module-level Map cache di config-registry.ts
      invalidateConfigCache(fk)

      // Next.js server cache
      revalidateTag(`config:${fk}`, 'default')
    }

    // Cache tag global
    revalidateTag('config', 'default')
    revalidateTag('sidebar-data', 'default')

    // Redis L1 cache — DAN key gerbang #75, di MOMEN YANG SAMA (butir 4b, S#453)
    const redis = await getRedisClient()
    if (redis) {
      // 🔴 URUTANNYA MENGIKAT: key gerbang ditulis LEBIH DULU, cache dihapus SESUDAHNYA.
      //   Dibalik, ada celah beberapa milidetik ketika cache sudah hilang tetapi key gerbang
      //   belum ada ⇒ pembaca Edge miss ⇒ fail-OPEN ⇒ situs sempat terbuka padahal SA baru saja
      //   menutupnya. Celah itu persis penyakit yang butir 4b ada untuk menutupnya.
      if (barisSaklar) {
        try {
          // ⛔ SENGAJA TANPA TTL (T-451-3). Key ini POSISI SAKLAR, bukan cache. Kalau ia
          //   kedaluwarsa sendiri, pembaca Edge miss ⇒ fail-OPEN ⇒ situs MEMBUKA DIRINYA SENDIRI
          //   tanpa ada yang menyentuh saklarnya. Ia hanya berubah saat SA menekan Simpan lagi.
          await redis.set(KEY_GERBANG_TUTUP_SITUS, String(barisSaklar.nilai ?? 'false'))
        } catch (redisErr) {
          // console.error, bukan warn: kegagalan di sini berarti saklar TIDAK berlaku walau layar
          // SA bilang tersimpan. Sumber kebenaran (config_registry) sudah benar; yang gagal
          // adalah penyalurannya ke gerbang — dan itu wajib meninggalkan jejak.
          console.error('[POST /api/config/bulk] Tulis key gerbang tutup situs GAGAL:', redisErr)
        }
      }

      try {
        await Promise.all(
          featureKeys.map((fk) => redis.del(`config:api:${fk}`))
        )
      } catch (redisErr) {
        console.warn('[POST /api/config/bulk] Redis del gagal:', redisErr)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Konfigurasi berhasil disimpan',
      data,
    })

  } catch (error) {
    console.error('[POST /api/config/bulk] Error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
