// lib/services/provider-tester.ts
// Authenticated test per provider — 1 fungsi per provider (8 total).
// Menerima credentials plaintext yang sudah didekripsi oleh caller.
// TIDAK import dari credential.service — hindari circular dependency.
// Dibuat: Sesi #109 — M3 Step 5.2b Authenticated Test

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

  const start        = Date.now()
  const { signal, clear } = makeController()

  try {
    const url = `${project_url.replace(/\/$/, '')}/rest/v1/`
    const res = await fetch(url, {
      headers: {
        apikey:         service_role_key,
        Authorization:  `Bearer ${service_role_key}`,
        'Content-Type': 'application/json',
      },
      signal,
    }).finally(clear)

    const latency_ms = Date.now() - start

    if (res.ok)
      return buildResult(true, true, null, latency_ms)
    if (res.status === 401 || res.status === 403)
      return buildResult(true, false, `Service role key tidak valid (HTTP ${res.status})`, latency_ms)

    return buildResult(true, false, `Server merespons HTTP ${res.status}`, latency_ms)

  } catch (err) {
    clear()
    return buildResult(false, null, err instanceof Error ? err.message : 'Koneksi gagal', Date.now() - start)
  }
}

// ─── 2. Upstash ──────────────────────────────────────────────────────────────

async function testUpstash(creds: Record<string, string>): Promise<TestKoneksiResult> {
  const { rest_url, rest_token } = creds

  if (!rest_url || !rest_token)
    return buildResult(false, null, 'Credential tidak lengkap (rest_url + rest_token wajib)', 0)

  const start        = Date.now()
  const { signal, clear } = makeController()

  try {
    const url = `${rest_url.replace(/\/$/, '')}/ping`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${rest_token}` },
      signal,
    }).finally(clear)

    const latency_ms = Date.now() - start

    if (res.ok) {
      const body = await res.json().catch(() => null)
      if (body?.result === 'PONG')
        return buildResult(true, true, null, latency_ms)
      // Server merespons 200 tapi bukan PONG — mungkin token partial-valid
      return buildResult(true, false, 'Server merespons tapi bukan PONG — periksa rest_token', latency_ms)
    }

    if (res.status === 401)
      return buildResult(true, false, 'REST token Upstash tidak valid', latency_ms)

    return buildResult(true, false, `Server merespons HTTP ${res.status}`, latency_ms)

  } catch (err) {
    clear()
    return buildResult(false, null, err instanceof Error ? err.message : 'Koneksi gagal', Date.now() - start)
  }
}

// ─── 3. Cloudinary ───────────────────────────────────────────────────────────

async function testCloudinary(creds: Record<string, string>): Promise<TestKoneksiResult> {
  const { cloud_name, api_key, api_secret } = creds

  if (!cloud_name || !api_key || !api_secret)
    return buildResult(false, null, 'Credential tidak lengkap (cloud_name + api_key + api_secret wajib)', 0)

  const start        = Date.now()
  const { signal, clear } = makeController()

  try {
    const auth = Buffer.from(`${api_key}:${api_secret}`).toString('base64')
    const url  = `https://api.cloudinary.com/v1_1/${cloud_name}/ping`
    const res  = await fetch(url, {
      headers: { Authorization: `Basic ${auth}` },
      signal,
    }).finally(clear)

    const latency_ms = Date.now() - start

    if (res.ok) {
      const body = await res.json().catch(() => null)
      if (body?.status === 'ok')
        return buildResult(true, true, null, latency_ms)
      return buildResult(true, false, 'Ping sukses tapi respons tidak sesuai — periksa api_key/api_secret', latency_ms)
    }

    if (res.status === 401 || res.status === 403)
      return buildResult(true, false, 'API key atau secret Cloudinary tidak valid', latency_ms)

    return buildResult(true, false, `Server merespons HTTP ${res.status}`, latency_ms)

  } catch (err) {
    clear()
    return buildResult(false, null, err instanceof Error ? err.message : 'Koneksi gagal', Date.now() - start)
  }
}

// ─── 4. Xendit ───────────────────────────────────────────────────────────────

async function testXendit(creds: Record<string, string>): Promise<TestKoneksiResult> {
  const { secret_key } = creds

  if (!secret_key)
    return buildResult(false, null, 'Credential tidak lengkap (secret_key wajib)', 0)

  const start        = Date.now()
  const { signal, clear } = makeController()

  try {
    // Xendit pakai HTTP Basic Auth: username = secret_key, password = kosong
    const auth = Buffer.from(`${secret_key}:`).toString('base64')
    const res  = await fetch('https://api.xendit.co/balance', {
      headers: { Authorization: `Basic ${auth}` },
      signal,
    }).finally(clear)

    const latency_ms = Date.now() - start

    if (res.ok)
      return buildResult(true, true, null, latency_ms)

    if (res.status === 401)
      return buildResult(true, false, 'Secret key Xendit tidak valid', latency_ms)

    if (res.status === 403)
      return buildResult(true, false, 'Akses ditolak Xendit — periksa mode (sandbox/production) dan permission', latency_ms)

    return buildResult(true, false, `Server merespons HTTP ${res.status}`, latency_ms)

  } catch (err) {
    clear()
    return buildResult(false, null, err instanceof Error ? err.message : 'Koneksi gagal', Date.now() - start)
  }
}

