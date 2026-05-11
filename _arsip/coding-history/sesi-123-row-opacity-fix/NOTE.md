# Arsip S#123 — Fix Row Opacity Mengaburkan Tombol Aksi

## File diubah
- `app/dashboard/superadmin/dropdowns/DropdownGroupsTable.tsx`

## Masalah
Sebelum fix, `<TableRow>` punya class `opacity-50` saat `!grup.is_active`. CSS opacity
diturunkan ke semua child — termasuk tombol aksi (Pemetaan, Edit, Nonaktifkan, Hapus).

Akibat: tombol Hapus untuk grup Nonaktif (mis. test_grup_baru) yang sebenarnya
verdict-nya AMAN (= className `text-red-400`) jadi **terlihat pink/grey-pucat** saat
dilihat user. User mengira tombol disabled padahal sebenarnya aktif dan bisa diklik.

CSS limitation: child element TIDAK BISA "escape" parent opacity dengan set
`opacity-100`. Opacity inheritance via CSS bekerja secara visual rendering.

## Fix
Pindahkan `opacity-50` dari `<TableRow>` ke cell-cell data spesifik saja:
- TableCell chevron, slug, display_name, category, opsi count, tenant_override, status badge
- Action cell (tombol-tombol) dibiarkan tanpa opacity

Hasil: visual indikator "row faded" tetap untuk data, tapi tombol aksi tetap
pada brightness penuh sehingga state aktif/disabled-nya terlihat jelas.

## Alasan tidak hapus opacity sama sekali
Badge "Nonaktif" memang sudah indikator status, tapi opacity-50 pada data cells
memberi visual cue tambahan bahwa baris ini "background" — membantu mata user
fokus ke baris aktif. Yang penting cuma: tombol aksi tidak ikut faded.
