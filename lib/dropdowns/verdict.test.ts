// lib/dropdowns/verdict.test.ts
// Unit test untuk getOptionVerdict + getGroupVerdict.
// 8 skenario WAJIB semua lulus sebelum lanjut ke Layer 2.
//
// Jalankan: npm test (setelah npm install -D vitest)
//
// Dibuat: Sesi #125 — Layer 1 Refactor Verdict

import { describe, it, expect } from 'vitest'
import { getOptionVerdict, getGroupVerdict } from './verdict'
import type { GrupDenganOpsi, MasterDropdownOption } from '@/lib/types/master-dropdown.types'
import type { SafetyStatusResult } from '@/lib/types/usage-tracking.types'

// ─── Helpers: factory data minimal ───────────────────────────────────────────

function makeGroup(overrides: Partial<GrupDenganOpsi> = {}): GrupDenganOpsi {
  return {
    id:                   'grup-1',
    slug:                 'channel_otp',
    display_name:         'Channel OTP',
    description:          null,
    category:             'communication',
    module:               null,
    tenant_can_override:  false,
    tenant_override_mode: 'none',
    is_system:            false,
    is_active:            true,
    sort_order:           0,
    metadata:             null,
    created_at:           '2026-01-01T00:00:00Z',
    created_by:           null,
    updated_at:           '2026-01-01T00:00:00Z',
    updated_by:           null,
    deleted_at:           null,
    opsi:                 [],
    ...overrides,
  }
}

function makeOption(overrides: Partial<MasterDropdownOption> = {}): MasterDropdownOption {
  return {
    id:               'opsi-1',
    group_id:         'grup-1',
    slug:             'whatsapp',
    label:            'WhatsApp',
    numeric_value:    null,
    string_value:     null,
    json_value:       null,
    is_default:       false,
    is_active:        true,
    is_system:        false,
    tenant_id:        null,
    parent_option_id: null,
    sort_order:       0,
    metadata:         null,
    created_at:       '2026-01-01T00:00:00Z',
    created_by:       null,
    updated_at:       '2026-01-01T00:00:00Z',
    updated_by:       null,
    deleted_at:       null,
    ...overrides,
  }
}

function makeSafety(overrides: Partial<SafetyStatusResult>): SafetyStatusResult {
  return {
    source_table:         'master_dropdown_options',
    source_id:            'opsi-1',
    safety_verdict:       'AMAN',
    count_aktif:          0,
    count_dibangun:       0,
    count_rencana:        0,
    count_tidak_dipakai:  0,
    total_dependency:     0,
    last_recalculated_at: '2026-05-11T00:00:00Z',
    ...overrides,
  }
}

// ─── getOptionVerdict ─────────────────────────────────────────────────────────

