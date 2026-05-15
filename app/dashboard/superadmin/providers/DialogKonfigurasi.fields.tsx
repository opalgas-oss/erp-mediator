'use client'
// app/dashboard/superadmin/providers/DialogKonfigurasi.fields.tsx
// Komponen rendering field credential + panduan kontekstual per-field + info box footer
// Update S#152: panduan inline per-field (collapsible), fix 2-col layout saat ada panduan
// Dibuat: Sesi #151

import { useState } from 'react'
import { Input }       from '@/components/ui/input'
import { Label }       from '@/components/ui/label'
import { Button }      from '@/components/ui/button'
import { ICON_ACTION } from '@/lib/constants/icons.constant'
import type { ProviderFieldDef, PanduanLangkah } from '@/lib/types/provider.types'

// ─── Helper: smart 2-column grouping ─────────────────────────────────────────

export function groupFields(defs: ProviderFieldDef[]): ProviderFieldDef[][] {
  const rows: ProviderFieldDef[][] = []
  let i = 0
  while (i < defs.length) {
    const f = defs[i], next = defs[i + 1]
    if (!f.is_secret && f.tipe !== 'url' && next && !next.is_secret && next.tipe !== 'url') {
      rows.push([f, next]); i += 2
    } else { rows.push([f]); i++ }
  }
  return rows
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface CredFieldsProps {
  fieldRows:  ProviderFieldDef[][]
  formCred:   Record<string, string>
  showFields: Record<string, boolean>
  onChange:   (id: string, val: string) => void
  onToggle:   (id: string) => void
}

// ─── InlinePanduan ────────────────────────────────────────────────────────────
// Panel "Cara mendapatkan credential" — muncul inline di bawah setiap field
// yang punya panduan_langkah. Toggle buka/tutup per field.

interface InlinePanduanProps {
  panduan:  PanduanLangkah[]
  isOpen:   boolean
  onToggle: () => void
}

function InlinePanduan({ panduan, isOpen, onToggle }: InlinePanduanProps) {
  return (
    <div style={{ marginTop: 3 }}>
      {/* Toggle button */}
      <button
        type="button"
        onClick={onToggle}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 10, fontWeight: 500, color: '#185FA5',
          background: 'none', border: 'none', cursor: 'pointer',
          padding: '2px 0', lineHeight: 1.4,
        }}
      >
        <span style={{ fontSize: 12, lineHeight: 1 }}>📋</span>
        Cara mendapatkan
        <span style={{
          fontSize: 9, marginLeft: 1, opacity: 0.7,
          transition: 'transform 0.15s',
          display: 'inline-block',
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
        }}>▼</span>
      </button>

      {/* Expandable steps */}
      {isOpen && (
        <div style={{
          marginTop: 6,
          background: '#F0F7FF',
          border: '0.5px solid #C3DCF5',
          borderRadius: 8,
          padding: '10px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}>
          {panduan.map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <div style={{
                width: 18, height: 18, borderRadius: '50%',
                background: '#185FA5', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, flexShrink: 0, marginTop: 1,
              }}>
                {step.no}
              </div>
              <span
                style={{ fontSize: 11, color: '#1e3a5f', lineHeight: 1.6 }}
                dangerouslySetInnerHTML={{
                  __html: step.teks.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'),
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── SingleField ──────────────────────────────────────────────────────────────
// Satu field credential lengkap: label + input + deskripsi + panduan inline

interface SingleFieldProps {
  f:              ProviderFieldDef
  formCred:       Record<string, string>
  showFields:     Record<string, boolean>
  openPanduan:    Record<string, boolean>
  onChange:       (id: string, val: string) => void
  onToggle:       (id: string) => void
  onTogglePanduan:(id: string) => void
}

function SingleField({ f, formCred, showFields, openPanduan, onChange, onToggle, onTogglePanduan }: SingleFieldProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* Label */}
      <Label htmlFor={f.id} style={{ fontSize: 11, fontWeight: 500, color: '#1a1a1a' }}>
        {f.label}
        {f.is_required && <span style={{ color: '#A32D2D' }}> *</span>}
        {f.is_secret   && <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 400 }}> · terenkripsi</span>}
      </Label>

      {/* Input + toggle mata */}
      <div style={{ display: 'flex', gap: 6 }}>
        <Input
          id={f.id}
          type={f.is_secret && !showFields[f.id] ? 'password' : 'text'}
          placeholder={f.placeholder ?? ''}
          value={formCred[f.id] ?? ''}
          onChange={e => onChange(f.id, e.target.value)}
          autoComplete="new-password"
          style={{ flex: 1, height: 40, fontSize: 13 }}
        />
        {f.is_secret && (
          <Button
            type="button" size="sm" variant="ghost"
            style={{ height: 40, width: 40, padding: 0, flexShrink: 0 }}
            onClick={() => onToggle(f.id)}
            title={showFields[f.id] ? 'Sembunyikan' : 'Tampilkan nilai sementara'}
          >
            {showFields[f.id] ? <ICON_ACTION.hide size={15} /> : <ICON_ACTION.show size={15} />}
          </Button>
        )}
      </div>

      {/* Deskripsi singkat */}
      {f.deskripsi && (
        <p style={{ fontSize: 10, color: '#9ca3af' }}>{f.deskripsi}</p>
      )}

      {/* Panduan inline — hanya tampil jika field ini punya langkah */}
      {f.panduan_langkah && f.panduan_langkah.length > 0 && (
        <InlinePanduan
          panduan={f.panduan_langkah}
          isOpen={openPanduan[f.id] ?? false}
          onToggle={() => onTogglePanduan(f.id)}
        />
      )}
    </div>
  )
}

// ─── CredentialFields ────────────────────────────────────────────────────────

export function CredentialFields({ fieldRows, formCred, showFields, onChange, onToggle }: CredFieldsProps) {
  // Semua panduan mulai tertutup — user buka sesuai kebutuhan per field
  const [openPanduan, setOpenPanduan] = useState<Record<string, boolean>>({})

  const hasSecret     = fieldRows.some(row => row.some(f => f.is_secret))
  const onTogglePanduan = (id: string) => setOpenPanduan(p => ({ ...p, [id]: !p[id] }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* ── Section header: CREDENTIAL ── */}
      <div style={{ borderTop: '0.5px solid rgba(0,0,0,0.08)', paddingTop: 14, marginBottom: 10 }}>
        <p style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Credential
        </p>
      </div>

      {/* ── Field rows ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {fieldRows.map((row, ri) => {
          // Jika ada field dalam baris ini yang punya panduan → force 1-column full-width
          // supaya panel panduan tidak terpotong di layout 2-kolom sempit
          const anyPanduan = row.some(f => f.panduan_langkah?.length)
          const is2Col     = row.length === 2 && !anyPanduan

          return (
            <div
              key={ri}
              style={
                is2Col
                  ? { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }
                  : { display: 'flex', flexDirection: 'column', gap: 12 }
              }
            >
              {row.map(f => (
                <SingleField
                  key={f.id}
                  f={f}
                  formCred={formCred}
                  showFields={showFields}
                  openPanduan={openPanduan}
                  onChange={onChange}
                  onToggle={onToggle}
                  onTogglePanduan={onTogglePanduan}
                />
              ))}
            </div>
          )
        })}
      </div>

      {/* ── Note ikon mata — muncul sekali di bawah semua fields ── */}
      {hasSecret && (
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
          <div style={{
            width: 18, height: 18, borderRadius: 4, background: '#F1EFE8',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, marginTop: 1,
          }}>
            <ICON_ACTION.show size={11} style={{ color: '#6b7280' }} />
          </div>
          <p style={{ fontSize: 10, color: '#9ca3af', lineHeight: 1.5 }}>
            Ikon mata: tampilkan/sembunyikan nilai sementara saat mengetik.
            Setelah disimpan hanya 4 karakter terakhir yang terlihat — jika lupa, generate token baru di dashboard provider.
          </p>
        </div>
      )}
    </div>
  )
}

// ─── PanduanSection (standalone — dipertahankan untuk kompatibilitas) ─────────

interface PanduanProps {
  panduan:      PanduanLangkah[]
  providerNama: string
}

export function PanduanSection({ panduan, providerNama }: PanduanProps) {
  return (
    <div style={{ borderTop: '0.5px solid rgba(0,0,0,0.08)', paddingTop: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 500, color: '#1a1a1a', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
        <span>📋</span>
        Cara mendapatkan credential {providerNama}
      </div>
      <div style={{ background: '#f9f9f8', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 8, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 7 }}>
        {panduan.map((step, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#E6F1FB', color: '#185FA5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, flexShrink: 0, marginTop: 1 }}>
              {step.no}
            </div>
            <span style={{ fontSize: 11, color: '#374151', lineHeight: 1.6 }}
              dangerouslySetInnerHTML={{ __html: step.teks.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── SaveButtonInfo ───────────────────────────────────────────────────────────

export function SaveButtonInfo() {
  return (
    <div style={{ background: '#f9f9f8', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 8, padding: '8px 12px', width: '100%' }}>
      <p style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>
        Yang terjadi saat klik Simpan &amp; Test Koneksi
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
        {[
          ['①', 'Credential dienkripsi AES-256-GCM → disimpan ke DB'],
          ['②', 'Koneksi ditest ke server provider (maks. 8 detik)'],
          ['③', 'Hasil: Sehat / Auth error / Gagal — tampil di dialog'],
          ['④', 'Dialog tertutup otomatis 1.5 detik jika berhasil'],
        ].map(([num, text]) => (
          <div key={num} style={{ display: 'flex', gap: 5, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#185FA5', flexShrink: 0 }}>{num}</span>
            <span style={{ fontSize: 10, color: '#6b7280', lineHeight: 1.5 }}>{text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
