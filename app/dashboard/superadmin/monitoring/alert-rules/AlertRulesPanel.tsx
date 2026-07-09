'use client'
// app/dashboard/superadmin/monitoring/alert-rules/AlertRulesPanel.tsx
// Orchestrator halaman Alert Rules (M05) — M5 S#340.
// Fitur: groupBy provider (accordion multi-expand), delegasi render ke RuleCard.
// Sub-komponen: AlertRuleCard.tsx (RuleCard, badge, SeveritySelector)

import { useState } from 'react'
import { RuleCard } from './AlertRuleCard'
import type { AlertRuleWithProvider } from '@/lib/types/monitoring.types'

// ─── Tipe lokal ───────────────────────────────────────────────────────────────

interface ProviderGroup {
  provider_nama:     string
  provider_kode:     string
  provider_kategori: string
  rules:             AlertRuleWithProvider[]
}

// ─── Helper: group rules by provider ─────────────────────────────────────────

function groupByProvider(rules: AlertRuleWithProvider[]): ProviderGroup[] {
  const map = new Map<string, ProviderGroup>()
  for (const rule of rules) {
    const key = rule.provider_kode
    if (!map.has(key)) {
      map.set(key, {
        provider_nama:     rule.provider_nama,
        provider_kode:     rule.provider_kode,
        provider_kategori: rule.provider_kategori,
        rules:             [],
      })
    }
    map.get(key)!.rules.push(rule)
  }
  return Array.from(map.values())
}

// ─── ProviderAccordion: satu grup provider ────────────────────────────────────

function ProviderAccordion({
  group, isOpen, onToggle, onUpdate,
}: {
  group:    ProviderGroup
  isOpen:   boolean
  onToggle: () => void
  onUpdate: (updater: (prev: AlertRuleWithProvider[]) => AlertRuleWithProvider[]) => void
}) {
  const aktif    = group.rules.filter(r => r.is_active).length
  const nonaktif = group.rules.length - aktif

  return (
    <div className="rounded-lg border border-black/10 overflow-hidden">
      {/* Header grup */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-[#f9f9f8] hover:bg-[#f1f0ed] transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <span className={`text-[10px] transition-transform ${isOpen ? 'rotate-90' : ''}`}>▶</span>
          <span className="text-[13px] font-semibold text-[#1a1a1a]">{group.provider_nama}</span>
          <span className="text-[11px] text-[#9ca3af]">— {group.provider_kategori}</span>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          {aktif > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-[#EAF3DE] text-[#3B6D11] font-medium">{aktif} aktif</span>
          )}
          {nonaktif > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-[#F1EFE8] text-[#5F5E5A] font-medium">{nonaktif} nonaktif</span>
          )}
        </div>
      </button>

      {/* Isi grup */}
      {isOpen && (
        <div className="p-3 space-y-2 bg-white">
          {group.rules.map(rule => (
            <RuleCard key={rule.id} rule={rule} onUpdate={onUpdate} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── AlertRulesPanel (export utama) ──────────────────────────────────────────

export function AlertRulesPanel({ rules, onUpdate }: {
  rules:    AlertRuleWithProvider[]
  onUpdate: (updater: (prev: AlertRuleWithProvider[]) => AlertRuleWithProvider[]) => void
}) {
  // State accordion: Set of provider_kode yang sedang terbuka (multi-expand)
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set())

  function toggleGroup(kode: string) {
    setOpenGroups(prev => {
      const next = new Set(prev)
      next.has(kode) ? next.delete(kode) : next.add(kode)
      return next
    })
  }

  if (rules.length === 0) {
    return (
      <div className="rounded-md border bg-muted/20 p-4 text-sm text-muted-foreground">
        Belum ada alert rules. Rules dibuat otomatis saat cron pertama kali berjalan.
      </div>
    )
  }

  const groups = groupByProvider(rules)

  return (
    <div className="space-y-2">
      {groups.map(group => (
        <ProviderAccordion
          key={group.provider_kode}
          group={group}
          isOpen={openGroups.has(group.provider_kode)}
          onToggle={() => toggleGroup(group.provider_kode)}
          onUpdate={onUpdate}
        />
      ))}
    </div>
  )
}
