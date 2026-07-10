'use client'
// app/dashboard/superadmin/monitoring/alert-rules/AlertRulesPanel.tsx
// Orchestrator halaman Alert Rules (M05) — M5 S#340.
// Fitur: groupBy provider (accordion multi-expand), delegasi render ke RuleCard.
// Sub-komponen: AlertRuleCard.tsx (RuleCard, badge, SeveritySelector)
// HUTANG-M5-03 S#341: fetch teks dari message_library (LL#11), pass ke RuleCard via texts prop.
// PERUBAHAN Sesi #343 — M9 Guardrail:
//   - TEXTS_FALLBACK: tambah 4 key konfirmasi nonaktifkan + 4 key bersihkan usang
//   - fetchTexts: ambil 4 key baru dari message_library
//   - Tambah tombol "Bersihkan Aturan Usang" di header panel
//   - Modal konfirmasi sebelum bulk-disable
//   - POST /api/monitoring/alert-rules/bulk-disable setelah konfirmasi

import { useState, useEffect } from 'react'
import { RuleCard }            from './AlertRuleCard'
import type { AlertRuleWithProvider } from '@/lib/types/monitoring.types'
import type { RuleCardTexts }         from './AlertRuleCard'

// ─── Fallback teks — dipakai saat fetch belum selesai atau gagal ──────────────

const TEXTS_FALLBACK: RuleCardTexts = {
  pengaturan_lanjutan:      'Pengaturan Lanjutan',
  berturut:                 'Berturut (kali)',
  cooldown:                 'Cooldown (menit)',
  notifikasi:               'Notifikasi',
  aktif:                    'Aktif',
  simpan:                   'Simpan',
  menyimpan:                'Menyimpan...',
  tersimpan:                '✓ Tersimpan',
  nonaktif:                 'Nonaktif',
  dinonaktifkan_sistem:     'Dinonaktifkan sistem',
  gagal_simpan:             'Gagal menyimpan — coba lagi',
  empty_belum_ada:          'Belum ada alert rules. Rules dibuat otomatis saat cron pertama kali berjalan.',
  // M9 Guardrail
  confirm_nonaktifkan_rule: 'Nonaktifkan rule ini?',
  confirm_nonaktifkan_desc: 'Rule tidak akan mengirim alert saat provider bermasalah.',
  confirm_ya_nonaktifkan:   'Ya, nonaktifkan',
  confirm_batal:            'Batal',
}

// Teks tambahan hanya untuk panel (tidak diteruskan ke RuleCard)
interface PanelTexts {
  action_bersihkan_usang:   string
  confirm_bersihkan_judul:  string
  confirm_bersihkan_desc:   string
  confirm_ya_bersihkan:     string
  feedback_bersihkan_hasil: string
  feedback_tidak_ada_usang: string
}

