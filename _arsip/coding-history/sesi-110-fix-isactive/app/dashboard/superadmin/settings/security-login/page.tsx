// ARSIP S#110-fix-isactive — sebelum hapus filter .eq('is_active', true)
// Versi ini adalah BUGGY — SuperAdmin tidak bisa lihat item yang is_active=false
export const dynamic = 'force-dynamic'
// ... isi sama dengan versi di page.tsx sebelum fix S#110
// Bug ada di baris: .eq('is_active', true)
