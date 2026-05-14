'use client'

// app/dashboard/superadmin/tenants/[id]/TabPICHistory.tsx
// Tab PIC & Riwayat — 2 kartu PIC aktif + timeline pergantian
// Style: inline design token (konsisten dengan Tab Info Umum/Kontrak Sewa/Kategori)
//
// Dibuat: Sesi #132 — M6 FASE 3 Step 3.7
// Diupdate: Sesi #141 — style konsistensi mockup (placeholder untuk Fase D)

import { useState, useEffect } from 'react'
import { toast }               from 'sonner'
import type { TenantPICTabData } from '@/lib/types/tenant-pic.types'

interface Props { tenantId: string }

// ─── Shared style helpers (sama dengan Tab Info Umum) ────────────────────────

const S = {
  card:    { background: '#fff', borderWidth: '0.5px', borderStyle: 'solid' as const, borderColor: 'rgba(0,0,0,0.12)', borderRadius: 12 } as React.CSSProperties,
  label:   { fontSize: 11, color: '#6b7280', fontWeight: 500 as const, textTransform: 'uppercase' as const, letterSpacing: 0.4 } as React.CSSProperties,
  meta:    { fontSize: 12, color: '#6b7280' } as React.CSSProperties,
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function Badge({ variant, label }: { variant: 'active' | 'warning' | 'empty'; label: string }) {
  const style =
    variant === 'active'  ? { bg: '#EAF3DE', text: '#3B6D11', border: '#97C459', icon: 'ti-circle-check' } :
    variant === 'warning' ? { bg: '#FAEEDA', text: '#854F0B', border: '#EF9F27', icon: 'ti-alert-triangle' } :
                            { bg: '#f9f9f8', text: '#6b7280', border: 'rgba(0,0,0,0.12)', icon: 'ti-circle-dashed' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 100, fontSize: 11, fontWeight: 500,
      background: style.bg, color: style.text,
      borderWidth: '0.5px', borderStyle: 'solid', borderColor: style.border,
    }}>
      <i className={`ti ${style.icon}`} style={{ fontSize: 11 }} />
      {label}
    </span>
  )
}

// ─── Kartu PIC ────────────────────────────────────────────────────────────────

interface PICCardProps {
  title:        string
  iconColor:    string
  iconBg:       string
  pic:          { user_name: string; user_email: string | null; user_wa: string | null; jabatan?: string | null } | null
  emptyMessage: string
  warning?:     boolean
}

