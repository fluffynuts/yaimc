import { CacheItem } from "./cacheItem";

export type Optional<T> = T | undefined;
export type Func<T> = (() => T);

export interface Dictionary<T> {
  [key: string]: T;
}

export interface ICache {
  /**
   * The number of items in the cache.
   */
  readonly count: number;
  /**
   * The keys of all items in the cache.
   */
  readonly keys: string[];
  /**
   * When set to a non-zero value, the cache
   * will automatically trim on that interval.
   * If you're using this from within node and
   * want a clean exit, you MUST set this back
   * to zero before quitting, otherwise.
   * Expired items are evicted when code
   * attempts to access them, so the only reason
   * to use this is to free memory on long-running
   * processes where the cache gets large and keys
   * are not regularly re-used.
   */
  trimIntervalSeconds: number;

  /**
   * Attempt to read a value from the cache, returning
   * the provided fallback (or undefined if not provided)
   * when encountering a cache-miss.
   * @param key
   * @param fallback
   */
  read<T>(key: string, fallback?: T): Optional<T>;

  /**
   * Write a value to the cache, providing an absolute
   * timeout
   * @param key
   * @param value
   * @param ttlSeconds
   */
  write<T>(key: string, value: T, ttlSeconds: number): void;

  /**
   * Extends the lifetime of the cached item by the
   * original ttl
   */
  touch(key: string): void;

  /**
   * Runs the generator if there is no cache item with
   * the provided key and stores the result. Subsequent
   * calls will skip the generator function to retrieve
   * from cache until the item expires.
   * @param key
   * @param generator
   * @param ttlSeconds
   */
  through<T>(
    key: string,
    generator: Func<Promise<T>>,
    ttlSeconds: number
  ): Promise<T>;

  /**
   * Runs the generator if there is no cache item with
   * the provided key and stores the result. Subsequent
   * calls will skip the generator function to retrieve
   * from cache until the item expires.
   * @param key
   * @param generator
   * @param ttlSeconds
   */
  throughSync<T>(
    key: string,
    generator: Func<T>,
    ttlSeconds: number
  ): T;

  /**
   * trims expired items from the cache
   */
  trim(): void;

  /**
   * forgets the cached item by key
   * @param key
   */
  forget(key: string): void;

  /**
   * clears all cached values
   */
  clear(): void;
}

export class Cache
  implements ICache {

  /**
   * The number of items in the cache.
   */
  public get count(): number {
    return this.keys.length;
  }

  /**
   * The keys of all items in the cache.
   */
  public get keys(): string[] {
    return Object.keys(this._store);
  }

  private _store = {} as Dictionary<CacheItem>;

  /**
   * When set to a non-zero value, the cache
   * will automatically trim on that interval.
   * If you're using this from within node and
   * want a clean exit, you MUST set this back
   * to zero before quitting, otherwise.
   * Expired items are evicted when code
   * attempts to access them, so the only reason
   * to use this is to free memory on long-running
   * processes where the cache gets large and keys
   * are not regularly re-used.
   */
  public get trimIntervalSeconds(): number {
    return this._trimInterval;
  }

  /**
   * When set to a non-zero value, the cache
   * will automatically trim on that interval.
   * If you're using this from within node and
   * want a clean exit, you MUST set this back
   * to zero before quitting, otherwise.
   * Expired items are evicted when code
   * attempts to access them, so the only reason
   * to use this is to free memory on long-running
   * processes where the cache gets large and keys
   * are not regularly re-used.
   */
  public set trimIntervalSeconds(value: number) {
    this._trimInterval = value;
    if (this._trimTimer !== undefined) {
      clearInterval(this._trimTimer);
      this._trimTimer = undefined;
    }
    if (value <= 0) {
      return;
    }
    this._trimTimer = setInterval(
      () => this.trim(),
      value * 1000
    );
  }

  private _trimInterval = 0;
  private _trimTimer: any;

  /**
   * Attempt to read a value from the cache, returning
   * the provided fallback (or undefined if not provided)
   * when encountering a cache-miss.
   * @param key
   * @param fallback
   */
  public read<T>(key: string, fallback?: T | undefined): Optional<T> {
    const cached = this._findCacheItem(key);
    return cached === undefined
      ? fallback
      : cached.value;
  }

  /**
   * clears all cached values
   */
  public clear(): void {
    this._store = {};
  }

  /**
   * Write a value to the cache, providing an absolute
   * timeout
   * @param key
   * @param value
   * @param ttlSeconds
   */
  public write<T>(key: string, value: T, ttlSeconds: number): void {
    this._store[key] = new CacheItem(value, ttlSeconds);
  }

  public touch(key: string): void {
    const item = this._findCacheItem(key);
    if (item) {
      item.extendLifetime();
    }
  }

  /**
   * Runs the generator if there is no cache item with
   * the provided key and stores the result. Subsequent
   * calls will skip the generator function to retrieve
   * from cache until the item expires.
   * @param key
   * @param generator
   * @param ttlSeconds
   */
  public async through<T>(key: string, generator: Func<Promise<T>>, ttlSeconds: number): Promise<T> {
    const cached = this._findCacheItem(key);
    if (cached) {
      return cached.value;
    }
    const result = await generator();
    this.write(key, result, ttlSeconds);
    return result;
  }

  /**
   * Runs the generator if there is no cache item with
   * the provided key and stores the result. Subsequent
   * calls will skip the generator function to retrieve
   * from cache until the item expires.
   * @param key
   * @param generator
   * @param ttlSeconds
   */
  public throughSync<T>(key: string, generator: Func<T>, ttlSeconds: number): T {
    const cached = this._findCacheItem(key);
    if (cached) {
      return cached.value;
    }
    const result = generator();
    this.write(key, result, ttlSeconds);
    return result;
  }

  private _findCacheItem(key: string): CacheItem | undefined {
    const result = this._store[key];
    if (result === undefined) {
      return undefined;
    }
    if (result.expires < Date.now()) {
      this.forget(key);
      return undefined;
    }
    return result;
  }

  /**
   * trims expired items from the cache
   */
  public trim(): void {
    for (const key of Object.keys(this._store)) {
      const item = this._store[key];
      if (item.expires < Date.now()) {
        this.forget(key);
      }
    }
  }

  /**
   * forgets the cached item by key
   * @param key
   */
  public forget(key: string): void {
    delete this._store[key];
  }
}

export const cache = new Cache();