describe('getOptionVerdict', () => {

  // TC1: Opsi default TANPA dep AKTIF/DIBANGUN → blocked-default
  it('TC1: opsi default (0 deps) → blocked-default, severity warning, action disabled', () => {
    const group  = makeGroup()
    const option = makeOption({ is_default: true })
    const result = getOptionVerdict(option, group, null) // null = 0 deps

    expect(result.kind).toBe('blocked-default')
    expect(result.severity).toBe('warning')
    expect(result.action).toBe('disabled')
    expect('remediation' in result && result.remediation).toBeTruthy()
  })

  // TC1b: Opsi default DENGAN dep AKTIF → blocked-in-use (dep AKTIF lebih prioritas)
  // Ini adalah edge case channel_otp/whatsapp: default=true + AKTIF dep
  it('TC1b: opsi default + dep AKTIF → blocked-in-use (dep AKTIF menang atas default)', () => {
    const group  = makeGroup()
    const option = makeOption({ is_default: true })
    const safety = makeSafety({ count_aktif: 1, total_dependency: 1, safety_verdict: 'TIDAK_AMAN' })
    const result = getOptionVerdict(option, group, safety)

    expect(result.kind).toBe('blocked-in-use') // bukan blocked-default
    expect(result.severity).toBe('danger')
  })

  // TC2: 0 dep, bukan default → safe (hijau, tombol MERAH clickable)
  it('TC2: 0 dep + bukan default → safe, severity success, action delete', () => {
    const group  = makeGroup()
    const option = makeOption({ is_default: false })
    const result = getOptionVerdict(option, group, null)

    expect(result.kind).toBe('safe')
    expect(result.severity).toBe('success')
    expect(result.action).toBe('delete')
  })

  // TC3: dep AKTIF → blocked-in-use (merah, tombol GREY)
  it('TC3: dep AKTIF → blocked-in-use, severity danger, action disabled', () => {
    const group   = makeGroup()
    const option  = makeOption()
    const safety  = makeSafety({
      count_aktif:      1,
      total_dependency: 1,
      safety_verdict:   'TIDAK_AMAN',
    })
    const result = getOptionVerdict(option, group, safety)

    expect(result.kind).toBe('blocked-in-use')
    expect(result.severity).toBe('danger')
    expect(result.action).toBe('disabled')
  })

  // TC4: dep DIBANGUN → blocked-building (amber, tombol GREY)
  it('TC4: dep DIBANGUN → blocked-building, severity warning, action disabled', () => {
    const group  = makeGroup()
    const option = makeOption({ slug: 'tanyakan_dulu', label: 'Tanyakan Dulu' })
    const safety = makeSafety({
      count_dibangun:   1,
      total_dependency: 1,
      safety_verdict:   'TIDAK_BISA',
    })
    const result = getOptionVerdict(option, group, safety)

    expect(result.kind).toBe('blocked-building')
    expect(result.severity).toBe('warning')
    expect(result.action).toBe('disabled')
  })

  // TC5: dep RENCANA only → safe (RENCANA tidak blokir, per USAGE_TRACKING_SPEC 5.5)
  it('TC5: dep RENCANA only → safe, action delete (RENCANA tidak blokir)', () => {
    const group  = makeGroup()
    const option = makeOption()
    const safety = makeSafety({
      count_rencana:    1,
      total_dependency: 1,
      safety_verdict:   'AMAN',
    })
    const result = getOptionVerdict(option, group, safety)

    expect(result.kind).toBe('safe')
    expect(result.action).toBe('delete')
  })

})

// ─── getGroupVerdict ──────────────────────────────────────────────────────────

describe('getGroupVerdict', () => {

  // TC6: Grup 0 opsi 0 dep → safe-empty
  it('TC6: grup 0 opsi 0 dep → safe-empty, action delete', () => {
    const group  = makeGroup({ opsi: [] })
    const result = getGroupVerdict(group, [], null)

    expect(result.kind).toBe('safe-empty')
    expect(result.action).toBe('delete')
  })

  // TC7: Grup punya opsi default aktif tapi 0 dep AKTIF/DIBANGUN → safe-empty (bisa hapus grup)
  // S#127 FIX: has-default-option TIDAK lagi memblokir hapus grup.
  // Hapus grup = cascade delete semua opsi termasuk yang default. Ini valid.
  it('TC7: grup ada opsi default (0 dep AKTIF/DIBANGUN) → safe-empty, grup bisa dihapus', () => {
    const defaultOpsi = makeOption({ is_default: true, is_active: true })
    const group       = makeGroup({ opsi: [defaultOpsi] })
    const optVerdicts = [getOptionVerdict(defaultOpsi, group, null)]
    const result = getGroupVerdict(group, optVerdicts, null)

    // blocked-default opsi TIDAK memblokir hapus grup (cascade delete handle)
    expect(result.kind).toBe('safe-empty')
    expect(result.action).toBe('delete')
  })

  // TC8: Ada opsi AKTIF → rollup-blocked danger
  it('TC8: rollup dari opsi AKTIF → rollup-blocked, severity danger', () => {
    const opsi  = makeOption()
    const group = makeGroup({ opsi: [opsi] })
    const safetyOpsi = makeSafety({
      count_aktif: 1, total_dependency: 1, safety_verdict: 'TIDAK_AMAN',
    })
    const optVerdicts = [getOptionVerdict(opsi, group, safetyOpsi)]
    const result      = getGroupVerdict(group, optVerdicts, null)

    expect(result.kind).toBe('rollup-blocked')
    expect(result.severity).toBe('danger')
    expect(result.action).toBe('disabled')
    expect('offenders' in result && result.offenders).toHaveLength(1)
  })

})
