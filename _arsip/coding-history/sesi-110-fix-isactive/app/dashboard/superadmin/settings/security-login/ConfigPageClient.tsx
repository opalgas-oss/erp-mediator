// ARSIP S#110-fix-isactive — sebelum tambah enabled ke detectHasChanges + handleSave
// Bug: detectHasChanges tidak cek item.enabled, handleSave tidak kirim is_active
// Versi ini punya bug bahwa toggle Aktif tidak bisa disimpan ke DB
