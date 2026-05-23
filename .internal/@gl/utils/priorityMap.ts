type PriorityEntry<K, V> = {
  key: K;
  value: V;
  priority: number;
};

export class PriorityMap<K, V> {
  private map: Map<K, PriorityEntry<K, V>> = new Map();

  set(key: K, value: V, priority: number): V {
    this.map.set(key, { key, value, priority });
    return value;
  }

  get<S extends V>(key: K): S | undefined {
    const entry = this.map.get(key);
    return entry ? (entry.value as S) : undefined;
  }

  has(key: K): boolean {
    return this.map.has(key);
  }

  delete(key: K): boolean {
    return this.map.delete(key);
  }

  clear(): void {
    this.map.clear();
  }

  keys(): K[] {
    return this.sortedEntries().map((entry) => entry.key);
  }

  values(): V[] {
    return this.sortedEntries().map((entry) => entry.value);
  }

  entries(): [K, V][] {
    return this.sortedEntries().map((entry) => [entry.key, entry.value]);
  }

  private sortedEntries(): PriorityEntry<K, V>[] {
    return Array.from(this.map.values()).sort(
      (a, b) => a.priority - b.priority,
    );
  }

  get size(): number {
    return this.map.size;
  }

  [Symbol.iterator](): Iterator<[K, V]> {
    return this.entries()[Symbol.iterator]();
  }
}
