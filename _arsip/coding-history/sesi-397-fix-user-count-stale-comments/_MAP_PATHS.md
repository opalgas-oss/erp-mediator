# Arsip Sesi #397 — FIX user-count + komentar stale (perintah Philips)
# Tanggal: 22 Juli 2026
# Snapshot PRA-EDIT (original sebelum perubahan S#397).

## Catatan struktur
Arsip ini disimpan FLAT (bukan mirror path) karena keterbatasan tool bridge
(write_file tak buat parent dir; create_directory tak nested; path bracket `[id]`
bikin friksi). Semua nama file unik. Path asal tiap file di bawah.

## Peta file → path asal (semua di repo erp-mediator)

| File arsip (flat) | Path asal |
|---|---|
| page.tsx | app/dashboard/superadmin/tenants/[id]/page.tsx |
| TenantDetailClient.tsx | app/dashboard/superadmin/tenants/[id]/TenantDetailClient.tsx |
| TabUserTenant.tsx | app/dashboard/superadmin/tenants/[id]/TabUserTenant.tsx |
| TabOverrideConfig.tsx | app/dashboard/superadmin/tenants/[id]/TabOverrideConfig.tsx |

## Perubahan S#397 (yang diarsip di sini = SEBELUM perubahan)
- page.tsx: + fetch MembershipService_listMemberships (count user aktif) + prop activeUserCount.
- TenantDetailClient.tsx: Props +activeUserCount; quickStats.user_aktif 0→activeUserCount; TabUserTenant call drop tenantId +used.
- TabUserTenant.tsx: Props {tenantId,tier}→{tier,used}; hapus hardcode used=0; TIER_INFO growth 20→15 (samakan spec Mockup_07+quickStats); komentar M8; teks placeholder.
- TabOverrideConfig.tsx: komentar M1 (stale dibersihkan) + teks placeholder.

## Rollback
Byte-exact: `git checkout -- "app/dashboard/superadmin/tenants/[id]/"` (4 file), ATAU salin file di folder ini ke path asal masing-masing.
