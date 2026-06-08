// lib/services/tenant.service.ts — ARSIP pre-TEN1-TEN2-fix (CASE SESI-11, 8 Juni 2026)
// Perubahan: TenantService_create — input.pic_* → input.admintenant_*

// Bagian yang berubah di TenantService_create (sebelum fix):
//   validateNomorWa(input.pic_wa)                             ← lama
//   if (!input.pic_name.trim()) throw new Error(...)          ← lama
//   if (!input.pic_email.trim()) throw new Error(...)         ← lama
//   (sisa: tenantRepo_createWithPIC(input, createdBy) — tidak berubah)
//
// Full file tetap ada di git. Snapshot ini untuk referensi rollback bagian yang diubah.
