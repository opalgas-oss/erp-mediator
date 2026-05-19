// ARSIP PRE-FIX S#183 — verify-otp tenant_id min(1) menolak SA empty string
// Original: app/api/auth/verify-otp/route.ts
// Bug: tenant_id: z.string().min(1) → SA tenantId='' ditolak → "Kode OTP salah"
// Fix: hapus min(1) → z.string() konsisten dengan send-otp route
// tenant_id: z.string().min(1, 'tenant_id wajib diisi'),  // SEBELUM
// tenant_id: z.string(),                                    // SESUDAH
