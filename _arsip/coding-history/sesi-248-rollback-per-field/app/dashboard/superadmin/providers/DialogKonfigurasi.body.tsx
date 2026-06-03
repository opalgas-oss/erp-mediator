// ARSIP PRA-ROLLBACK S#248 — DialogKonfigurasi.body.tsx
// Kondisi saat commit 622d7b7, sebelum rollback S#248
// Berisi: props fdsAll/onToggleIsAktif/togglingId di BodyProps + konsumsi FieldsSetup di JSX
// Dibuat arsip: S#248 — 3 Juni 2026 (ATURAN 12/37)

// BAGIAN YANG AKAN DIHAPUS SAAT ROLLBACK DI BodyProps:
//   fdsAll?:         ProviderFieldDef[]
//   onToggleIsAktif?:(fieldDefId: string, isAktif: boolean) => void
//   togglingId?:     string | null
//
// BAGIAN YANG AKAN DIHAPUS DI JSX DialogKonfigBody:
//   import FieldsSetup dari ./DialogKonfigurasi.fields
//   {fdsAll && fdsAll.length > 0 && onToggleIsAktif && (
//     <FieldsSetup ... />
//   )}
