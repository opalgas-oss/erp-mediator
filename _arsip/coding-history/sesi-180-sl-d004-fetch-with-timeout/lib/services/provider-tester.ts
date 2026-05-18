// lib/services/provider-tester.ts — PRE-EDIT ARSIP S#180 SL-D004+K004
// Authenticated test per provider — 1 fungsi per provider (8 total).
// KONDISI PRE-EDIT: makeController() private helper masih ada — belum diekstrak ke fetchWithTimeout

import 'server-only'
import type { HealthStatus, TestKoneksiResult } from '@/lib/types/provider.types'

// ─── Konstanta ───────────────────────────────────────────────────────────────

const TIMEOUT_MS = 10_000

// ─── Helper internal ─────────────────────────────────────────────────────────

function makeController(): { signal: AbortSignal; clear: () => void } {
  const ac    = new AbortController()
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS)
  return { signal: ac.signal, clear: () => clearTimeout(timer) }
}

function buildResult(
  berhasil:         boolean,
  is_authenticated: boolean | null,
  pesan:            string | null,
  latency_ms:       number
): TestKoneksiResult {
  let health_status: HealthStatus
  if (!berhasil)                      health_status = 'gagal'
  else if (is_authenticated === true) health_status = 'sehat'
  else                                health_status = 'peringatan'

  return { berhasil, is_authenticated, health_status, pesan, latency_ms }
}

// ─── 1. Supabase ─────────────────────────────────────────────────────────────

async function testSupabase(creds: Record<string, string>): Promise<TestKoneksiResult> {
  const { project_url, service_role_key } = creds
  if (!project_url || !service_role_key)
    return buildResult(false, null, 'Credential tidak lengkap (project_url + service_role_key wajib)', 0)
  const start = Date.now()
  const { signal, clear } = makeController()
  try {
    const url = `${project_url.replace(/\/$/, '')}/rest/v1/`
    const res = await fetch(url, {
      headers: { apikey: service_role_key, Authorization: `Bearer ${service_role_key}`, 'Content-Type': 'application/json' },
      signal,
    }).finally(clear)
    const latency_ms = Date.now() - start
    if (res.ok) return buildResult(true, true, null, latency_ms)
    if (res.status === 401 || res.status === 403) return buildResult(true, false, `Service role key tidak valid (HTTP ${res.status})`, latency_ms)
    return buildResult(true, false, `Server merespons HTTP ${res.status}`, latency_ms)
  } catch (err) { clear(); return buildResult(false, null, err instanceof Error ? err.message : 'Koneksi gagal', Date.now() - start) }
}

async function testUpstash(creds: Record<string, string>): Promise<TestKoneksiResult> {
  const { rest_url, rest_token } = creds
  if (!rest_url || !rest_token) return buildResult(false, null, 'Credential tidak lengkap (rest_url + rest_token wajib)', 0)
  const start = Date.now()
  const { signal, clear } = makeController()
  try {
    const url = `${rest_url.replace(/\/$/, '')}/ping`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${rest_token}` }, signal }).finally(clear)
    const latency_ms = Date.now() - start
    if (res.ok) {
      const body = await res.json().catch(() => null)
      if (body?.result === 'PONG') return buildResult(true, true, null, latency_ms)
      return buildResult(true, false, 'Server merespons tapi bukan PONG — periksa rest_token', latency_ms)
    }
    if (res.status === 401) return buildResult(true, false, 'REST token Upstash tidak valid', latency_ms)
    return buildResult(true, false, `Server merespons HTTP ${res.status}`, latency_ms)
  } catch (err) { clear(); return buildResult(false, null, err instanceof Error ? err.message : 'Koneksi gagal', Date.now() - start) }
}

async function testCloudinary(creds: Record<string, string>): Promise<TestKoneksiResult> {
  const { cloud_name, api_key, api_secret } = creds
  if (!cloud_name || !api_key || !api_secret)
    return buildResult(false, null, 'Credential tidak lengkap (cloud_name + api_key + api_secret wajib)', 0)
  const start = Date.now()
  const { signal, clear } = makeController()
  try {
    const auth = Buffer.from(`${api_key}:${api_secret}`).toString('base64')
    const url  = `https://api.cloudinary.com/v1_1/${cloud_name}/ping`
    const res  = await fetch(url, { headers: { Authorization: `Basic ${auth}` }, signal }).finally(clear)
    const latency_ms = Date.now() - start
    if (res.ok) {
      const body = await res.json().catch(() => null)
      if (body?.status === 'ok') return buildResult(true, true, null, latency_ms)
      return buildResult(true, false, 'Ping sukses tapi respons tidak sesuai — periksa api_key/api_secret', latency_ms)
    }
    if (res.status === 401 || res.status === 403) return buildResult(true, false, 'API key atau secret Cloudinary tidak valid', latency_ms)
    return buildResult(true, false, `Server merespons HTTP ${res.status}`, latency_ms)
  } catch (err) { clear(); return buildResult(false, null, err instanceof Error ? err.message : 'Koneksi gagal', Date.now() - start) }
}