function PICCard({ title, iconColor, iconBg, pic, emptyMessage, warning }: PICCardProps) {
  return (
    <div style={{
      ...S.card,
      padding: 16,
      ...(warning ? { background: '#FAEEDA', borderColor: '#EF9F27' } : {}),
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: iconBg, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
            <i className="ti ti-user" />
          </div>
          <span style={S.label}>{title}</span>
        </div>
        {pic
          ? <Badge variant="active" label="Aktif" />
          : <Badge variant={warning ? 'warning' : 'empty'} label={warning ? 'Tidak ada' : 'Kosong'} />}
      </div>

      {pic ? (
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a', marginBottom: 4 }}>{pic.user_name}</div>
          {pic.jabatan && <div style={{ ...S.meta, marginBottom: 6 }}>{pic.jabatan}</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {pic.user_email && (
              <div style={{ ...S.meta, display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="ti ti-mail" style={{ fontSize: 12 }} />
                {pic.user_email}
              </div>
            )}
            {pic.user_wa && (
              <div style={{ ...S.meta, display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="ti ti-brand-whatsapp" style={{ fontSize: 12 }} />
                {pic.user_wa}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 13, color: warning ? '#854F0B' : '#9ca3af', fontStyle: 'italic' }}>
          {emptyMessage}
        </div>
      )}
    </div>
  )
}

// ─── Skeleton loading ─────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        {[1, 2].map(i => (
          <div key={i} style={{ ...S.card, padding: 16, height: 130, background: 'linear-gradient(90deg, #f9f9f8 0%, #f3f4f6 50%, #f9f9f8 100%)' }} />
        ))}
      </div>
      <div style={{ ...S.card, height: 200, background: 'linear-gradient(90deg, #f9f9f8 0%, #f3f4f6 50%, #f9f9f8 100%)' }} />
    </div>
  )
}

// ─── Komponen utama ───────────────────────────────────────────────────────────

export function TabPICHistory({ tenantId }: Props) {
  const [data,    setData]    = useState<TenantPICTabData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const res  = await fetch(`/api/superadmin/tenants/${tenantId}/change-pic`)
        const json = await res.json()
        if (json.success) setData(json.data)
      } catch {
        toast.error('Gagal memuat data PIC')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [tenantId])

  if (loading) return <Skeleton />

  if (!data) return (
    <div style={{ ...S.card, padding: 24, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
      Gagal memuat data PIC.
    </div>
  )

  return (
    <div>

      {/* Warning bar — jika tidak ada PIC cadangan */}
      {data.ada_peringatan && (
        <div style={{
          background: '#FAEEDA',
          borderWidth: '0.5px', borderStyle: 'solid', borderColor: '#EF9F27',
          borderRadius: 8,
          padding: '8px 14px',
          fontSize: 12,
          color: '#854F0B',
          marginBottom: '1rem',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <i className="ti ti-alert-triangle" />
          Tenant ini tidak memiliki PIC cadangan. Disarankan menambah backup PIC untuk kelangsungan operasional.
        </div>
      )}

      {/* Kartu PIC — 2 kolom */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: '1rem' }}>
        <PICCard
          title="PIC Utama"
          iconColor="#185FA5"
          iconBg="#E6F1FB"
          pic={data.pic_utama}
          emptyMessage="Belum ada PIC utama"
        />
        <PICCard
          title="PIC Cadangan"
          iconColor="#534AB7"
          iconBg="#EEEDFE"
          pic={data.pic_cadangan}
          emptyMessage="Disarankan menambah PIC cadangan"
          warning={!data.pic_cadangan}
        />
      </div>

      {/* Timeline pergantian */}
      <div style={{ ...S.card, overflow: 'hidden' }}>
        <div style={{
          padding: '12px 16px',
          background: '#f9f9f8',
          borderBottomWidth: '0.5px',
          borderBottomStyle: 'solid',
          borderBottomColor: 'rgba(0,0,0,0.12)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: '#F1EFE8', color: '#5F5E5A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
            <i className="ti ti-history" />
          </div>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>
            Riwayat pergantian PIC
          </div>
          <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 'auto' }}>{data.timeline.length} entri</span>
        </div>

        {data.timeline.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <i className="ti ti-history" style={{ fontSize: 28, color: '#9ca3af', display: 'block', marginBottom: 8 }} />
            <div style={{ fontSize: 13, color: '#6b7280' }}>Belum ada riwayat pergantian PIC.</div>
          </div>
        ) : (
          <div style={{ padding: '8px 16px 16px' }}>
            {data.timeline.map((entry, idx) => (
              <div key={entry.id} style={{ display: 'flex', gap: 12, padding: '12px 0' }}>
                {/* Garis vertikal timeline */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 16, flexShrink: 0 }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: '#97C459',
                    borderWidth: '0.5px', borderStyle: 'solid', borderColor: '#3B6D11',
                    marginTop: 4, zIndex: 1,
                  }} />
                  {idx < data.timeline.length - 1 && (
                    <div style={{ width: 1, background: 'rgba(0,0,0,0.12)', flex: 1, marginTop: 4 }} />
                  )}
                </div>
                {/* Konten */}
                <div style={{ flex: 1, paddingBottom: 4 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a', marginBottom: 3 }}>{entry.nama_pic}</div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>
                    {entry.tipe_pic} · {entry.tipe_event}
                    {entry.alasan ? ` · ${entry.alasan}` : ''}
                  </div>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>
                    {new Date(entry.started_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {entry.ended_at && ` – ${new Date(entry.ended_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
