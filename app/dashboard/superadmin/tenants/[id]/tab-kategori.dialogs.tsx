// app/dashboard/superadmin/tenants/[id]/tab-kategori.dialogs.tsx
// Barrel re-export — semua dialog kebab TabKategori
// Dipecah Sesi #325 (30 KB → 5 file per dialog):
//   tab-kategori.dialog-helpers.tsx  — komponen + tipe shared
//   tab-kategori.dialog-override.tsx — DialogEditOverrideKomisi
//   tab-kategori.dialog-riwayat.tsx  — DialogRiwayatAssignment
//   tab-kategori.dialog-hentikan.tsx — DialogHentikanKategori
//   tab-kategori.dialog-lepas.tsx    — DialogLepasKategori

export type { BaseDialogProps }      from './tab-kategori.dialog-helpers'
export { DialogEditOverrideKomisi }  from './tab-kategori.dialog-override'
export { DialogRiwayatAssignment }   from './tab-kategori.dialog-riwayat'
export { DialogHentikanKategori }    from './tab-kategori.dialog-hentikan'
export { DialogLepasKategori }       from './tab-kategori.dialog-lepas'
