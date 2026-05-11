'use client'

// lib/hooks/useDeletePermission.ts
// Hook memoized: hitung verdict delete untuk satu opsi atau grup.
// Verdict dihitung dari pure functions di lib/dropdowns/verdict.ts.
// Data diambil dari SafetyStatusFullMap yang sudah di-fetch di parent.
//
// POLA PAKAI:
//   // Untuk opsi:
//   const verdict = useDeletePermission({ type: 'option', option, group, safetyMap })
//
//   // Untuk grup:
//   const verdict = useDeletePermission({ type: 'group', group, optionVerdicts, safetyMap })
//
// is_shared: false — khusus M4 untuk saat ini.
//   Kalau modul lain butuh, jadikan shared + register ke cr_functions.
//
// Dibuat: Sesi #125 — Layer 1 Refactor Verdict (RENCANA_REFACTOR_DROPDOWN_v1.md)

import { useMemo }                       from 'react'
import { getOptionVerdict, getGroupVerdict } from '@/lib/dropdowns/verdict'
import type { OptionVerdict, GroupVerdict }  from '@/lib/dropdowns/verdict'
import type { GrupDenganOpsi, MasterDropdownOption } from '@/lib/types/master-dropdown.types'
import type { SafetyStatusFullMap }      from '@/lib/types/usage-tracking.types'

// ─── Params ──────────────────────────────────────────────────────────────────

type OptionParams = {
  type:       'option'
  option:     MasterDropdownOption
  group:      GrupDenganOpsi
  /** Map dari bulk fetch: key = `${source_table}:${source_id}` */
  safetyMap:  SafetyStatusFullMap
}

type GroupParams = {
  type:           'group'
  group:          GrupDenganOpsi
  /** Verdict semua opsi dalam grup — sudah dihitung oleh pemanggil */
  optionVerdicts: OptionVerdict[]
  /** Map dari bulk fetch: key = `${source_table}:${source_id}` */
  safetyMap:      SafetyStatusFullMap
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useDeletePermission(
  params: OptionParams | GroupParams
): OptionVerdict | GroupVerdict {

  return useMemo(() => {

    if (params.type === 'option') {
      // Key format: `master_dropdown_options:${optionId}`
      const key    = `master_dropdown_options:${params.option.id}`
      const safety = params.safetyMap[key] ?? null
      return getOptionVerdict(params.option, params.group, safety)
    }

    // type === 'group'
    // Key format: `master_dropdown_groups:${groupId}`
    const key    = `master_dropdown_groups:${params.group.id}`
    const safety = params.safetyMap[key] ?? null
    return getGroupVerdict(params.group, params.optionVerdicts, safety)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    params.type,
    params.group.id,
    params.group.opsi,
    params.safetyMap,
    // Untuk option: juga depend pada option.id dan option.is_default
    params.type === 'option' ? params.option.id : undefined,
    params.type === 'option' ? params.option.is_default : undefined,
    // Untuk group: juga depend pada optionVerdicts
    params.type === 'group' ? params.optionVerdicts : undefined,
  ])
}
