// lib/repositories/app-error-eskalasi.repository.ts
// KATEGORI: membaca SEBARAN pelapor pada satu gangguan — dasar email ESKALASI (K-425-2).
//
// Dibuat: Sesi #426.
//
// ═══ KENAPA BERKAS TERPISAH DARI `app-error.repository.ts` ═══════════════════════════════════
// Bukan karena ukuran. Kategorinya memang beda, dan itu terlihat dari arah kerjanya:
//   · `app-error.repository.ts`     MENULIS satu laporan + memutuskan ditahan atau tidak
//   · `app-error-eskalasi...` (ini) MEMBACA berapa banyak ORANG BERBEDA yang terdampak
// Keduanya juga berubah karena alasan yang berbeda: yang pertama berubah kalau aturan PENAHANAN
// berubah, yang ini berubah kalau aturan ESKALASI berubah. Menumpuknya jadi satu berkas berarti
// dua alasan perubahan tinggal di satu tempat — dan berkas pertama akan menembus batas 10 KB
// (CODING_RULES_AI ATURAN 9), lalu godaannya adalah memangkas komentar. Itu sudah dikoreksi
// Philips di sesi ini juga; pemecahan di sini dilakukan SEJAK AWAL supaya tidak terulang.
//
// ═══ MASALAH YANG DITUTUP: `TEMUAN-ESKALASI-TIDAK-ADA` (lahir S#424) ═════════════════════════
// Koreksi Philips S#424, verbatim: *"Berarti itu kamu pikir aplikasi yang kamu buat bukan untuk
// publik, tapi dibuat untuk dipakai hanya satu orang saja."*
// Sebelum ini: 1 orang melapor → 1 email; 5.000 orang melapor → TETAP 1 email yang sama. Tim
// Support tidak punya cara membedakan keluhan satu orang dari platform yang sedang tumbang.
// K-425-2 menjawabnya: hitung PELAPOR UNIK per gangguan, kirim email eskalasi saat menembus
// ambang bertingkat. Berkas ini menyediakan angkanya; keputusan mengirim ada di service.
//
// ═══ AREA RAWAN yang dijaga (Bug_Master) ═════════════════════════════════════════════════════
//   · NOL `catch {}` kosong (BUG-034 · BUG-038) — kegagalan WAJIB berbunyi.
//   · NOL subquery PostgREST (BUG-038) — PostgREST tidak punya `COUNT(DISTINCT ...)`; menghitung
//     keunikan dilakukan di sisi kode, bukan dengan menitipkan subquery ke filter. Persis pola
//     2-query yang sudah jadi standar proyek (mis. `membershipRepo_findAll`).

import 'server-only'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// ─── Batas baca ───────────────────────────────────────────────────────────────
/**
 * Batas jumlah baris yang ditarik untuk dihitung keunikannya.
 *
 * Ini BUKAN nilai bisnis, jadi bukan pelanggaran ATURAN 8 — ia batas teknis pembacaan, sejenis
 * `.limit()` di repository lain. Ambang eskalasi (nilai bisnis) tetap hidup di Config Registry
 * dan dibaca service, bukan di sini.
 *
 * Kalau batas ini tersentuh, jumlah nyata pelapor unik SUDAH pasti jauh melewati ambang tertinggi
 * mana pun yang masuk akal — jadi keputusan eskalasi tidak berubah. Yang berubah hanya ketepatan
 * angkanya, dan itu DILAPORKAN, bukan didiamkan (lihat `tercapaiBatas`).
 */
const BATAS_BARIS = 5000

// ─── Tipe ─────────────────────────────────────────────────────────────────────

export interface HasilHitungPelapor {
  /** Jumlah pelapor BERBEDA pada gangguan ini */
  jumlahUnik: number
  /** Jumlah baris kejadian yang terbaca (satu pelapor bisa punya lebih dari satu baris) */
  jumlahBaris: number
  /**
   * `true` = batas baca tersentuh, sehingga `jumlahUnik` adalah angka MINIMUM, bukan angka pasti.
   * Pemanggil WAJIB menyebutkan ini kalau menampilkan angkanya — dilarang menyajikan angka
   * terpotong seolah-olah angka pasti.
   */
  tercapaiBatas: boolean
}

// ─── appErrorRepo_hitungPelaporUnik ───────────────────────────────────────────
/**
 * Hitung berapa ORANG BERBEDA yang melaporkan satu gangguan yang sama (K-425-2).
 *
 * Keunikan dihitung dari `sidik_profil` — penanda PELAPOR, bukan penanda kejadian. Satu orang
 * yang mengklik lima kali tetap dihitung SATU; lima orang berbeda dihitung LIMA. Itulah angka
 * yang membedakan keluhan perorangan dari gangguan massal.
 *
 * ⚠️ **TIDAK ADA FILTER STATUS DI SINI — DISENGAJA, DAN SAYA SEBUT AKIBATNYA.**
 * Perintah K-425-2 berbunyi `count(DISTINCT sidik_profil)` per `insiden_key` — titik. Ia tidak
 * menyebut penyaringan apa pun. Menambahkan `.neq('status','SELESAI')` di sini berarti Claude
 * memasukkan aturan yang tidak pernah diperintahkan — persis kesalahan yang dikoreksi Philips di
 * S#425 (jendela waktu yang tidak pernah diminta). Jadi tidak ditambahkan.
 *
 * **Akibat yang harus diketahui Philips:** kalau sebuah gangguan pernah ditutup `SELESAI` lalu
 * KAMBUH, pelapor lama ikut terhitung, sehingga ambang eskalasi bisa tersentuh lebih cepat pada
 * kekambuhan. Ini keputusan scope, bukan keputusan teknis — kalau Philips menghendaki hitungan
 * hanya untuk gangguan yang sedang terbuka, filternya ditambahkan atas perintahnya, tertulis.
 *
 * @param insidenKey - penanda gangguan, dari `buatInsidenKey()`
 */
export async function appErrorRepo_hitungPelaporUnik(
  insidenKey: string
): Promise<HasilHitungPelapor> {
  const db = createServerSupabaseClient()

  // Filter DATAR — nol subquery PostgREST (BUG-038).
  // Ditopang index `idx_app_error_log_insiden` (insiden_key, sidik_profil) dari S#425.
  const { data, error } = await db
    .from('app_error_log')
    .select('sidik_profil')
    .eq('insiden_key', insidenKey)
    .limit(BATAS_BARIS)

  if (error) {
    throw new Error(`appErrorRepo_hitungPelaporUnik gagal membaca sebaran: ${error.message}`)
  }

  const baris = data ?? []
  const unik  = new Set<string>()

  for (const b of baris) {
    if (b.sidik_profil) unik.add(b.sidik_profil)
  }

  const tercapaiBatas = baris.length >= BATAS_BARIS

  if (tercapaiBatas) {
    // WAJIB berbunyi. Pemotongan yang senyap membuat angka terlihat pasti padahal minimum —
    // dan angka yang berbohong lebih berbahaya daripada angka yang tidak ada.
    console.warn(
      `[appErrorRepo_hitungPelaporUnik] batas baca ${BATAS_BARIS} tersentuh untuk insiden_key=` +
      `${insidenKey}. jumlahUnik=${unik.size} adalah angka MINIMUM, bukan angka pasti.`
    )
  }

  return {
    jumlahUnik:  unik.size,
    jumlahBaris: baris.length,
    tercapaiBatas,
  }
}
