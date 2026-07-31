# INDEX_TENANT_DAN_DASHBOARD_SA.md
# Arsip Coding History — Tenant, kategori/area, dan halaman Dashboard SA di luar monitoring
# Lokasi: _arsip/coding-history/INDEX_TENANT_DAN_DASHBOARD_SA.md
# Induk navigasi: _arsip/coding-history/INDEX.md — JANGAN tulis entri di induk (ATURAN 36)
# Lahir: Sesi #427 — 31 Juli 2026, pemecahan INDEX.md 42.653 B (104,1% ambang 40.960 B) atas keputusan Philips K-427-1.
#   Sumbu pemecahan = KLASTER FITUR/MODUL, bukan urutan waktu. Alasan: pertanyaan kerja yang nyata
#   adalah "berkas yang mau saya sentuh ini pernah diarsip di mana?", dan waktu tidak menjawab itu.
#   Baris entri dipindah MEKANIS byte-exact dari salinan ber-checksum — nol karakter diketik ulang.
#
# DIKERJAKAN SETELAH: _arsip/coding-history/INDEX.md (induk navigasi)
# NEXT SETELAH INI:   folder snapshot yang disebut di baris entri
# BLOCKER:            Tidak ada

## GUNA FILE INI
Arsip yang menyentuh tenant, penugasan kategori/area, struktur biaya, dan halaman detail tenant di Dashboard SA.

| Tanggal | Sesi | Keterangan |
|---|---|---|
| **27 Juni 2026** | **S#319** | **Fee Structure Engine TAHAP 1+2 selesai. DB migration + 11 fungsi terdaftar cr_functions. Shared_Database/Schema_Tenant.md + Schema_Config.md diupdate (ATURAN 27).** |
| **8 Juli 2026** | **S#335** | **Snapshot `sesi-335-bug-kategori-overlap` dibuat. BUG-KATEGORI-OVERLAP: arsip tenant-category-assignment.repository.ts pra-fix. Root cause: sp_assign_category_to_tenant guard hanya cek "ada tenant lain pegang kategori" tanpa cek overlap area. Fix: DROP SP 6-param lama, CREATE SP 7-param baru dengan p_city_entries JSONB + 4-skenario overlap check via assignment_coverage_areas. Repository diupdate untuk teruskan coverage_area_entries sebagai p_city_entries. Shared_Database/Functions_StoredProcedures.md diupdate (ATURAN 27). Arsip: 1 file (tenant-category-assignment.repository.ts).** |
| **8 Juli 2026** | **S#335** | **Snapshot `sesi-335-bug-kategori-overlap` diupdate (+1 file arsip). FIX ProvinceRepo_getWithExclusion: hapus .neq tenant_id sehingga area yang sudah dipegang tenant sendiri juga di-disable di dialog assign. globallyTaken tetap hanya trigger jika tenant LAIN yang pegang Seluruh Indonesia. Arsip: province.repository.ts.** |
| **22 Juli 2026** | **S#397** | **Snapshot `sesi-397-fix-user-count-stale-comments` dibuat (arsip FLAT bukan mirror — keterbatasan tool bridge: write_file tak buat parent dir + create_directory tak nested + path `[id]`; peta path di _MAP_PATHS.md). FIX (perintah Philips, sesi denah dikonversi coding): (1) used=0 hardcode TabUserTenant → jumlah user aktif NYATA (prop `used`; page.tsx fetch via MembershipService_listMemberships reuse, DRY — tanpa fungsi/registry baru); TenantDetailClient quickStats.user_aktif 0→count + prop activeUserCount. (2) komentar stale "menunggu M8"/"menunggu M1" dibersihkan (M8 SELESAI S#136, M1 SELESAI S#097 — verifikasi PL-S08/MODUL + kapabilitas DB user_memberships/config_registry). (3) dead prop tenantId dibuang → TabUserTenant {tier,used}. (4) TIER_INFO growth 20→15 (samakan spec Mockup_07 + quickStats; kroscek live: tak ada sumber DB kuota per-tier). Build PASS S#397 (Compiled 37.9s + TS 12.1s). TD-P05e2-2/-3 RESOLVED code; TD-P05e2-1 RESOLVED (align 15); TD-P05b-1 partial. Arsip: 4 file (page.tsx, TenantDetailClient.tsx, TabUserTenant.tsx, TabOverrideConfig.tsx) + _MAP_PATHS.md. Rollback: git checkout atau salin dari folder arsip.** |
