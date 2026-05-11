'use client'

// components/dropdowns/DeleteVerdictPanel.tsx
// Komponen pure: render visual verdict (panel hijau/amber/merah).
// Konsumsi OptionVerdict atau GroupVerdict dari pure functions di lib/dropdowns/verdict.ts.
//
// PRINSIP: komponen ini TIDAK pernah compute verdict sendiri.
//   Verdict dihitung di parent via useDeletePermission, lalu di-pass ke sini.
//   Single source of truth — single render logic.
//
// Pakai exhaustive switch + assertNever supaya TypeScript paksa
// kita handle setiap kind baru yang ditambah ke discriminated union.
//
// Dibuat: Sesi #125 — Layer 2 View Components Refactor

import type { JSX } from 'react'
import {
  SEVERITY_PALETTE,
  assertNever,
  type OptionVerdict,
  type GroupVerdict,
} from '@/lib/dropdowns/verdict'

interface Props {
  verdict:   OptionVerdict | GroupVerdict
  className?: string
}

export function DeleteVerdictPanel({ verdict, className = '' }: Props): JSX.Element {
  const palette = SEVERITY_PALETTE[verdict.severity]

  return (
    <div className={`rounded-md border p-4 ${palette.container} ${className}`}>
      <div className="flex items-start gap-2">
        <span className="text-lg shrink-0" aria-hidden>{palette.icon}</span>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium">{verdict.title}</h4>
          <p className="mt-1 text-sm break-words">{verdict.description}</p>
        </div>
      </div>
      {/* Extras di luar flex — rata kiri penuh (koreksi Philips S#127) */}
      {renderExtras(verdict)}
    </div>
  )
}

function renderExtras(verdict: OptionVerdict | GroupVerdict): JSX.Element | null {
  switch (verdict.kind) {
    case 'safe':
    case 'safe-empty':
      return null

    case 'blocked-default':
    case 'has-default-option':
      return (
        <div className="mt-2 text-sm">
          <p className="font-semibold">📌 Saran:</p>
          <p className="mt-0.5">{verdict.remediation}</p>
        </div>
      )

    case 'blocked-in-use':
      return verdict.dependents.length > 0 ? (
        <ul className="mt-2 list-disc pl-5 text-sm">
          {verdict.dependents.map((d, i) => (
            <li key={i}>{d.module} — {d.usage}</li>
          ))}
        </ul>
      ) : null

    case 'blocked-building':
      return verdict.buildingModules.length > 0 ? (
        <ul className="mt-2 list-disc pl-5 text-sm">
          {verdict.buildingModules.map((m, i) => (
            <li key={i}>{m}</li>
          ))}
        </ul>
      ) : null

    case 'rollup-blocked':
      return (
        <details className="mt-2 text-sm">
          <summary className="cursor-pointer select-none">
            Detail {verdict.offenders.length} opsi yang memblokir
          </summary>
          <div className="mt-2 space-y-2 pl-2">
            {verdict.offenders.map((o, i) => (
              <DeleteVerdictPanel key={i} verdict={o} />
            ))}
          </div>
        </details>
      )

    default:
      return assertNever(verdict)
  }
}
