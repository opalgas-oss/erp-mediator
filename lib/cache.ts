/**
 * lib/cache.ts
 * Abstraksi layer cache in-memory untuk platform ERP Mediator Hyperlocal.
 * Mendukung TTL per item, LRU eviction, dan stampede prevention.
 * TIDAK ada dependency ke Firebase/Firestore — pure in-memory.
 */

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

/** Struktur data tiap item yang disimpan di cache */
export interface CacheEntry<T> {
  value: T;
  /** Timestamp (ms) saat item kadaluarsa */
  expiresAt: number;
  /** Timestamp (ms) saat item terakhir diakses — digunakan untuk LRU eviction */
  lastAccessed: number;
}

/** Opsi yang diberikan saat menyimpan item ke cache */
export interface CacheOptions {
  /** Durasi cache dalam milidetik */
  ttlMs: number;
  /** Override jumlah maksimum item dalam cache (opsional) */
  maxSize?: number;
}

// ---------------------------------------------------------------------------
// Preset TTL
// ---------------------------------------------------------------------------

/** Preset durasi TTL yang umum dipakai di seluruh aplikasi */
export const TTL_PRESETS = {
  FIVE_MINUTES: 5 * 60 * 1000,
  FIFTEEN_MINUTES: 15 * 60 * 1000,
  ONE_HOUR: 60 * 60 * 1000,
  SIX_HOURS: 6 * 60 * 60 * 1000,
  ONE_DAY: 24 * 60 * 60 * 1000,
} as const;

// ---------------------------------------------------------------------------
// Class MemoryCache
// ---------------------------------------------------------------------------

/**
 * Cache in-memory generik dengan dukungan TTL, LRU eviction, dan stampede prevention.
 * @template T Tipe data yang disimpan di cache
 */
export class MemoryCache<T> {
  private store: Map<string, CacheEntry<T>>;
  private maxSize: number;
  /** Map untuk mencegah duplicate fetch saat cache miss terjadi bersamaan */
  private pendingFetches: Map<string, Promise<T>>;

  constructor(maxSize: number = 500) {
    this.store = new Map();
    this.maxSize = maxSize;
    this.pendingFetches = new Map();
  }

  /**
   * Ambil item dari cache.
   * @returns Nilai item jika ada dan belum expired, null jika tidak ada atau sudah expired
   */
  get(key: string): T | null {
    const entry = this.store.get(key);
    if (entry === undefined) return null;

    if (Date.now() > entry.expiresAt) {
      // Item sudah expired — hapus dari store
      this.store.delete(key);
      return null;
    }

    // Update lastAccessed untuk keperluan LRU
    entry.lastAccessed = Date.now();
    return entry.value;
  }

  /**
   * Simpan item ke cache.
   * Jika store sudah penuh, LRU eviction dijalankan terlebih dahulu.
   */
  set(key: string, value: T, options: CacheOptions): void {
    const effectiveMaxSize = options.maxSize ?? this.maxSize;

    if (this.store.size >= effectiveMaxSize && !this.store.has(key)) {
      this.evictLRU();
    }

    const now = Date.now();
    this.store.set(key, {
      value,
      expiresAt: now + options.ttlMs,
      lastAccessed: now,
    });
  }

  /**
   * Hapus satu item dari cache berdasarkan key.
   */
  delete(key: string): void {
    this.store.delete(key);
  }

  /**
   * Kosongkan seluruh isi cache.
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Cek apakah key ada di cache dan belum expired.
   * Jika expired, item dihapus dari store dan return false.
   */
  has(key: string): boolean {
    const entry = this.store.get(key);
    if (entry === undefined) return false;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Hapus item dengan nilai lastAccessed paling kecil (paling lama tidak diakses).
   * Dipanggil secara otomatis saat store penuh.
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.store) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey !== null) {
      this.store.delete(oldestKey);
    }
  }

  /**
   * Ambil item dari cache atau fetch dari sumber data jika tidak ada.
   * Stampede prevention: jika ada fetch yang sedang berjalan untuk key yang sama,
   * return Promise yang sama — tidak membuat request duplikat ke database.
   *
   * @param key Key cache
   * @param fetcher Fungsi async yang dipanggil untuk mengambil data dari sumber
   * @param options Opsi TTL dan maxSize
   * @returns Data dari cache atau hasil fetch
   */
  async getOrFetch<U extends T>(
    key: string,
    fetcher: () => Promise<U>,
    options: CacheOptions
  ): Promise<U> {
    // Cek cache terlebih dahulu
    const cached = this.get(key);
    if (cached !== null) return cached as U;

    // Cek apakah fetch untuk key ini sedang berjalan
    const pending = this.pendingFetches.get(key);
    if (pending !== undefined) return pending as Promise<U>;

    // Buat fetch baru dan daftarkan ke pendingFetches
    const fetchPromise = fetcher()
      .then((result: U) => {
        this.set(key, result, options);
        this.pendingFetches.delete(key);
        return result;
      })
      .catch((error: unknown) => {
        // Hapus dari pendingFetches agar caller berikutnya bisa retry
        this.pendingFetches.delete(key);
        throw error;
      });

    this.pendingFetches.set(key, fetchPromise as Promise<T>);
    return fetchPromise;
  }
}

// ---------------------------------------------------------------------------
// Singleton instance siap pakai
// ---------------------------------------------------------------------------

/** Cache untuk Config Registry — maksimum 200 item */
export const configCache = new MemoryCache<unknown>(200);

/** Cache untuk Policy data — maksimum 200 item */
export const policyCache = new MemoryCache<unknown>(200);

/** Cache untuk data session user — maksimum 1000 item */
export const sessionCache = new MemoryCache<unknown>(1000);
