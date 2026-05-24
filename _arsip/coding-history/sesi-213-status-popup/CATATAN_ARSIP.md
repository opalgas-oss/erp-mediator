# Arsip Sesi #213 — HUTANG-LOGIN-STATUS-POPUP
# Tanggal: 24 Mei 2026
# Task: Pop-up informatif login berdasarkan register_status + lifecycle_status

## File yang diubah S#213

| File | Perubahan |
|---|---|
| `app/login/actions.ts` | Tambah `statusDetail` ke LoginActionResult + logika fetch email kontak di 3 jalur |
| `lib/hooks/useLoginFlow.ts` | Tambah state `statusPopup` + handle `result.statusDetail` di handleLogin |
| `app/login/page.tsx` | Import + render StatusRegistrasiModal |
| `app/login/components/StatusRegistrasiModal.tsx` | FILE BARU — komponen modal pop-up |

## Snapshot pre-edit

Versi pre-edit tersedia via: `git show 66bdd5b:<path-file>`
Commit terakhir sebelum S#213: 66bdd5b (fix vendor layout fallback)

## Ringkasan logika yang ditambah

### actions.ts
- `LoginActionResult` + field `statusDetail?: { register_status, lifecycle_status, email_kontak, pesan_key }`
- Vendor sub-path 1 (JWT claims): return statusDetail saat vendorStatus !== 'APPROVED'
- Vendor sub-path 2 (DB query): SELECT tambah lifecycle_status + return statusDetail
- Admin Tenant: tambah cek register_status + lifecycle_status sebelum OTP flow

### useLoginFlow.ts  
- State baru: `statusPopup`
- handleLogin: jika `result.statusDetail` ada → set statusPopup (tampil modal), bukan setError

### page.tsx
- Render `StatusRegistrasiModal` di luar semua conditional stage (always visible jika statusPopup != null)
