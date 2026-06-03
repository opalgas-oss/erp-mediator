// ARSIP PRA-ROLLBACK S#248 — credential.service.ts
// Kondisi saat commit 622d7b7 (setelah S#247, sebelum rollback S#248)
// File asli: lib/services/credential.service.ts
// Berisi: listFieldDefsAll + toggleFieldDefIsAktif + import updateFieldDefIsAktif + getFieldDefinitionsAll
// Dibuat arsip: S#248 — 3 Juni 2026 (ATURAN 12/37)
//
// BAGIAN YANG AKAN DIHAPUS SAAT ROLLBACK:
//   import getFieldDefinitionsAll, updateFieldDefIsAktif dari repository
//   fungsi listFieldDefsAll()
//   fungsi toggleFieldDefIsAktif()
