// ARSIP BEFORE — S#309 FIX embed FK ambiguous
// Snapshot category.repository.ts SEBELUM fix join tenants disambiguation
// Bug: tenant_category_assignments punya 2 FK ke tenants (tenant_id + handover_to_tenant_id)
//      → embed `tenants(nama_brand)` ambigu → null → total_tenants selalu 0
// Disimpan: 23 Juni 2026 — Sesi #309
//
// === ISI ASLI (baris query yang bermasalah) ===
//   const { data: assigns } = await db
//     .from('tenant_category_assignments')
//     .select('category_id, tenants(nama_brand)')   <-- AMBIGU
//     .in('category_id', ids)
//     .eq('status', 'active')
//     .is('deleted_at', null)
