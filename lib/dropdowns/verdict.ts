// lib/dropdowns/verdict.ts
// Single source of truth untuk logika "boleh dihapus?" di Master Dropdown.
//
// ARSITEKTUR — mengapa file ini ada:
//   S#114–S#124 terbukti bahwa verdict tersebar di 4 tempat (Client/Table/List/Hook)
//   = inkonsistensi bergantian, whack-a-mole bug selama 10 sesi.
//   Solusi: satu file pure functions + discriminated union.
//   View layer HANYA consume verdict — tidak pernah compute sendiri.
//
// URUTAN CHECK getOptionVerdict (paling restrictive dulu):
//   1. Opsi default grup → blocked-default (amber) — blokir hapus OPSI saja
//   2. dep AKTIF ada → blocked-in-use (merah)
//   3. dep DIBANGUN atau TIDAK_DIPAKAI ada → blocked-building (amber)
//   4. Sisanya (0 dep / RENCANA only) → safe (hijau)
//
// URUTAN CHECK getGroupVerdict (S#127 — fix deadlock logic):
//   1. Grup kosong + 0 dep → safe-empty
//   2. Rollup: ada opsi dengan dep AKTIF/DIBANGUN → rollup-blocked
//   3. Sisanya (termasuk grup punya default) → safe-empty
//   CATATAN: blocked-default TIDAK memblokir GROUP (hanya blokir hapus opsi sendiri).
//   Hapus group = cascade delete semua opsi termasuk yang default. Ini valid dan benar.
//
// Dibuat: Sesi #125 — Layer 1 Refactor Verdict (RENCANA_REFACTOR_DROPDOWN_v1.md)
// Update: Sesi #127 — Fix getGroupVerdict (hapus has-default-option deadlock)

import type { GrupDenganOpsi, MasterDropdownOption } from '@/lib/types/master-dropdown.types'
import type { SafetyStatusResult }                   from '@/lib/types/usage-tracking.types'

// ─── Discriminated Union: OptionVerdict ───────────────────────────────────────

export type OptionVerdict =
  | {
      kind:        'safe'
      severity:    'success'
      action:      'delete'
      title:       string
      description: string
    }
  | {
      kind:        'blocked-default'
      severity:    'warning'
      action:      'disabled'
      title:       string
      description: string
      remediation: string
    }
  | {
      kind:        'blocked-in-use'
      severity:    'danger'
      action:      'disabled'
      title:       string
      description: string
      dependents:  Array<{ module: string; usage: string }>
    }
  | {
      kind:            'blocked-building'
      severity:        'warning'
      action:          'disabled'
      title:           string
      description:     string
      buildingModules: string[]
    }

// ─── Discriminated Union: GroupVerdict ────────────────────────────────────────

// CATATAN: `has-default-option` dipertahankan di type untuk backward compat
// tapi TIDAK lagi di-return oleh getGroupVerdict (S#127 fix).
export type GroupVerdict =
  | {
      kind:        'safe-empty'
      severity:    'success'
      action:      'delete'
      title:       string
      description: string
    }
  | {
      kind:        'has-default-option'
      severity:    'warning'
      action:      'disabled'
      title:       string
      description: string
      remediation: string
    }
  | {
      kind:        'rollup-blocked'
      severity:    'danger' | 'warning'
      action:      'disabled'
      title:       string
      description: string
      offenders:   OptionVerdict[]
    }

// ─── Severity Palette ────────────────────────────────────────────────────────

export const SEVERITY_PALETTE = {
  success: {
    container: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    icon:      '\u2713',
    label:     'Aman',
  },
  warning: {
    container: 'bg-amber-50 border-amber-200 text-amber-900',
    icon:      '\u26a0',
    label:     'Perhatian',
  },
  danger: {
    container: 'bg-red-50 border-red-200 text-red-900',
    icon:      '\u2715',
    label:     'Diblokir',
  },
} as const

// ─── Pure Function: getOptionVerdict ─────────────────────────────────────────