const PANEL_TEXTS_FALLBACK: PanelTexts = {
  action_bersihkan_usang:   'Bersihkan Aturan Usang',
  confirm_bersihkan_judul:  'Bersihkan aturan usang?',
  confirm_bersihkan_desc:   'Semua rule milik provider yang tidak aktif akan dinonaktifkan.',
  confirm_ya_bersihkan:     'Ya, bersihkan',
  feedback_bersihkan_hasil: 'rule dinonaktifkan',
  feedback_tidak_ada_usang: 'Tidak ada aturan usang yang perlu dibersihkan.',
}

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
  group, isOpen, onToggle, onUpdate, texts,
}: {
  group:    ProviderGroup
  isOpen:   boolean
  onToggle: () => void
  onUpdate: (updater: (prev: AlertRuleWithProvider[]) => AlertRuleWithProvider[]) => void
  texts:    RuleCardTexts
}) {
  const aktif    = group.rules.filter(r => r.is_active).length
  const nonaktif = group.rules.length - aktif

  return (
    <div className="rounded-lg border border-black/10 overflow-hidden">
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

      {isOpen && (
        <div className="p-3 space-y-2 bg-white">
          {group.rules.map(rule => (
            <RuleCard key={rule.id} rule={rule} onUpdate={onUpdate} texts={texts} />
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
  const [openGroups,       setOpenGroups]       = useState<Set<string>>(new Set())
  const [texts,            setTexts]            = useState<RuleCardTexts>(TEXTS_FALLBACK)
  const [panelTexts,       setPanelTexts]       = useState<PanelTexts>(PANEL_TEXTS_FALLBACK)
  // M9: state modal + proses bersihkan usang
  const [showConfirmClean, setShowConfirmClean] = useState(false)
  const [cleanLoading,     setCleanLoading]     = useState(false)
  const [cleanFeedback,    setCleanFeedback]    = useState<string | null>(null)

  // ── Fetch teks dari message_library sekali saat mount ─────────────────────
  useEffect(() => {
    let cancelled = false
    async function fetchTexts() {
      try {
        const res  = await fetch('/api/message-library?kategori=alert_rules')
        const json = await res.json()
        if (!cancelled && json.success && json.data) {
          const d = json.data as Record<string, string>
          setTexts({
            pengaturan_lanjutan:      d['alert_rules.label.pengaturan_lanjutan']   ?? TEXTS_FALLBACK.pengaturan_lanjutan,
            berturut:                 d['alert_rules.label.berturut']               ?? TEXTS_FALLBACK.berturut,
            cooldown:                 d['alert_rules.label.cooldown']               ?? TEXTS_FALLBACK.cooldown,
            notifikasi:               d['alert_rules.label.notifikasi']             ?? TEXTS_FALLBACK.notifikasi,
            aktif:                    d['alert_rules.label.aktif']                  ?? TEXTS_FALLBACK.aktif,
            simpan:                   d['alert_rules.action.simpan']                ?? TEXTS_FALLBACK.simpan,
            menyimpan:                d['alert_rules.action.menyimpan']             ?? TEXTS_FALLBACK.menyimpan,
            tersimpan:                d['alert_rules.feedback.tersimpan']           ?? TEXTS_FALLBACK.tersimpan,
            nonaktif:                 d['alert_rules.status.nonaktif']              ?? TEXTS_FALLBACK.nonaktif,
            dinonaktifkan_sistem:     d['alert_rules.status.dinonaktifkan_sistem']  ?? TEXTS_FALLBACK.dinonaktifkan_sistem,
            gagal_simpan:             d['alert_rules.error.gagal_simpan']           ?? TEXTS_FALLBACK.gagal_simpan,
            empty_belum_ada:          d['alert_rules.empty.belum_ada']              ?? TEXTS_FALLBACK.empty_belum_ada,
            // M9
            confirm_nonaktifkan_rule: d['alert_rules.confirm.nonaktifkan_rule']    ?? TEXTS_FALLBACK.confirm_nonaktifkan_rule,
            confirm_nonaktifkan_desc: d['alert_rules.confirm.nonaktifkan_desc']    ?? TEXTS_FALLBACK.confirm_nonaktifkan_desc,
            confirm_ya_nonaktifkan:   d['alert_rules.confirm.ya_nonaktifkan']      ?? TEXTS_FALLBACK.confirm_ya_nonaktifkan,
            confirm_batal:            d['alert_rules.confirm.batal']               ?? TEXTS_FALLBACK.confirm_batal,
          })
          setPanelTexts({
            action_bersihkan_usang:   d['alert_rules.action.bersihkan_usang']      ?? PANEL_TEXTS_FALLBACK.action_bersihkan_usang,
            confirm_bersihkan_judul:  d['alert_rules.confirm.bersihkan_judul']     ?? PANEL_TEXTS_FALLBACK.confirm_bersihkan_judul,
            confirm_bersihkan_desc:   d['alert_rules.confirm.bersihkan_desc']      ?? PANEL_TEXTS_FALLBACK.confirm_bersihkan_desc,
            confirm_ya_bersihkan:     d['alert_rules.confirm.ya_bersihkan']        ?? PANEL_TEXTS_FALLBACK.confirm_ya_bersihkan,
            feedback_bersihkan_hasil: d['alert_rules.feedback.bersihkan_hasil']    ?? PANEL_TEXTS_FALLBACK.feedback_bersihkan_hasil,
            feedback_tidak_ada_usang: d['alert_rules.feedback.tidak_ada_usang']    ?? PANEL_TEXTS_FALLBACK.feedback_tidak_ada_usang,
          })
        }
      } catch {
        // Gagal fetch — tetap pakai TEXTS_FALLBACK, UI tidak blank
      }
    }
    fetchTexts()
    return () => { cancelled = true }
  }, [])

  function toggleGroup(kode: string) {
    setOpenGroups(prev => {
      const next = new Set(prev)
      next.has(kode) ? next.delete(kode) : next.add(kode)
      return next
    })
  }

  // ── Eksekusi bulk-disable setelah konfirmasi ───────────────────────────────
  async function handleBersihkan() {
    setCleanLoading(true)
    setCleanFeedback(null)
    try {
      const res  = await fetch('/api/monitoring/alert-rules/bulk-disable', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        const count = data.count as number
        if (count === 0) {
          setCleanFeedback(panelTexts.feedback_tidak_ada_usang)
        } else {
          setCleanFeedback(`${count} ${panelTexts.feedback_bersihkan_hasil}`)
          // Update state lokal: flip is_active=false untuk rules yang terdampak
          // Cukup refresh dengan onUpdate — server state sudah berubah.
          // Cara paling sederhana: update semua rules yang provider-nya nonaktif,
          // tapi kita tidak tahu provider mana yang nonaktif di sini.
          // Solusi: trigger re-fetch tidak tersedia dari dalam komponen ini
          // (MonitoringClient.tsx yang pegang state rules).
          // Fallback: user akan lihat perubahan saat refresh manual / SSE update.
          // Feedback sudah cukup sebagai konfirmasi aksi berhasil.
        }
      } else {
        setCleanFeedback(`Gagal: ${data.message ?? 'Coba lagi'}`)
      }
    } catch {
      setCleanFeedback('Gagal terhubung — coba lagi')
    } finally {
      setCleanLoading(false)
      setShowConfirmClean(false)
    }
  }

  if (rules.length === 0) {
    return (
      <div className="rounded-md border bg-muted/20 p-4 text-sm text-muted-foreground">
        {texts.empty_belum_ada}
      </div>
    )
  }

  const groups = groupByProvider(rules)

  return (
    <div className="space-y-3">

      {/* Header panel: tombol Bersihkan Aturan Usang (M9) */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-[#9ca3af]">{groups.length} provider, {rules.length} rules</span>
        <button
          type="button"
          onClick={() => { setShowConfirmClean(true); setCleanFeedback(null) }}
          className="inline-flex items-center gap-1.5 rounded border border-[#d1d5db] px-2.5 py-1.5 text-[11px] text-[#6b7280] hover:bg-[#f9f9f8] hover:border-[#9ca3af] transition-colors"
        >
          🧹 {panelTexts.action_bersihkan_usang}
        </button>
      </div>

      {/* Modal konfirmasi bersihkan usang (M9) */}
      {showConfirmClean && (
        <div className="rounded-lg border border-[#EF9F27] bg-[#FFFBF5] px-3.5 py-3">
          <p className="text-[12px] font-semibold text-[#854F0B]">{panelTexts.confirm_bersihkan_judul}</p>
          <p className="mt-0.5 text-[11px] text-[#854F0B] leading-snug">{panelTexts.confirm_bersihkan_desc}</p>
          <div className="mt-2.5 flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handleBersihkan()}
              disabled={cleanLoading}
              className="px-3 py-1.5 rounded text-xs font-medium bg-[#854F0B] text-white hover:bg-[#6b3f08] disabled:opacity-50 transition-colors"
            >
              {cleanLoading
                ? <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin inline-block" /> Memproses...</span>
                : panelTexts.confirm_ya_bersihkan
              }
            </button>
            <button
              type="button"
              onClick={() => setShowConfirmClean(false)}
              disabled={cleanLoading}
              className="px-3 py-1.5 rounded text-xs font-medium bg-white border border-[#d1d5db] text-[#374151] hover:bg-[#f9fafb] disabled:opacity-50 transition-colors"
            >
              {texts.confirm_batal}
            </button>
          </div>
        </div>
      )}

      {/* Feedback setelah bersihkan */}
      {cleanFeedback && !showConfirmClean && (
        <div className="rounded border border-[#d1d5db] bg-[#f9f9f8] px-3 py-2 text-[12px] text-[#374151]">
          {cleanFeedback}
        </div>
      )}

      {/* Accordion per provider */}
      <div className="space-y-2">
        {groups.map(group => (
          <ProviderAccordion
            key={group.provider_kode}
            group={group}
            isOpen={openGroups.has(group.provider_kode)}
            onToggle={() => toggleGroup(group.provider_kode)}
            onUpdate={onUpdate}
            texts={texts}
          />
        ))}
      </div>

    </div>
  )
}
