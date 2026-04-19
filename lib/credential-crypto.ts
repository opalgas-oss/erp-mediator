// lib/credential-crypto.ts
// Enkripsi dan dekripsi credential service menggunakan AES-256-GCM.
// MASTER_ENCRYPTION_KEY disimpan di Vercel env vars — TIDAK PERNAH masuk database.
// Semua operasi hanya boleh berjalan di server-side.

import 'server-only'
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM  = 'aes-256-gcm'
const IV_LENGTH  = 12  // 96-bit IV — rekomendasi NIST untuk GCM
const TAG_LENGTH = 16  // 128-bit authentication tag

// ─── Ambil dan validasi Master Key dari env ───────────────────────────────────
function getMasterKey(): Buffer {
  const keyHex = process.env.MASTER_ENCRYPTION_KEY
  if (!keyHex) {
    throw new Error(
      'MASTER_ENCRYPTION_KEY tidak ada di environment. ' +
      'Jalankan: node scripts/seed-credentials.mjs untuk generate otomatis.'
    )
  }
  const key = Buffer.from(keyHex.replace(/^0x/, ''), 'hex')
  if (key.length !== 32) {
    throw new Error('MASTER_ENCRYPTION_KEY harus 32 bytes (64 hex chars)')
  }
  return key
}

// ─── FUNGSI: enkripsi ─────────────────────────────────────────────────────────
// Input : nilai plaintext (API key, token, password)
// Output: base64(iv + authTag + ciphertext) — ini yang disimpan di database
export function enkripsi(plaintext: string): string {
  const masterKey = getMasterKey()
  const iv        = randomBytes(IV_LENGTH)
  const cipher    = createCipheriv(ALGORITHM, masterKey, iv)

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()

  // Gabungkan iv + authTag + ciphertext → encode base64
  return Buffer.concat([iv, authTag, encrypted]).toString('base64')
}

// ─── FUNGSI: dekripsi ─────────────────────────────────────────────────────────
// Input : base64(iv + authTag + ciphertext) dari database
// Output: nilai plaintext asli
export function dekripsi(ciphertext: string): string {
  const masterKey = getMasterKey()
  const buf       = Buffer.from(ciphertext, 'base64')

  const iv        = buf.subarray(0, IV_LENGTH)
  const authTag   = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
  const encrypted = buf.subarray(IV_LENGTH + TAG_LENGTH)

  const decipher = createDecipheriv(ALGORITHM, masterKey, iv)
  decipher.setAuthTag(authTag)

  return decipher.update(encrypted).toString('utf8') + decipher.final('utf8')
}

// ─── FUNGSI: fingerprint ──────────────────────────────────────────────────────
// Ambil 4 karakter terakhir nilai asli — ditampilkan di UI tanpa expose full value
// Contoh: 'xnd_production_abc123xyz' → '...xyz'
export function fingerprint(value: string): string {
  if (!value || value.length <= 4) return '****'
  return `...${value.slice(-4)}`
}
