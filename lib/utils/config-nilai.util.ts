// lib/utils/config-nilai.util.ts
// Penerjemah nilai `config_registry` — `nilai` di tabel SELALU string, cast di kode.
// Lahir S#498 dari pemecahan `lib/config-registry.ts`.
// 🟢 MURNI: nol Supabase, nol `server-only`, nol cache ⇒ bisa diuji tanpa jaringan.
// Sumbu: berkas ini berubah ketika ATURAN PENERJEMAHAN berubah, bukan ketika pembacaan berubah.
// ⛔ Isi di bawah dipindah MEKANIS oleh program — nol karakter diketik ulang.

// ─── FUNGSI 3: parseConfigNumber ─────────────────────────────────────────────
/**
 * Parse nilai string dari DB ke number dengan fallback aman.
 */
export function parseConfigNumber(nilai: string | null | undefined, fallback: number): number {
  if (nilai === null || nilai === undefined) return fallback
  const n = Number(nilai)
  return isNaN(n) ? fallback : n
}

// ─── FUNGSI 4: parseConfigBoolean ────────────────────────────────────────────
/**
 * Parse nilai string dari DB ke boolean dengan fallback aman.
 */
export function parseConfigBoolean(nilai: string | null | undefined, fallback: boolean): boolean {
  if (nilai === null || nilai === undefined) return fallback
  return nilai === 'true'
}

