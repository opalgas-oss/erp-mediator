# INDEX.md — Arsip Coding History (INDUK NAVIGASI)
# Lokasi: _arsip/coding-history/INDEX.md
# DIPECAH Sesi #427 — 31 Juli 2026, keputusan Philips K-427-1.
#   Sebab: berkas ini 42.653 B = 104,1% ambang rotasi 40.960 B (ATURAN 50.2) — sudah LEWAT ambang
#   sebelum entri S#426 ditulis. Sumbu pecah = KLASTER FITUR/MODUL, bukan urutan waktu.
#   43 baris entri dipindah MEKANIS byte-exact ke 6 sub-file; nol entri dibuang, nol karakter diketik ulang.
#   Arsip pra-pecah byte-exact: _arsip/coding-history/sesi-427-pecah-index/_arsip/coding-history/INDEX.md
#   (42.653 B, SHA-256 8d46354b…55220)
#
# DIKERJAKAN SETELAH: ATURAN 12 + 23 (arsip dibuat) 
# NEXT SETELAH INI:   sub-file klaster yang relevan dengan berkas yang sedang disentuh
# BLOCKER:            Tidak ada

---

## ATURAN PAKAI — WAJIB (supaya induk ini tetap tipis)

1. Entri snapshot BARU ditulis ke SUB-FILE klaster yang sesuai — **BUKAN ke berkas induk ini**.
2. Berkas ini = NAVIGASI saja. Entri yang muncul lagi di sini = pelanggaran → pindahkan.
3. Tiap sub-file WAJIB <30.720 B; ambang pecah lagi 80% = 24.576 B (ATURAN 50.2).
4. Klaster baru hanya dibuat kalau memang klaster kerja baru — bukan karena satu berkas terasa tidak muat.
5. ATURAN 23 tetap berlaku utuh: arsip + baris entri + berkas kode WAJIB ter-staged bertiga sebelum commit.

---

## PETA KLASTER — buka yang cocok dengan berkas yang mau disentuh

| Sub-file | Klaster | Buka sebelum menyentuh |
|---|---|---|
| `INDEX_LAPOR_GANGGUAN.md` | **AKTIF SEKARANG (K-424-5)** — lapor gangguan, maintenance, halaman error, direktori kontak tim | `app-error.*` · `team-contact.*` · `MaintenanceView` · `LaporGangguanButton` · `bug-mailto.util` · `wa-link.util` · util profil pelapor |
| `INDEX_ALERT_MESIN_DAN_ANTREAN.md` | Alert & Monitoring — mesin: service, repository, antrean, pengumpul metrik | `alert*.service.ts` · `alert*.repository.ts` · `alert-queue*` · `metrics-collector*` |
| `INDEX_ALERT_UI_DAN_KONFIGURASI.md` | Alert & Monitoring — tampilan SA, `config_registry`, `message_library` | halaman `settings/monitoring` · `ConfigItem*` · `AlertConfig*` · key config alert/monitoring |
| `INDEX_MENU_DAN_NAVIGASI.md` | Katalog menu, sidebar, guard anti-menu-yatim (ATURAN 49) | `SidebarNav.tsx` · `nav.constant.ts` · `menu-route.constant.ts` · `menu-catalog.guard.test.ts` |
| `INDEX_INFRA_DAN_KEAMANAN.md` | Infrastruktur bersama & keamanan | `lib/redis.ts` / `getRedisClient()` · generator OTP · berkas kunci akun |
| `INDEX_TENANT_DAN_DASHBOARD_SA.md` | Tenant, kategori/area, halaman Dashboard SA di luar monitoring | tenant · penugasan kategori/area · struktur biaya · detail tenant |

---

## SESI YANG MENGHASILKAN ARSIP TAPI TIDAK PUNYA ENTRI — HUTANG TERBUKA

Ditemukan dan dicatat terbuka, bukan didiamkan (entri S#424 sudah menandai dua yang pertama):

| Sesi | Keadaan |
|---|---|
| **S#412** | menghasilkan commit + arsip kode, **nol entri** di sini |
| **S#423** | EMPAT commit + folder `sesi-423-team-contacts-tahap-a`, **nol entri** di sini |
| **S#426** | folder `sesi-426-k424-5-profil-pelapor`, entri **DIISI S#427** ke `INDEX_LAPOR_GANGGUAN.md` |

⇒ bagian INDEX pada ATURAN 23 gagal ditegakkan TIGA sesi. S#427 melunasi S#426; S#412 dan S#423 masih terbuka.

---
*INDEX.md — induk navigasi. Dipecah S#427 (31 Juli 2026, K-427-1) dari berkas monolitik 42.653 B.*