// ─── 5. Fonnte ───────────────────────────────────────────────────────────────

async function testFonnte(creds: Record<string, string>): Promise<TestKoneksiResult> {
  const { api_token } = creds

  if (!api_token)
    return buildResult(false, null, 'Credential tidak lengkap (api_token wajib)', 0)

  const start        = Date.now()
  const { signal, clear } = makeController()

  try {
    // Fonnte: Authorization header langsung berisi token (bukan Bearer)
    const res = await fetch('https://api.fonnte.com/device', {
      headers: { Authorization: api_token },
      signal,
    }).finally(clear)

    const latency_ms = Date.now() - start

    if (res.ok) {
      const body = await res.json().catch(() => null)
      if (body?.status === true)
        return buildResult(true, true, null, latency_ms)
      if (body?.status === false)
        return buildResult(true, false, body?.reason ?? 'Token Fonnte tidak valid atau device tidak terdaftar', latency_ms)
      // Format respons tidak dikenali tapi 200 — anggap OK
      return buildResult(true, true, null, latency_ms)
    }

    if (res.status === 401 || res.status === 403)
      return buildResult(true, false, 'Token Fonnte tidak valid', latency_ms)

    return buildResult(true, false, `Server merespons HTTP ${res.status}`, latency_ms)

  } catch (err) {
    clear()
    return buildResult(false, null, err instanceof Error ? err.message : 'Koneksi gagal', Date.now() - start)
  }
}

// ─── 6. Typesense ────────────────────────────────────────────────────────────

async function testTypesense(creds: Record<string, string>): Promise<TestKoneksiResult> {
  const { host, port, protocol = 'https', admin_api_key } = creds

  if (!host || !admin_api_key)
    return buildResult(false, null, 'Credential tidak lengkap (host + admin_api_key wajib)', 0)

  const start        = Date.now()
  const { signal, clear } = makeController()

  try {
    const portStr = port ? `:${port}` : ''
    const baseUrl = `${protocol}://${host}${portStr}`
    // GET /collections butuh auth — endpoint yang paling tepat untuk verifikasi admin_api_key
    const res = await fetch(`${baseUrl}/collections`, {
      headers: { 'X-TYPESENSE-API-KEY': admin_api_key },
      signal,
    }).finally(clear)

    const latency_ms = Date.now() - start

    if (res.ok)
      return buildResult(true, true, null, latency_ms)

    if (res.status === 401 || res.status === 403)
      return buildResult(true, false, 'Admin API key Typesense tidak valid', latency_ms)

    return buildResult(true, false, `Server merespons HTTP ${res.status}`, latency_ms)

  } catch (err) {
    clear()
    return buildResult(false, null, err instanceof Error ? err.message : 'Koneksi gagal', Date.now() - start)
  }
}

// ─── 7. Cloudflare ───────────────────────────────────────────────────────────

async function testCloudflare(creds: Record<string, string>): Promise<TestKoneksiResult> {
  const { api_token, zone_id } = creds

  if (!api_token)
    return buildResult(false, null, 'Credential tidak lengkap (api_token wajib)', 0)

  const start        = Date.now()
  const { signal, clear } = makeController()

  try {
    // Jika zone_id tersedia: test akses ke zone spesifik (lebih akurat)
    // Jika tidak: test akses ke user endpoint (cukup untuk verifikasi token valid)
    const url = zone_id
      ? `https://api.cloudflare.com/client/v4/zones/${zone_id}`
      : `https://api.cloudflare.com/client/v4/user`

    const res  = await fetch(url, {
      headers: { Authorization: `Bearer ${api_token}` },
      signal,
    }).finally(clear)

    const latency_ms = Date.now() - start
    const body = await res.json().catch(() => null)

    if (res.ok && body?.success === true)
      return buildResult(true, true, null, latency_ms)

    if (res.status === 401 || (body && !body.success)) {
      const errMsg = body?.errors?.[0]?.message ?? 'API token Cloudflare tidak valid'
      return buildResult(true, false, errMsg, latency_ms)
    }

    return buildResult(true, false, `Server merespons HTTP ${res.status}`, latency_ms)

  } catch (err) {
    clear()
    return buildResult(false, null, err instanceof Error ? err.message : 'Koneksi gagal', Date.now() - start)
  }
}

