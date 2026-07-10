'use client'
// ARSIP — sebelum M9 S#343
// File asli: app/dashboard/superadmin/monitoring/alert-rules/AlertRulesPanel.tsx
// Versi: setelah HUTANG-M5-03 (S#341)
// Lihat versi baru di lokasi asli

import { useState, useEffect } from 'react'
import { RuleCard }            from './AlertRuleCard'
import type { AlertRuleWithProvider } from '@/lib/types/monitoring.types'
import type { RuleCardTexts }         from './AlertRuleCard'

const TEXTS_FALLBACK: RuleCardTexts = {
  pengaturan_lanjutan:  'Pengaturan Lanjutan',
  berturut:             'Berturut (kali)',
  cooldown:             'Cooldown (menit)',
  notifikasi:           'Notifikasi',
  aktif:                'Aktif',
  simpan:               'Simpan',
  menyimpan:            'Menyimpan...',
  tersimpan:            '✓ Tersimpan',
  nonaktif:             'Nonaktif',
  dinonaktifkan_sistem: 'Dinonaktifkan sistem',
  gagal_simpan:         'Gagal menyimpan — coba lagi',
  empty_belum_ada:      'Belum ada alert rules. Rules dibuat otomatis saat cron pertama kali berjalan.',
}

interface ProviderGroup {
  provider_nama:     string
  provider_kode:     string
  provider_kategori: string
  rules:             AlertRuleWithProvider[]
}

function groupByProvider(rules: AlertRuleWithProvider[]): ProviderGroup[] {
  const map = new Map<string, ProviderGroup>()
  for (const rule of rules) {
    const key = rule.provider_kode
    if (!map.has(key)) {
      map.set(key, { provider_nama: rule.provider_nama, provider_kode: rule.provider_kode, provider_kategori: rule.provider_kategori, rules: [] })
    }
    map.get(key)!.rules.push(rule)
  }
  return Array.from(map.values())
}

function ProviderAccordion({ group, isOpen, onToggle, onUpdate, texts }: {
  group: ProviderGroup; isOpen: boolean; onToggle: () => void
  onUpdate: (updater: (prev: AlertRuleWithProvider[]) => AlertRuleWithProvider[]) => void
  texts: RuleCardTexts
}) {
  const aktif    = group.rules.filter(r => r.is_active).length
  const nonaktif = group.rules.length - aktif
  return (
    <div className="rounded-lg border border-black/10 overflow-hidden">
      <button type="button" onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-[#f9f9f8] hover:bg-[#f1f0ed] transition-colors text-left">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] transition-transform ${isOpen ? 'rotate-90' : ''}`}>▶</span>
          <span className="text-[13px] font-semibold text-[#1a1a1a]">{group.provider_nama}</span>
          <span className="text-[11px] text-[#9ca3af]">— {group.provider_kategori}</span>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          {aktif > 0 && <span className="px-1.5 py-0.5 rounded bg-[#EAF3DE] text-[#3B6D11] font-medium">{aktif} aktif</span>}
          {nonaktif > 0 && <span className="px-1.5 py-0.5 rounded bg-[#F1EFE8] text-[#5F5E5A] font-medium">{nonaktif} nonaktif</span>}
        </div>
      </button>
      {isOpen && (
        <div className="p-3 space-y-2 bg-white">
          {group.rules.map(rule => <RuleCard key={rule.id} rule={rule} onUpdate={onUpdate} texts={texts} />)}
        </div>
      )}
    </div>
  )
}

export function AlertRulesPanel({ rules, onUpdate }: {
  rules: AlertRuleWithProvider[]
  onUpdate: (updater: (prev: AlertRuleWithProvider[]) => AlertRuleWithProvider[]) => void
}) {
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set())
  const [texts,      setTexts]      = useState<RuleCardTexts>(TEXTS_FALLBACK)

  useEffect(() => {
    let cancelled = false
    async function fetchTexts() {
      try {
        const res  = await fetch('/api/message-library?kategori=alert_rules')
        const json = await res.json()
        if (!cancelled && json.success && json.data) {
          const d = json.data as Record<string, string>
          setTexts({
            pengaturan_lanjutan:  d['alert_rules.label.pengaturan_lanjutan']   ?? TEXTS_FALLBACK.pengaturan_lanjutan,
            berturut:             d['alert_rules.label.berturut']               ?? TEXTS_FALLBACK.berturut,
            cooldown:             d['alert_rules.label.cooldown']               ?? TEXTS_FALLBACK.cooldown,
            notifikasi:           d['alert_rules.label.notifikasi']             ?? TEXTS_FALLBACK.notifikasi,
            aktif:                d['alert_rules.label.aktif']                  ?? TEXTS_FALLBACK.aktif,
            simpan:               d['alert_rules.action.simpan']                ?? TEXTS_FALLBACK.simpan,
            menyimpan:            d['alert_rules.action.menyimpan']             ?? TEXTS_FALLBACK.menyimpan,
            tersimpan:            d['alert_rules.feedback.tersimpan']           ?? TEXTS_FALLBACK.tersimpan,
            nonaktif:             d['alert_rules.status.nonaktif']              ?? TEXTS_FALLBACK.nonaktif,
            dinonaktifkan_sistem: d['alert_rules.status.dinonaktifkan_sistem']  ?? TEXTS_FALLBACK.dinonaktifkan_sistem,
            gagal_simpan:         d['alert_rules.error.gagal_simpan']           ?? TEXTS_FALLBACK.gagal_simpan,
            empty_belum_ada:      d['alert_rules.empty.belum_ada']              ?? TEXTS_FALLBACK.empty_belum_ada,
          })
        }
      } catch { /* tetap pakai TEXTS_FALLBACK */ }
    }
    fetchTexts()
    return () => { cancelled = true }
  }, [])

  function toggleGroup(kode: string) {
    setOpenGroups(prev => { const next = new Set(prev); next.has(kode) ? next.delete(kode) : next.add(kode); return next })
  }

  if (rules.length === 0) {
    return <div className="rounded-md border bg-muted/20 p-4 text-sm text-muted-foreground">{texts.empty_belum_ada}</div>
  }

  const groups = groupByProvider(rules)
  return (
    <div className="space-y-2">
      {groups.map(group => (
        <ProviderAccordion key={group.provider_kode} group={group} isOpen={openGroups.has(group.provider_kode)}
          onToggle={() => toggleGroup(group.provider_kode)} onUpdate={onUpdate} texts={texts} />
      ))}
    </div>
  )
}
