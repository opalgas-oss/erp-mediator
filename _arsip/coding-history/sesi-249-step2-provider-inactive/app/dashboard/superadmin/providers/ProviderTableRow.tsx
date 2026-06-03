'use client'
// app/dashboard/superadmin/providers/ProviderTableRow.tsx
// Satu baris tabel provider — dipecah dari ProvidersClient.tsx S#151 (ATURAN 9)
// Dibuat: Sesi #151

import { HealthBadge } from '@/components/superadmin/HealthBadge'
import type { ServiceProvider } from '@/lib/types/provider.types'

const TAG_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  wajib:      { bg: '#FCEBEB', text: '#A32D2D', border: '#F09595' },
  disarankan: { bg: '#FAEEDA', text: '#854F0B', border: '#EF9F27' },
  opsional:   { bg: '#F1EFE8', text: '#5F5E5A', border: '#B4B2A9' },
}

const KATEGORI_LABEL: Record<string, string> = {
  database:'Database', cache:'Cache', media:'Media & Storage',
  payment:'Payment Gateway', messaging:'Notifikasi WA', email:'Email',
  search:'Pencarian', cdn:'CDN & WAF', management:'API Management', queue:'Cron Scheduler',
}

interface Props {
  provider:  ServiceProvider
  onOpen:    (p: ServiceProvider) => void
}

export function ProviderTableRow({ provider: p, onOpen }: Props) {
  const isConfigured = p.health_overall !== 'belum_dites'
  const isEnv        = p.kode === 'qstash'
  const tagSt        = TAG_STYLE[p.tag] ?? TAG_STYLE.opsional

  return (
    <tr
      style={{ borderTop: '0.5px solid rgba(0,0,0,0.07)', cursor: 'pointer' }}
      onClick={() => onOpen(p)}
      onMouseEnter={e => (e.currentTarget.style.background = '#f9f9f8')}
      onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
    >
      <td style={{ padding: '12px 14px' }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>{p.nama}</div>
        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{p.deskripsi ?? KATEGORI_LABEL[p.kategori]}</div>
      </td>
      <td style={{ padding: '12px 14px' }}>
        <span style={{ display:'inline-flex', alignItems:'center', padding:'2px 8px', borderRadius:100, fontSize:10, fontWeight:500, background:tagSt.bg, color:tagSt.text, border:`0.5px solid ${tagSt.border}` }}>
          {isEnv ? 'via .env' : p.tag.toUpperCase()}
        </span>
      </td>
      <td style={{ padding: '12px 14px' }}>
        <HealthBadge status={p.health_overall} size="sm" />
      </td>
      <td style={{ padding: '12px 14px', fontSize: 12, color: isConfigured ? '#1a1a1a' : '#9ca3af' }}>
        {isConfigured ? '1 instance' : '—'}
      </td>
      <td style={{ padding: '12px 14px', fontSize: 11, color: '#9ca3af' }}>—</td>
      <td style={{ padding: '12px 14px', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
        <button
          onClick={() => onOpen(p)}
          style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'5px 12px', borderRadius:8, fontSize:12, cursor:'pointer', borderWidth:'0.5px', borderStyle:'solid', fontFamily:'inherit', background:isConfigured?'#fff':'#E6F1FB', color:isConfigured?'#1a1a1a':'#185FA5', borderColor:isConfigured?'rgba(0,0,0,0.22)':'#85B7EB' }}
        >
          {isConfigured ? '⚙ Kelola' : '+ Setup'}
        </button>
      </td>
    </tr>
  )
}
