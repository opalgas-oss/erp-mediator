# Arsip pra-pemecahan — S#497

`lib/utils/form-field-ketergantungan.util.ts` **byte-exact sebelum dipecah**, disimpan
sesuai ATURAN 23. Ukuran saat diarsipkan: **7.565 B = 73,9% plafon kode 10.240 B**
(ambang tindakan 8.192 B — sisa 627 B).

## Sebab pemecahan — DIUKUR, bukan dirasa (ATURAN 50/53 + 54.2/54.4)
Aturan **R4** (butir 2 pada urutan `KERJA_SESI_495_REKOMENDASI.md` §7.2) pasti menyentuh
berkas ini. Dirakit utuh, R4 + kunci Config-nya membawa berkas ini melewati ambang tindakan.
⇒ dipecah LEBIH DULU sebagai commit tersendiri, ⛔ bukan ditumpuki. Pola yang sama dipakai
S#496 pada `vendor-register.service.ts` (K11, `f2b9ea5`).

## Sumbu pemecahan = ALASAN BERUBAH
| Berubah ketika… | Rumah barunya |
|---|---|
| bentuk BARIS / PATCH berubah | `lib/types/form-field-ketergantungan.types.ts` |
| kosakata tipe kolom / arti "HIDUP" berubah | `lib/utils/form-field-ketergantungan.dasar.ts` |
| ATURAN baru lahir (R4, R5, …) | `lib/utils/form-field-ketergantungan.aturan.ts` |
| cara memanggil penjagaan berubah | induk `form-field-ketergantungan.util.ts` |

## Bukti nol perubahan perilaku
- Isi dipindah **MEKANIS oleh program** — nol karakter diketik ulang.
- **Uji balik byte-identik LULUS** untuk kesembilan potongan pindahan.
- **23 uji `form-field-ketergantungan.util.test.ts` yang ADA — nol disunting — LULUS**
  terhadap berkas hasil pemecahan (23/23), sama persis dengan baseline terhadap berkas asal.
  Itu sekaligus bukti **ATURAN 5**: seluruh jalur impor lama masih sah.
- `tsc --noEmit` mode `strict`: nol galat pada keempat berkas.
