# CATATAN ARSIP — provider-tester.ts (pre S#218 resend handler)
# Kondisi: 8 case tersedia (supabase, upstash, cloudinary, xendit, fonnte, typesense, cloudflare, smtp)
# Tidak ada case 'resend' — default fallback: "Provider tidak dikenali"
# Perubahan S#218: tambah testResend() + case 'resend' di switch
# Rollback: hapus fungsi testResend + hapus case 'resend' dari switch