// ─── 8. SMTP ─────────────────────────────────────────────────────────────────
// Menggunakan raw TCP (net) atau TLS socket (tls) — bukan nodemailer.
// Melakukan AUTH PLAIN terhadap SMTP server untuk verifikasi credential nyata.

async function testSmtp(creds: Record<string, string>): Promise<TestKoneksiResult> {
  const { host, port: portStr, username, password, encryption } = creds

  if (!host || !username || !password)
    return buildResult(false, null, 'Credential tidak lengkap (host + username + password wajib)', 0)

  const port   = parseInt(portStr || '587', 10)
  const useTls = encryption === 'ssl' || port === 465
  const start  = Date.now()

  return new Promise<TestKoneksiResult>((resolve) => {
    let settled = false
    const finish = (result: TestKoneksiResult) => {
      if (settled) return
      settled = true
      resolve(result)
    }

    const globalTimer = setTimeout(() => {
      finish(buildResult(false, null, `SMTP timeout (${TIMEOUT_MS / 1000}s) — server tidak merespons`, Date.now() - start))
    }, TIMEOUT_MS)

    // AUTH PLAIN: base64(\0username\0password)
    const authPlain = Buffer.from(`\0${username}\0${password}`).toString('base64')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onSocket = (socket: any) => {
      let buf  = ''
      let step = 0   // 0=greeting 1=ehlo 2=auth

      socket.on('data', (chunk: Buffer) => {
        buf += chunk.toString()
        const lines = buf.split('\r\n')
        buf = lines.pop() ?? ''    // simpan baris terakhir yang belum lengkap

        for (const line of lines) {
          if (!line) continue

          if (step === 0 && line.startsWith('220')) {
            // Greeting diterima → kirim EHLO
            socket.write('EHLO tester.erp\r\n')
            step = 1

          } else if (step === 1 && /^250 /.test(line)) {
            // Final line EHLO response → kirim AUTH PLAIN
            socket.write(`AUTH PLAIN ${authPlain}\r\n`)
            step = 2

          } else if (step === 2) {
            clearTimeout(globalTimer)
            socket.write('QUIT\r\n')
            socket.destroy()

            const code = parseInt(line.substring(0, 3), 10)

            if (code === 235)
              return finish(buildResult(true, true, null, Date.now() - start))

            if (code === 530)
              return finish(buildResult(true, false, 'Server mengharuskan STARTTLS terlebih dahulu — ubah encryption ke TLS', Date.now() - start))

            if (code === 504 || code === 502)
              return finish(buildResult(true, false, `AUTH PLAIN tidak didukung server ini (${code}) — periksa setting encryption`, Date.now() - start))

            // 535 atau kode error lain
            return finish(buildResult(true, false, `Auth gagal: ${line.trim()}`, Date.now() - start))
          }
        }
      })

      socket.on('error', (err: Error) => {
        clearTimeout(globalTimer)
        if (step === 0)
          finish(buildResult(false, null, `Tidak bisa terhubung ke ${host}:${port} — ${err.message}`, Date.now() - start))
        else
          finish(buildResult(true, false, `Socket error saat autentikasi: ${err.message}`, Date.now() - start))
      })

      socket.on('close', () => {
        if (!settled) {
          clearTimeout(globalTimer)
          finish(buildResult(true, false, 'Koneksi ditutup server sebelum auth selesai', Date.now() - start))
        }
      })
    }

    const onConnectError = (err: Error) => {
      clearTimeout(globalTimer)
      finish(buildResult(false, null, `Tidak bisa terhubung ke SMTP ${host}:${port} — ${err.message}`, Date.now() - start))
    }

    if (useTls) {
      import('tls').then(({ connect }) => {
        const socket = connect({ host, port, rejectUnauthorized: false }, () => onSocket(socket))
        socket.on('error', onConnectError)
      }).catch((err: Error) => onConnectError(err))
    } else {
      import('net').then(({ createConnection }) => {
        const socket = createConnection({ host, port }, () => onSocket(socket))
        socket.on('error', onConnectError)
      }).catch((err: Error) => onConnectError(err))
    }
  })
}

// ─── Router utama ─────────────────────────────────────────────────────────────

/**
 * Jalankan authenticated test untuk provider tertentu.
 * Menerima credentials plaintext yang sudah didekripsi oleh caller.
 * Tidak import credential.service — menghindari circular dependency.
 *
 * @param providerKode  kode provider (supabase / upstash / cloudinary / xendit / fonnte / typesense / cloudflare / smtp)
 * @param credentials   map field_key → nilai plaintext (sudah didekripsi)
 * @returns             TestKoneksiResult — health_status, is_authenticated, pesan, latency_ms
 */
export async function testProvider(
  providerKode: string,
  credentials:  Record<string, string>
): Promise<TestKoneksiResult> {
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
