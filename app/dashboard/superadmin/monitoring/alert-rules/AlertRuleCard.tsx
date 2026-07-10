'use client'
// app/dashboard/superadmin/monitoring/alert-rules/AlertRuleCard.tsx
// Sub-komponen RuleCard beserta badge dan selector untuk AlertRulesPanel.
// Dipecah dari AlertRulesPanel.tsx (ATURAN 9 — file 15.8KB > 10KB) — M5 S#340
// HUTANG-M5-03 S#341: tambah RuleCardTexts interface + pakai texts props (LL#11)
// PERUBAHAN Sesi #343 — M9 Guardrail:
//   - RuleCardTexts: tambah 4 key konfirmasi nonaktifkan (LL#11)
//   - handleToggle(false): tampilkan modal konfirmasi inline sebelum eksekusi
//   - Toggle ON (enable kembali): langsung eksekusi tanpa konfirmasi

import { useState } from 'react'
import type { AlertRuleWithProvider } from '@/lib/types/monitoring.types'

// ─── Badge: alert_type ────────────────────────────────────────────────────────

export function AlertTypeBadge({ type }: { type: string }) {
  const cfg = type === 'DOWN'
    ? { bg: 'bg-[#FCEBEB]', text: 'text-[#A32D2D]', label: 'DOWN' }
    : { bg: 'bg-[#FAEEDA]', text: 'text-[#854F0B]', label: 'SLOW' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  )
}

// ─── Badge: severity ──────────────────────────────────────────────────────────

