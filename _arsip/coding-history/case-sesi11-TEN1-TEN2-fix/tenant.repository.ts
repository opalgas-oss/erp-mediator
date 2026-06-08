// lib/repositories/tenant.repository.ts — ARSIP pre-TEN1-TEN2-fix (CASE SESI-11, 8 Juni 2026)
// Perubahan 1: tenantRepo_create — lifecycle_status 'pending'→'in_registration' + hapus pic_* fields
// Perubahan 2: tenantRepo_createWithPIC — rewrite stop call SP broken, pakai tenantRepo_create + sp_tambah_admintenant

// Bagian tenantRepo_create (SEBELUM fix):
//   pic_name:    payload.pic_name,    // kolom TIDAK ADA (renamed K-18)
//   pic_email:   payload.pic_email,   // kolom TIDAK ADA
//   pic_wa:      payload.pic_wa,      // kolom TIDAK ADA
//   lifecycle_status: 'pending',      // SALAH — harusnya 'in_registration'
//   register_status: 'pending',       // benar

// Bagian tenantRepo_createWithPIC (SEBELUM fix):
//   await db.rpc('sp_create_tenant_with_pic', { ... pic_name/email/wa ... })
//   → SP BROKEN: referensi kolom 'status', 'pic_name/email/wa', 'tipe_pic' sudah di-DROP/RENAMED

// Full file tetap ada di git. Snapshot ini untuk referensi rollback.
