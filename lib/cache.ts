/**
 * lib/cache.ts
 * Abstraksi layer cache untuk platform ERP Mediator Hyperlocal.
 *
 * PERUBAHAN dari versi sebelumnya:
 *   - Tambah withUnstableCache() — wrapper unstable_cache dari next/cache
 *   - Tambah withRequestCache() — wrapper react.cache() untuk dedup per request
 *   - MemoryCache tetap ada sebagai utility (development + testing)
 *   - Komentar diperjelas: MemoryCache tidak efektif di production Vercel
 *     karena setiap serverless invocation punya memory terpisah
 */

import { unstable_cache } from 'next/cache'
import { cache } from 'react'

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface CacheEntry<T> {
  value: T
  /** Timestamp (ms) saat item kadaluarsa */
  expiresAt: number
  /** Timestamp (ms) saat item terakhir diakses — untuk LRU eviction */
  lastAccessed: number
}

export interface CacheOptions {
  /** Durasi cache dalam milidetik */
  ttlMs: number
  /** Override jumlah maksimum item dalam cache (opsional) */
  maxSize?: number
}

// ---------------------------------------------------------------------------
// Preset TTL
// ---------------------------------------------------------------------------

export const TTL_PRESETS = {
  FIVE_MINUTES:    5  * 60 * 1000,
  FIFTEEN_MINUTES: 15 * 60 * 1000,
  ONE_HOUR:        60 * 60 * 1000,
  SIX_HOURS:       6  * 60 * 60 * 1000,
  ONE_DAY:         24 * 60 * 60 * 1000,
} as const

// ---------------------------------------------------------------------------
// Helper 1: withUnstableCache
// ---------------------------------------------------------------------------

/**
 * Wrapper unstable_cache dari next/cache.
 * Dipakai untuk cache lintas request di Vercel serverless — efektif di production.
 * TTL dalam detik (bukan ms — berbeda dari TTL_PRESETS).
 *
 * Contoh pakai:
 *   const getData = withUnstableCache(fetchFn, ['key'], { revalidate: 900, tags: ['tag'] })
 *   const result = await getData()
 */
export function withUnstableCache<T>(
  fn: () => Promise<T>,
  keys: string[],
  options: { revalidate?: number; tags?: string[] }
): () => Promise<T> {
  return unstable_cache(fn, keys, options)
}

// ---------------------------------------------------------------------------
// Helper 2: withRequestCache
// ---------------------------------------------------------------------------

/**
 * Wrapper react.cache() — deduplication per request.
 * Fungsi yang sama dipanggil berkali-kali dalam satu request → hanya eksekusi sekali.
 * Tidak persisten lintas request.
 *
 * Contoh pakai:
 *   export const getUser = withRequestCache(async (id: string) => fetchUser(id))
 */
export function withRequestCache<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>
): (...args: TArgs) => Promise<TReturn> {
  return cache(fn)
}

// ---------------------------------------------------------------------------
// Class MemoryCache
// ---------------------------------------------------------------------------

/**
 * Cache in-memory generik dengan TTL, LRU eviction, dan stampede prevention.
 *
 * ⚠️ CATATAN PRODUCTION:
 * MemoryCache hanya efektif di development (satu proses Node.js).
 * Di production Vercel, setiap serverless invocation punya memory terpisah —
 * cache ini tidak shared antar invocation.
 * Untuk production, gunakan withUnstableCache() atau withRequestCache().
 */
export class MemoryCache<T> {
  private store: Map<string, CacheEntry<T>>
  private maxSize: number
  private pendingFetches: Map<string, Promise<T>>

  constructor(maxSize: number = 500) {
    this.store = new Map()
    this.maxSize = maxSize
    this.pendingFetches = new Map()
  }

  get(key: string): T | null {
    const entry = this.store.get(key)
    if (entry === undefined) return null

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return null
    }

    entry.lastAccessed = Date.now()
    return entry.value
  }

  set(key: string, value: T, options: CacheOptions): void {
    const effectiveMaxSize = options.maxSize ?? this.maxSize

    if (this.store.size >= effectiveMaxSize && !this.store.has(key)) {
      this.evictLRU()
    }

    const now = Date.now()
    this.store.set(key, {
      value,
      expiresAt:    now + options.ttlMs,
      lastAccessed: now,
    })
  }

  delete(key: string): void {
    this.store.delete(key)
  }

  clear(): void {
    this.store.clear()
  }

  has(key: string): boolean {
    const entry = this.store.get(key)
    if (entry === undefined) return false

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return false
    }

    return true
  }

  private evictLRU(): void {
    let oldestKey: string | null = null
    let oldestTime = Infinity

    for (const [key, entry] of this.store) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed
        oldestKey  = key
      }
    }

    if (oldestKey !== null) {
      this.store.delete(oldestKey)
    }
  }

  async getOrFetch<U extends T>(
    key: string,
    fetcher: () => Promise<U>,
    options: CacheOptions
  ): Promise<U> {
    const cached = this.get(key)
    if (cached !== null) return cached as U

    const pending = this.pendingFetches.get(key)
    if (pending !== undefined) return pending as Promise<U>

    const fetchPromise = fetcher()
      .then((result: U) => {
        this.set(key, result, options)
        this.pendingFetches.delete(key)
        return result
      })
      .catch((error: unknown) => {
        this.pendingFetches.delete(key)
        throw error
      })

    this.pendingFetches.set(key, fetchPromise as Promise<T>)
    return fetchPromise
  }
}

// ---------------------------------------------------------------------------
// Singleton instance siap pakai
// ---------------------------------------------------------------------------

/** Cache untuk Config Registry — maksimum 200 item */
export const configCache = new MemoryCache<unknown>(200)

/** Cache untuk Policy data — maksimum 200 item */
export const policyCache = new MemoryCache<unknown>(200)

/** Cache untuk data session user — maksimum 1000 item */
export const sessionCache = new MemoryCache<unknown>(1000)