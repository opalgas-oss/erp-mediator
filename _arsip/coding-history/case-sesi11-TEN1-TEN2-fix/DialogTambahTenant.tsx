// app/dashboard/superadmin/tenants/DialogTambahTenant.tsx — ARSIP pre-TEN1-TEN2-fix (CASE SESI-11, 8 Juni 2026)
// Perubahan: INIT + canSubmit + handleWaBlur + semua binding form pic_* → admintenant_*
//            Labels: "PIC pertama" → "AdminTenant pertama (Penanggung Jawab)"

// Bagian INIT (SEBELUM fix):
//   const INIT: BuatTenantPayload = {
//     ..., pic_name: '', pic_email: '', pic_wa: '',
//   }

// Bagian canSubmit (SEBELUM fix):
//   !!form.pic_name && !!form.pic_wa && !!form.pic_email

// Bagian handleWaBlur (SEBELUM fix):
//   set('pic_wa', autoCorrectWA(form.pic_wa))

// Input bindings (SEBELUM fix):
//   value={form.pic_name}, value={form.pic_wa}, value={form.pic_email}
//   onChange: set('pic_name',...), set('pic_wa',...), set('pic_email',...)

// Full file tetap ada di git. Snapshot ini untuk referensi rollback.