export function SeverityBadge({ severity }: { severity: string }) {
  const cfg =
    severity === 'CRITICAL' ? { bg: 'bg-[#FCEBEB]', text: 'text-[#A32D2D]', icon: '▲' } :
    severity === 'WARNING'  ? { bg: 'bg-[#FAEEDA]', text: 'text-[#854F0B]', icon: '⚠' } :
                              { bg: 'bg-[#E8F0FC]', text: 'text-[#185FA5]', icon: 'ℹ' }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${cfg.bg} ${cfg.text}`}>
      <span>{cfg.icon}</span>{severity}
    </span>
  )
}

// ─── Segmented control: severity selector ────────────────────────────────────

export function SeveritySelector({
  value, onChange, disabled,
}: { value: string; onChange: (v: 'CRITICAL' | 'WARNING' | 'INFO') => void; disabled: boolean }) {
  const options: { val: 'CRITICAL' | 'WARNING' | 'INFO'; icon: string; bg: string; text: string; border: string }[] = [
    { val: 'CRITICAL', icon: '▲', bg: 'bg-[#FCEBEB]', text: 'text-[#A32D2D]', border: 'border-[#F09595]' },
    { val: 'WARNING',  icon: '⚠', bg: 'bg-[#FAEEDA]', text: 'text-[#854F0B]', border: 'border-[#EF9F27]' },
    { val: 'INFO',     icon: 'ℹ', bg: 'bg-[#E8F0FC]', text: 'text-[#185FA5]', border: 'border-[#7BAEE8]' },
  ]
  return (
    <div className="flex gap-1.5">
      {options.map(o => {
        const isActive = value === o.val
        return (
          <button
            key={o.val}
            type="button"
            disabled={disabled}
            onClick={() => onChange(o.val)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium border transition-colors
              ${isActive
                ? `${o.bg} ${o.text} ${o.border}`
                : 'bg-white text-[#9ca3af] border-[#e5e7eb] hover:border-[#d1d5db]'}
              disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <span>{o.icon}</span>{o.val}
          </button>
        )
      })}
    </div>
  )
}

// ─── Interface teks dari message_library (LL#11) ──────────────────────────────
// Semua teks yang berpotensi diubah SA tersentralisasi di sini.
// Fetch dilakukan di AlertRulesPanel, di-pass ke RuleCard via props.
// 'Threshold' dan 'Severity' tidak dimigrasi — istilah teknis internasional tetap.
// M9: tambah 4 key konfirmasi nonaktifkan.

export interface RuleCardTexts {
  pengaturan_lanjutan:      string  // alert_rules.label.pengaturan_lanjutan
  berturut:                 string  // alert_rules.label.berturut
  cooldown:                 string  // alert_rules.label.cooldown
  notifikasi:               string  // alert_rules.label.notifikasi
  aktif:                    string  // alert_rules.label.aktif
  simpan:                   string  // alert_rules.action.simpan
  menyimpan:                string  // alert_rules.action.menyimpan
  tersimpan:                string  // alert_rules.feedback.tersimpan
  nonaktif:                 string  // alert_rules.status.nonaktif
  dinonaktifkan_sistem:     string  // alert_rules.status.dinonaktifkan_sistem
  gagal_simpan:             string  // alert_rules.error.gagal_simpan
  empty_belum_ada:          string  // alert_rules.empty.belum_ada (dipakai AlertRulesPanel)
  // M9 Guardrail — konfirmasi nonaktifkan satu rule
  confirm_nonaktifkan_rule: string  // alert_rules.confirm.nonaktifkan_rule
  confirm_nonaktifkan_desc: string  // alert_rules.confirm.nonaktifkan_desc
  confirm_ya_nonaktifkan:   string  // alert_rules.confirm.ya_nonaktifkan
  confirm_batal:            string  // alert_rules.confirm.batal
}

// ─── ConfirmModal — modal konfirmasi inline (M9) ──────────────────────────────

function ConfirmModal({
  judul, deskripsi, labelKonfirmasi, labelBatal, onKonfirmasi, onBatal, loading,
}: {
  judul:           string
  deskripsi:       string
  labelKonfirmasi: string
  labelBatal:      string
  onKonfirmasi:    () => void
  onBatal:         () => void
  loading:         boolean
}) {
  return (
    <div className="mt-2 rounded-lg border border-[#EF9F27] bg-[#FFFBF5] px-3.5 py-3">
      <p className="text-[12px] font-semibold text-[#854F0B]">{judul}</p>
      <p className="mt-0.5 text-[11px] text-[#854F0B] leading-snug">{deskripsi}</p>
      <div className="mt-2.5 flex items-center gap-2">
        <button
          type="button"
          onClick={onKonfirmasi}
          disabled={loading}
          className="px-3 py-1.5 rounded text-xs font-medium bg-[#854F0B] text-white hover:bg-[#6b3f08] disabled:opacity-50 transition-colors"
        >
          {loading
            ? <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin inline-block" /> Menyimpan...</span>
            : labelKonfirmasi
          }
        </button>
        <button
          type="button"
          onClick={onBatal}
          disabled={loading}
          className="px-3 py-1.5 rounded text-xs font-medium bg-white border border-[#d1d5db] text-[#374151] hover:bg-[#f9fafb] disabled:opacity-50 transition-colors"
        >
          {labelBatal}
        </button>
      </div>
    </div>
  )
}

// ─── RuleCard: satu rule (DOWN atau SLOW) ────────────────────────────────────

export function RuleCard({
  rule, onUpdate, texts,
}: {
  rule:     AlertRuleWithProvider
  onUpdate: (updater: (prev: AlertRuleWithProvider[]) => AlertRuleWithProvider[]) => void
  texts:    RuleCardTexts
}) {
  const [savingToggle,   setSavingToggle]   = useState(false)
  const [savingForm,     setSavingForm]     = useState(false)
  const [formError,      setFormError]      = useState('')
  const [formSuccess,    setFormSuccess]    = useState(false)
  const [openSettings,   setOpenSettings]   = useState(false)
  // M9: state modal konfirmasi nonaktifkan
  const [showConfirmOff, setShowConfirmOff] = useState(false)

  const [threshold,   setThreshold]   = useState(rule.threshold_value)
  const [consecutive, setConsecutive] = useState(rule.consecutive_failures)
  const [cooldown,    setCooldown]    = useState(rule.cooldown_minutes)
  const [channels,    setChannels]    = useState<string[]>(rule.notif_channels)
  const [severity,    setSeverity]    = useState<'CRITICAL' | 'WARNING' | 'INFO'>(rule.severity)

  const isSystemDisabled = !rule.is_active && !!rule.disabled_reason

  // ── Eksekusi toggle setelah konfirmasi ────────────────────────────────────
  async function doToggle(checked: boolean) {
    setSavingToggle(true)
    try {
      const res  = await fetch(`/api/monitoring/alert-rules/${rule.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ is_active: checked }),
      })
      const data = await res.json()
      if (data.success) {
        onUpdate(prev => prev.map(r => r.id === rule.id ? { ...r, ...data.data } : r))
      }
    } catch { /* silent */ }
    finally {
      setSavingToggle(false)
      setShowConfirmOff(false)
    }
  }

  // ── Handler klik checkbox — M9: intercept jika OFF ────────────────────────
  function handleToggleClick(checked: boolean) {
    if (!checked) {
      // Nonaktifkan → tampilkan modal konfirmasi dulu
      setShowConfirmOff(true)
    } else {
      // Aktifkan kembali → langsung eksekusi tanpa konfirmasi
      void doToggle(true)
    }
  }

  // ── Simpan form (severity + channels + threshold + consecutive + cooldown) ──
  async function handleSaveForm() {
    setSavingForm(true)
    setFormError('')
    setFormSuccess(false)
    try {
      const res  = await fetch(`/api/monitoring/alert-rules/${rule.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          threshold_value:      threshold,
          consecutive_failures: consecutive,
          cooldown_minutes:     cooldown,
          notif_channels:       channels,
          severity,
        }),
      })
      const data = await res.json()
      if (data.success) {
        onUpdate(prev => prev.map(r => r.id === rule.id ? { ...r, ...data.data } : r))
        setFormSuccess(true)
        setTimeout(() => setFormSuccess(false), 2_000)
      } else {
        setFormError(data.message ?? texts.gagal_simpan)
      }
    } catch {
      setFormError(texts.gagal_simpan)
    } finally { setSavingForm(false) }
  }

  function toggleChannel(ch: string) {
    setChannels(prev =>
      prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch]
    )
  }

  return (
    <div className={`rounded-lg border p-3.5 transition-opacity
      ${!rule.is_active && !isSystemDisabled ? 'opacity-60' : ''}
      ${isSystemDisabled ? 'border-[#EF9F27] bg-[#FFFBF5]' : 'bg-white border-black/10'}
    `}>
      {/* Baris atas: badge alert_type + badge severity + toggle */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertTypeBadge type={rule.alert_type} />
          <SeverityBadge severity={rule.severity} />
          {!rule.is_active && !isSystemDisabled && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#F1EFE8] text-[#5F5E5A]">
              {texts.nonaktif}
            </span>
          )}
          {isSystemDisabled && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#FAEEDA] text-[#854F0B]">
              {texts.dinonaktifkan_sistem}
            </span>
          )}
        </div>
        {/* Toggle is_active — M9: klik OFF → modal konfirmasi */}
        <label className="flex items-center gap-1.5 cursor-pointer">
          {savingToggle && (
            <span className="w-3 h-3 rounded-full border-2 border-[#185FA5] border-t-transparent animate-spin inline-block" />
          )}
          <input
            type="checkbox"
            checked={rule.is_active}
            onChange={e => handleToggleClick(e.target.checked)}
            disabled={savingToggle}
            className="h-4 w-4 accent-[#185FA5]"
          />
          <span className="text-[11px] text-[#6b7280]">{texts.aktif}</span>
        </label>
      </div>

      {/* disabled_reason — hanya tampil jika dinonaktifkan sistem */}
      {isSystemDisabled && (
        <p className="mt-2 text-[11px] text-[#854F0B] leading-snug">
          {rule.disabled_reason}
        </p>
      )}

      {/* M9: Modal konfirmasi nonaktifkan */}
      {showConfirmOff && (
        <ConfirmModal
          judul={texts.confirm_nonaktifkan_rule}
          deskripsi={texts.confirm_nonaktifkan_desc}
          labelKonfirmasi={texts.confirm_ya_nonaktifkan}
          labelBatal={texts.confirm_batal}
          loading={savingToggle}
          onKonfirmasi={() => void doToggle(false)}
          onBatal={() => setShowConfirmOff(false)}
        />
      )}

      {/* Collapsible Pengaturan Lanjutan */}
      <button
        type="button"
        onClick={() => setOpenSettings(o => !o)}
        className="mt-2.5 flex items-center gap-1 text-[11px] text-[#6b7280] hover:text-[#1a1a1a] transition-colors"
      >
        <span className={`transition-transform ${openSettings ? 'rotate-90' : ''}`}>▶</span>
        {texts.pengaturan_lanjutan}
      </button>

      {openSettings && (
        <div className="mt-3 space-y-3 pt-3 border-t border-black/08">
          {/* Threshold + Consecutive + Cooldown */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Threshold',    val: threshold,   set: setThreshold   },
              { label: texts.berturut, val: consecutive, set: setConsecutive },
              { label: texts.cooldown, val: cooldown,    set: setCooldown    },
            ].map(({ label, val, set }) => (
              <label key={label} className="flex flex-col gap-1">
                <span className="text-[11px] text-[#6b7280]">{label}</span>
                <input
                  type="number"
                  value={val}
                  onChange={e => set(Number(e.target.value))}
                  disabled={savingForm}
                  className="rounded border border-black/15 px-2 py-1 text-xs focus:outline-none focus:border-[#185FA5] disabled:opacity-50"
                />
              </label>
            ))}
          </div>

          {/* Notif channels */}
          <div>
            <span className="text-[11px] text-[#6b7280] block mb-1.5">{texts.notifikasi}</span>
            <div className="flex gap-3">
              {['WA', 'EMAIL'].map(ch => (
                <label key={ch} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={channels.includes(ch)}
                    onChange={() => toggleChannel(ch)}
                    disabled={savingForm}
                    className="h-3.5 w-3.5 accent-[#185FA5]"
                  />
                  <span className="text-xs text-[#374151]">{ch}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Severity */}
          <div>
            <span className="text-[11px] text-[#6b7280] block mb-1.5">Severity</span>
            <SeveritySelector value={severity} onChange={setSeverity} disabled={savingForm} />
          </div>

          {/* Tombol Simpan */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleSaveForm}
              disabled={savingForm}
              className="px-3 py-1.5 rounded text-xs font-medium bg-[#185FA5] text-white hover:bg-[#144d87] disabled:opacity-50 transition-colors"
            >
              {savingForm ? texts.menyimpan : texts.simpan}
            </button>
            {formSuccess && <span className="text-[11px] text-[#3B6D11]">{texts.tersimpan}</span>}
          </div>
          {formError && <p className="text-[11px] text-red-500">{formError}</p>}
        </div>
      )}
    </div>
  )
}
