// lib/guards/menu-catalog.guard.test.ts
// GUARD BUILD-TIME 2-ARAH anti menu-yatim — Dashboard SuperAdmin (role_scope = 'super_admin').
// Dijalankan via `npm run prebuild` (vitest run lib/guards) SEBELUM `next build`.
// GAGAL-MERAH = build berhenti. Menggantikan warning-console-dev 1-arah SA_KNOWN_MENU_KEYS (S#407).
//
// Mekanisme (Pilihan A, DISETUJUI Philips S#408; SPEC_TABEL_MENU_KATALOG Bagian 8.2):
//   (a) DB -> kode : tiap baris dashboard_menus is_active (super_admin) WAJIB resolve ke page NYATA
//                    ATAU placeholder resmi catch-all settings/[...slug] = LOLOS.
//   (b) kode -> DB : tiap page app/dashboard/superadmin/** WAJIB punya baris dashboard_menus
//                    ATAU exempt otomatis (segmen route dinamis [id]/[uid]/[...slug] + landing).
//   Katalog dibaca LIVE dari Supabase (sinkron-A). DB tak terjangkau / env kosong -> GAGAL-MERAH.
//
// ENV: process.env dulu (Vercel inject var saat build), fallback baca .env.development.local sendiri
//      (prebuild lokal tidak meload .env otomatis; nol dependency baru). Keduanya kosong -> GAGAL-MERAH.
//
// Scope = super_admin (pengganti 1:1 SA_KNOWN_MENU_KEYS). AT/Vendor/Customer = perluasan sesi lain.
// Dibuat: Sesi #409 — L4 HUTANG-MENU-VISIBILITAS-GOVERNANCE.

import { readFileSync, existsSync, readdirSync } from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import { describe, it, expect } from 'vitest'
import { resolveMenuHref, SA_SETTINGS_BASE } from '@/lib/constants/menu-route.constant'

const ROLE_SCOPE    = 'super_admin'
const SA_ROUTE_ROOT = '/dashboard/superadmin'
const SA_APP_DIR    = path.resolve(process.cwd(), 'app/dashboard/superadmin')
const ENV_FILE      = path.resolve(process.cwd(), '.env.development.local')

// ─── Env Supabase: process.env -> fallback .env.development.local ──────────────
function parseEnvFile(file: string): Record<string, string> {
  if (!existsSync(file)) return {}
  const out: Record<string, string> = {}
  for (const raw of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    let val   = line.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    out[key] = val
  }
  return out
}

function readSupabaseEnv(): { url: string; serviceKey: string } {
  let url        = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  let serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  if (!url || !serviceKey) {
    const f    = parseEnvFile(ENV_FILE)
    url        = url || (f.NEXT_PUBLIC_SUPABASE_URL ?? '')
    serviceKey = serviceKey || (f.SUPABASE_SERVICE_ROLE_KEY ?? '')
  }
  if (!url || !serviceKey) {
    throw new Error(
      '[menu-guard] Env Supabase kosong (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY). ' +
      'Set di process.env atau .env.development.local. GAGAL-MERAH.',
    )
  }
  return { url, serviceKey }
}

// ─── Scan filesystem: route tiap page.tsx di bawah app/dashboard/superadmin ────
interface PageRoute { route: string; dynamic: boolean }

function scanPageRoutes(dir: string, rel: string[] = []): PageRoute[] {
  const routes: PageRoute[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      routes.push(...scanPageRoutes(path.join(dir, entry.name), [...rel, entry.name]))
    } else if (entry.name === 'page.tsx') {
      const dynamic = rel.some(seg => seg.includes('['))
      const route   = rel.length ? `${SA_ROUTE_ROOT}/${rel.join('/')}` : SA_ROUTE_ROOT
      routes.push({ route, dynamic })
    }
  }
  return routes
}

interface MenuRow {
  menu_key:     string
  route_path:   string | null
  feature_flag: string | null
  is_active:    boolean
}

describe('Guard katalog menu SA (2-arah, live Supabase)', () => {
  it('DB<->kode sinkron: nol menu-yatim & nol page tanpa baris', async () => {
    // 1. Katalog LIVE
    const { url, serviceKey } = readSupabaseEnv()
    const supabase = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data, error } = await supabase
      .from('dashboard_menus')
      .select('menu_key, route_path, feature_flag, is_active')
      .eq('role_scope', ROLE_SCOPE)
      .is('deleted_at', null)

    if (error) {
      throw new Error(`[menu-guard] Query dashboard_menus gagal: ${error.message}. GAGAL-MERAH.`)
    }
    const rows = (data ?? []) as MenuRow[]
    if (rows.length === 0) {
      throw new Error('[menu-guard] 0 baris super_admin di dashboard_menus — DB tak sinkron. GAGAL-MERAH.')
    }

    // 2. Filesystem
    const pages            = scanPageRoutes(SA_APP_DIR)
    const staticRoutes     = new Set(pages.filter(p => !p.dynamic).map(p => p.route))
    const settingsCatchAll = existsSync(path.join(SA_APP_DIR, 'settings', '[...slug]', 'page.tsx'))
    const dbRoutes         = new Set(rows.map(r => resolveMenuHref(r.route_path, r.feature_flag)))

    // 3. Arah (a) DB -> kode: baris is_active leaf (punya route_path/feature_flag) harus resolve
    const orphanDbRows = rows
      .filter(r => r.is_active && (r.route_path || r.feature_flag)) // lewati grup/header murni
      .filter(r => {
        const href = resolveMenuHref(r.route_path, r.feature_flag)
        if (staticRoutes.has(href)) return false                            // page nyata
        if (settingsCatchAll && href.startsWith(`${SA_SETTINGS_BASE}/`)) return false // placeholder resmi
        return true
      })
      .map(r => `${r.menu_key} -> ${resolveMenuHref(r.route_path, r.feature_flag)}`)

    // 4. Arah (b) kode -> DB: page non-dinamis (kecuali landing) harus punya baris
    const orphanPages = pages
      .filter(p => !p.dynamic && p.route !== SA_ROUTE_ROOT)
      .map(p => p.route)
      .filter(route => !dbRoutes.has(route))

    expect(
      orphanDbRows,
      `Baris menu is_active tanpa page nyata/placeholder (DB->kode): ${orphanDbRows.join(', ') || '-'}`,
    ).toEqual([])
    expect(
      orphanPages,
      `Page SA tanpa baris dashboard_menus (kode->DB): ${orphanPages.join(', ') || '-'}`,
    ).toEqual([])
  })
})
