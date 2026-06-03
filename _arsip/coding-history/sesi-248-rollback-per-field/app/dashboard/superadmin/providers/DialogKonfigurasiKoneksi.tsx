// ARSIP PRA-ROLLBACK S#248 — DialogKonfigurasiKoneksi.tsx
// Kondisi saat commit 622d7b7, sebelum rollback S#248
// Dibuat arsip: S#248 — 3 Juni 2026 (ATURAN 12/37)
//
// BAGIAN YANG AKAN DIHAPUS SAAT ROLLBACK:
//   state: fdsAll, setFdsAll
//   state: togglingId, setTogglingId
//   Di loadData Promise.all: fetch field-defs/all + if (fdsAllRes.success) setFdsAll(fdsAllRes.data)
//   handler onToggleIsAktif (useCallback)
//   Di DialogKonfigBody props: fdsAll={fdsAll} onToggleIsAktif={onToggleIsAktif} togglingId={togglingId}
