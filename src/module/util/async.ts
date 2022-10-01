export const PENDING = Symbol("PENDING_FETCH");

// Simple caching mechanism for handling async fetchable values for a certain length of time
export class FetcherCache<K, V> {
  // Default cache time is 30 seconds
  constructor(private readonly fetch_func: (arg: K) => Promise<V>, private readonly timeout: number = 30_000) {}

  // The currently cached value
  private cached_values: Map<K, Promise<V>> = new Map();
  private cached_resolved_values: Map<K, V> = new Map();

  // Holds the expiration time of specified keys. Repeated access will keep alive for longer
  private timeout_map: Map<K, number> = new Map();

  // Updates the timeout map for the specified key to be now + timeout
  private stroke_timer(key: K) {
    this.timeout_map.set(key, Date.now() + this.timeout);
  }
  // Fetch the value iff it is currently cached.
  peek(arg: K): V | null {
    this.stroke_timer(arg);
    return this.cached_resolved_values.get(arg) ?? null;
  }

  // Fetch value using the specified key. Returns a promise that resolves to the getters lookup function
  async fetch(key: K): Promise<V> {
    // Pre-emptively set-timer + cleanup
    this.stroke_timer(key);
    this.cleanup();

    // Check if we have cached data. If so, yield. If not, create
    let cached = this.cached_values.get(key);
    if (cached) {
      return cached;
    } else {
      let new_val_promise = this.fetch_func(key);
      this.cached_values.set(key, new_val_promise);
      new_val_promise.then(resolved => this.cached_resolved_values.set(key, resolved));
      return new_val_promise;
    }
  }

  // As peek, but startes a fetch job if value is not yet
  sync_fetch(key: K): V | typeof PENDING {
    let peeked = this.peek(key);
    if (peeked === null) {
      this.fetch(key);
      return PENDING;
    } else {
      return peeked;
    }
  }

  // Do we have this value resolved?
  has_resolved(arg: K): boolean {
    return this.cached_resolved_values.has(arg);
  }

  // Destroys all entries that should be destroyed
  private cleanup() {
    let now = Date.now();
    for (let [arg, expire] of this.timeout_map.entries()) {
      if (expire < now) {
        this.timeout_map.delete(arg);
        this.cached_values.delete(arg);
      }
    }
  }

  // Destroy a particular cached value
  public flush(arg: K) {
    this.cached_values.delete(arg);
    this.cached_resolved_values.delete(arg);
    this.timeout_map.delete(arg);
  }

  // Destroy all entries, period.
  public flush_all() {
    this.cached_values.clear();
    this.cached_resolved_values.clear();
    this.timeout_map.clear();
  }
}