export function getOptionVerdict(
  option:       MasterDropdownOption,
  _group:       GrupDenganOpsi,
  safetyStatus: SafetyStatusResult | null,
): OptionVerdict {

  // Priority 1: dep AKTIF — paling kritis (production impact)
  // CEK SEBELUM is_default karena dep AKTIF lebih penting untuk
  // surfacing ke group rollup. Opsi default + dep AKTIF = show 'blocked-in-use'.
  if (safetyStatus && safetyStatus.count_aktif > 0) {
    return {
      kind:        'blocked-in-use',
      severity:    'danger',
      action:      'disabled',
      title:       'Sedang dipakai',
      description: `Opsi ini digunakan oleh ${safetyStatus.count_aktif} modul aktif. Menghapus akan merusak data user.`,
      dependents:  [],
    }
  }

  // Priority 2: dep DIBANGUN atau TIDAK_DIPAKAI
  // CEK SEBELUM is_default agar group rollup bisa deteksi
  if (safetyStatus && (safetyStatus.count_dibangun > 0 || safetyStatus.count_tidak_dipakai > 0)) {
    const totalBlocking = safetyStatus.count_dibangun + safetyStatus.count_tidak_dipakai
    return {
      kind:            'blocked-building',
      severity:        'warning',
      action:          'disabled',
      title:           'Ada di kode / data lama tersimpan',
      description:     `${totalBlocking} modul masih referensikan opsi ini (DIBANGUN: ${safetyStatus.count_dibangun}, data lama: ${safetyStatus.count_tidak_dipakai}).`,
      buildingModules: [],
    }
  }

  // Priority 3: Opsi default (hanya jika tidak punya dep AKTIF/DIBANGUN)
  // Opsi default tidak boleh dihapus karena grup butuh nilai default.
  if (option.is_default) {
    return {
      kind:        'blocked-default',
      severity:    'warning',
      action:      'disabled',
      title:       'Opsi default grup',
      description: `Opsi "${option.label}" adalah nilai default untuk grupnya.`,
      remediation: 'Jika ingin melakukan Hapus item ini, silahkan set opsi lain sebagai default terlebih dahulu, baru hapus opsi ini.',
    }
  }

  // Priority 4: 0 dep atau RENCANA only → safe
  if (!safetyStatus || safetyStatus.total_dependency === 0) {
    return {
      kind:        'safe',
      severity:    'success',
      action:      'delete',
      title:       'Aman dihapus',
      description: 'Opsi ini tidak punya dependency terdaftar.',
    }
  }

  // RENCANA only → safe (per USAGE_TRACKING_SPEC Section 5.5)
  return {
    kind:        'safe',
    severity:    'success',
    action:      'delete',
    title:       'Aman dihapus',
    description: `${safetyStatus.count_rencana} dependency berstatus Rencana — belum ada di kode, aman dihapus.`,
  }
}

// ─── Pure Function: getGroupVerdict ──────────────────────────────────────────
//
// S#127 FIX — Hapus `has-default-option` sebagai blocker grup.
// Sebelumnya: grup dengan opsi default diblock → deadlock (tidak pernah bisa hapus grup)
// Sesudah:    grup hanya diblock jika ada dep AKTIF/DIBANGUN di opsi-opsinya.
//
// LOGIKA BENAR:
//   - Hapus OPSI default → diblock (opsi itu sendiri tidak bisa dihapus tanpa ganti default)
//   - Hapus GRUP yang punya opsi default → BOLEH (cascade delete handle semua opsi)
//
// EDGE CASE (tercatat, belum di-handle):
//   Jika opsi DEFAULT juga punya dep AKTIF, getOptionVerdict mengembalikan `blocked-default`
//   (priority 1), sehingga dep AKTIF-nya tidak muncul di optionVerdicts.
//   Untuk handle ini, perlu pass safetyMap langsung ke sini.
//   State DB saat ini tidak ada kasus ini — aman untuk sekarang.

export function getGroupVerdict(
  group:             GrupDenganOpsi,
  optionVerdicts:    OptionVerdict[],
  groupSafetyStatus: SafetyStatusResult | null,
): GroupVerdict {

  // Grup kosong + 0 dep → safe
  if (
    group.opsi.length === 0 &&
    (!groupSafetyStatus || groupSafetyStatus.total_dependency === 0)
  ) {
    return {
      kind:        'safe-empty',
      severity:    'success',
      action:      'delete',
      title:       'Aman dihapus',
      description: 'Grup tidak punya opsi dan tidak punya dependency.',
    }
  }

  // Rollup: HANYA block jika ada dep AKTIF atau DIBANGUN
  // blocked-default TIDAK masuk hitungan (hapus grup = cascade delete, valid)
  const realBlockers = optionVerdicts.filter(v =>
    v.kind === 'blocked-in-use' || v.kind === 'blocked-building'
  )

  if (realBlockers.length > 0) {
    const hasDanger = realBlockers.some(b => b.severity === 'danger')
    return {
      kind:        'rollup-blocked',
      severity:    hasDanger ? 'danger' : 'warning',
      action:      'disabled',
      title:       hasDanger
        ? 'Ada opsi sedang dipakai modul aktif'
        : 'Ada opsi yang belum aman dihapus',
      description: `${realBlockers.length} dari ${group.opsi.length} opsi tidak aman dihapus.`,
      offenders:   realBlockers,
    }
  }

  // Semua opsi aman (cascade delete handle opsi default juga)
  return {
    kind:        'safe-empty',
    severity:    'success',
    action:      'delete',
    title:       'Aman dihapus',
    description: group.opsi.length > 0
      ? 'Semua opsi grup aman dihapus.'
      : 'Grup tidak punya opsi dan tidak punya dependency.',
  }
}

// ─── Exhaustive Check Helper ─────────────────────────────────────────────────

export function assertNever(x: never): never {
  throw new Error(`Unexpected verdict kind: ${JSON.stringify(x)}`)
}
