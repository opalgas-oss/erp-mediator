// components/DashboardHeader.tsx — ARSIP Sesi #079 sebelum DRY refactor
// Isu: getCookie didefinisikan inline di file ini (duplikat)
// Lihat: _arsip/coding-history/sesi-079-dry-fix/

// [isi asli tercopy dari pembacaan MCP — file aktual ada di components/DashboardHeader.tsx]
// getCookie inline di baris ~29: function getCookie(name: string): string { ... }
// Akan di-replace dengan import dari lib/utils-client.ts
