# Arsip byte-exact — pemecahan KEDUA `vendor-register.service.ts` (Sesi #496)

Isi folder ini = salinan APA ADANYA sebelum pemecahan, untuk rollback.

| Berkas | Ukuran sebelum | Sesudah |
|---|---|---|
| `vendor-register.service.ts` | **8.183 B = 79,9%** plafon kode 10.240 B — **sisa 9 BYTE** ke ambang tindakan 8.192 B | 5.188 B = 50,7% |
| `vendor-register.types.ts` | 2.119 B = 20,7% | 2.918 B = 28,5% |
| `vendor-register.persiapan.ts` | — (lahir S#496) | **4.864 B = 47,5%** — di bawah batas berkas-lahir 50% (ATURAN 54.3) |

**Sebab:** SPEK_UNGGAH_BERKAS_REGISTER_VENDOR K11 — pemeriksaan magic bytes mendarat di alur
submit ⇒ berkas ini PASTI tersentuh. Dipecah LEBIH DULU sebagai commit tersendiri (ATURAN 53.1),
⛔ bukan ditumpuki.

**Sumbu = ALASAN BERUBAH:** apa yang DIPERIKSA & DITETAPKAN → `.persiapan.ts` ·
URUTAN TULIS + PEMULIHAN tetap di induk. (S#492 sudah memakai sumbu yang sama:
DIRENDER → `.susunan.ts` · DIREKAM → `.rekaman.ts`.)

**NOL perubahan perilaku.** Isi dipindah MEKANIS oleh program — nol karakter diketik ulang.
**Uji balik byte-identik LULUS:** langkah 1–5b (3.206 B) · langkah 6+rollback (1.952 B) ·
baris ambil susunan (65 B) · JSDoc+tanda tangan (508 B) — keempatnya hadir utuh di berkas tujuan.
**Jalur impor lama tetap sah** — `daftarVendor`, `getSusunanFormulirVendor`, `kelompokkanKolom`,
`FEATURE_KEY_VENDOR`, `GagalPendaftaran` semuanya masih diekspor dari `.service.ts` (ATURAN 5).
Pemanggil (`app/api/auth/vendor-register/route.ts`, `app/register/page.tsx`) **NOL disentuh**.