async function testXendit(creds: Record<string, string>): Promise<TestKoneksiResult> {
  const { secret_key } = creds
  if (!secret_key) return buildResult(false, null, 'Credential tidak lengkap (secret_key wajib)', 0)
  const start = Date.now()
  const { signal, clear } = makeController()
  try {
    const auth = Buffer.from(`${secret_key}:`).toString('base64')
    const res  = await fetch('https://api.xendit.co/balance', { headers: { Authorization: `Basic ${auth}` }, signal }).finally(clear)
    const latency_ms = Date.now() - start
    if (res.ok) return buildResult(true, true, null, latency_ms)
    if (res.status === 401) return buildResult(true, false, 'Secret key Xendit tidak valid', latency_ms)
    if (res.status === 403) return buildResult(true, false, 'Akses ditolak Xendit — periksa mode (sandbox/production) dan permission', latency_ms)
    return buildResult(true, false, `Server merespons HTTP ${res.status}`, latency_ms)
  } catch (err) { clear(); return buildResult(false, null, err instanceof Error ? err.message : 'Koneksi gagal', Date.now() - start) }
}

async function testFonnte(creds: Record<string, string>): Promise<TestKoneksiResult> {
  const { api_token } = creds
  if (!api_token) return buildResult(false, null, 'Credential tidak lengkap (api_token wajib)', 0)
  const start = Date.now()
  const { signal, clear } = makeController()
  try {
    const res = await fetch('https://api.fonnte.com/device', { headers: { Authorization: api_token }, signal }).finally(clear)
    const latency_ms = Date.now() - start
    if (res.ok) {
      const body = await res.json().catch(() => null)
      if (body?.status === true) return buildResult(true, true, null, latency_ms)
      if (body?.status === false) return buildResult(true, false, body?.reason ?? 'Token Fonnte tidak valid atau device tidak terdaftar', latency_ms)
      return buildResult(true, true, null, latency_ms)
    }
    if (res.status === 401 || res.status === 403) return buildResult(true, false, 'Token Fonnte tidak valid', latency_ms)
    return buildResult(true, false, `Server merespons HTTP ${res.status}`, latency_ms)
  } catch (err) { clear(); return buildResult(false, null, err instanceof Error ? err.message : 'Koneksi gagal', Date.now() - start) }
}

async function testTypesense(creds: Record<string, string>): Promise<TestKoneksiResult> {
  const { host, port, protocol = 'https', admin_api_key } = creds
  if (!host || !admin_api_key) return buildResult(false, null, 'Credential tidak lengkap (host + admin_api_key wajib)', 0)
  const start = Date.now()
  const { signal, clear } = makeController()
  try {
    const portStr = port ? `:${port}` : ''
    const baseUrl = `${protocol}://${host}${portStr}`
    const res = await fetch(`${baseUrl}/collections`, { headers: { 'X-TYPESENSE-API-KEY': admin_api_key }, signal }).finally(clear)
    const latency_ms = Date.now() - start
    if (res.ok) return buildResult(true, true, null, latency_ms)
    if (res.status === 401 || res.status === 403) return buildResult(true, false, 'Admin API key Typesense tidak valid', latency_ms)
    return buildResult(true, false, `Server merespons HTTP ${res.status}`, latency_ms)
  } catch (err) { clear(); return buildResult(false, null, err instanceof Error ? err.message : 'Koneksi gagal', Date.now() - start) }
}

async function testCloudflare(creds: Record<string, string>): Promise<TestKoneksiResult> {
  const { api_token, zone_id } = creds
  if (!api_token) return buildResult(false, null, 'Credential tidak lengkap (api_token wajib)', 0)
  const start = Date.now()
  const { signal, clear } = makeController()
  try {
    const url = zone_id ? `https://api.cloudflare.com/client/v4/zones/${zone_id}` : `https://api.cloudflare.com/client/v4/user`
    const res  = await fetch(url, { headers: { Authorization: `Bearer ${api_token}` }, signal }).finally(clear)
    const latency_ms = Date.now() - start
    const body = await res.json().catch(() => null)
    if (res.ok && body?.success === true) return buildResult(true, true, null, latency_ms)
    if (res.status === 401 || (body && !body.success)) {
      const errMsg = body?.errors?.[0]?.message ?? 'API token Cloudflare tidak valid'
      return buildResult(true, false, errMsg, latency_ms)
    }
    return buildResult(true, false, `Server merespons HTTP ${res.status}`, latency_ms)
  } catch (err) { clear(); return buildResult(false, null, err instanceof Error ? err.message : 'Koneksi gagal', Date.now() - start) }
}

// testSmtp — tidak pakai makeController (TCP/TLS socket, bukan HTTP fetch) — tidak diubah
async function testSmtp(creds: Record<string, string>): Promise<TestKoneksiResult> {
  return buildResult(false, null, '[ARSIP PLACEHOLDER] — lihat file kode aktual untuk implementasi lengkap testSmtp', 0)
}

export async function testProvider(providerKode: string, credentials: Record<string, string>): Promise<TestKoneksiResult> {
  switch (providerKode) {
    case 'supabase':   return testSupabase(credentials)
    case 'upstash':    return testUpstash(credentials)
    case 'cloudinary': return testCloudinary(credentials)
    case 'xendit':     return testXendit(credentials)
    case 'fonnte':     return testFonnte(credentials)
    case 'typesense':  return testTypesense(credentials)
    case 'cloudflare': return testCloudflare(credentials)
    case 'smtp':       return testSmtp(credentials)
    default:
      return buildResult(false, null, `Provider '${providerKode}' tidak dikenali di provider-tester`, 0)
  }
}
