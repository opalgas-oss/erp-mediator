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

// ─── FUNGSI: enkripsiCredential ──────────────────────────────────────────────────
// Envelope Encryption — setiap credential punya DEK unik.
// DEK dienkripsi Master Key (KEK). Nilai dienkripsi DEK.
// Sesuai CREDENTIAL_SYSTEM_SPEC BAB 3.2 — Sesi #107
//
// Return:
//   encrypted_dek   — DEK terenkripsi Master Key (simpan di DB)
//   encrypted_value — nilai terenkripsi DEK (simpan di DB)
//   fingerprint     — 4 karakter terakhir nilai asli (tampil di UI)
export function enkripsiCredential(nilai: string): {
  encrypted_dek:   string
  encrypted_value: string
  fingerprint:     string
} {
  const masterKey = getMasterKey()

  // 1. Generate DEK random (32 bytes) — unik per credential
  const dek = randomBytes(32)

  // 2. Enkripsi nilai dengan DEK
  const ivVal     = randomBytes(IV_LENGTH)
  const cipherVal = createCipheriv(ALGORITHM, dek, ivVal)
  const encVal    = Buffer.concat([cipherVal.update(nilai, 'utf8'), cipherVal.final()])
  const tagVal    = cipherVal.getAuthTag()
  const encrypted_value = Buffer.concat([ivVal, tagVal, encVal]).toString('base64')

  // 3. Enkripsi DEK dengan Master Key
  const ivDek     = randomBytes(IV_LENGTH)
  const cipherDek = createCipheriv(ALGORITHM, masterKey, ivDek)
  const encDek    = Buffer.concat([cipherDek.update(dek), cipherDek.final()])
  const tagDek    = cipherDek.getAuthTag()
  const encrypted_dek = Buffer.concat([ivDek, tagDek, encDek]).toString('base64')

  return {
    encrypted_dek,
    encrypted_value,
    fingerprint: fingerprint(nilai),
  }
}

// ─── FUNGSI: dekripsiCredential ──────────────────────────────────────────────────
// Kebalikan enkripsiCredential — decrypt DEK dulu, lalu decrypt nilai.
// Dipanggil dari CredentialService — TIDAK dari repository atau route.
// Sesi #107
export function dekripsiCredential(encrypted_dek: string, encrypted_value: string): string {
  const masterKey = getMasterKey()

  // 1. Decrypt DEK dengan Master Key
  const bufDek    = Buffer.from(encrypted_dek, 'base64')
  const ivDek     = bufDek.subarray(0, IV_LENGTH)
  const tagDek    = bufDek.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
  const encDek    = bufDek.subarray(IV_LENGTH + TAG_LENGTH)
  const decDek    = createDecipheriv(ALGORITHM, masterKey, ivDek)
  decDek.setAuthTag(tagDek)
  const dek = Buffer.concat([decDek.update(encDek), decDek.final()])

  // 2. Decrypt nilai dengan DEK
  const bufVal    = Buffer.from(encrypted_value, 'base64')
  const ivVal     = bufVal.subarray(0, IV_LENGTH)
  const tagVal    = bufVal.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
  const encVal    = bufVal.subarray(IV_LENGTH + TAG_LENGTH)
  const decVal    = createDecipheriv(ALGORITHM, dek, ivVal)
  decVal.setAuthTag(tagVal)
  return Buffer.concat([decVal.update(encVal), decVal.final()]).toString('utf8')
}
