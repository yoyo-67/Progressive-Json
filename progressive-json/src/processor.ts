import { fetchJson } from "./fetch-json";
import type {
  ProgressiveChunkMessage,
  StreamProcessorOptions,
  PlaceholderStore,
} from "./resolve-placeholder";
import { filterPlaceholders } from "./utils/filter-placeholders";
import { findPlaceholders, RefPathMap, PlaceholderPath } from "./utils/find-placeholders";
import { isPlaceholder } from "./utils/is-placeholder";

export class Processor<T extends PlaceholderStore = PlaceholderStore> {
  private store: T | undefined;
  private options: StreamProcessorOptions<T>;
  private decoder = new TextDecoder();
  private listeners: Array<() => void> = [];
  private refStore: RefPathMap = {};

  constructor(options: StreamProcessorOptions<T>) {
    this.options = options;
    this.store = options.initialStore;

    if (this.store) {
      this.updateRefStore(this.store);
    }

    fetchJson(options.url, this);
  }

  // --- Public API ---

  getStore(): T | undefined {
    return this.store;
  }

  getRefStore(): RefPathMap {
    return this.refStore;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  processChunk(chunk: Uint8Array): void {
    const text = this.decoder.decode(chunk, { stream: true });
    for (const line of text.split("\n")) {
      if (!this.store) {
        this.store = {} as T;
      }

      this.store = this.handleStreamLine(line, this.store);
      this.store = { ...this.store };
      this.notifyListeners();
    }
  }

  // --- Internals ---

  private notifyListeners() {
    this.listeners.forEach((listener) => listener());
  }

  private normalizeRefKey(key: string): string {
    return key.startsWith("ref") ? key : `ref${key}`;
  }

  private getRefIdFromKey(refKey: string): number | null {
    const match = refKey.match(/^ref\$(\d+)$/);
    return match ? Number(match[1]) : null;
  }

  private updateRefStore(store: T) {
    const found = findPlaceholders(store);
    Object.entries(found).forEach(([refId, path]) => {
      this.refStore[Number(refId)] = path;
    });
  }

  private updateStoreAtPath(store: T, path: PlaceholderPath, value: unknown) {
    let obj: unknown = store;
    for (let i = 0; i < path.length - 1; i++) {
      if (typeof obj === "object" && obj !== null) {
        obj = (obj as Record<string, unknown>)[path[i]];
      }
    }
    if (typeof obj === "object" && obj !== null) {
      (obj as Record<string, unknown>)[path[path.length - 1]] = value;
    }
  }

  private applyRefUpdate(store: T, key: string, value: unknown): T {
    const refKey = this.normalizeRefKey(key);
    const refId = this.getRefIdFromKey(refKey);
    if (refId == null) return store;

    const path = this.refStore[refId];
    if (!path) return store;

    this.updateStoreAtPath(store, path, value);
    this.updateRefStore(store);
    return store;
  }

  private applyStreamUpdate(store: T, key: string, value: string): T {
    const refKey = this.normalizeRefKey(key);
    const refId = this.getRefIdFromKey(refKey);
    if (refId == null) return store;

    const path = this.refStore[refId];
    if (!path) return store;

    let obj: unknown = store;
    for (let i = 0; i < path.length - 1; i++) {
      if (typeof obj === "object" && obj !== null) {
        obj = (obj as Record<string, unknown>)[path[i]];
      }
    }

    const lastKey = path[path.length - 1];
    if (typeof obj === "object" && obj !== null) {
      const record = obj as Record<string, unknown>;
      if (typeof record[lastKey] === "string" && isPlaceholder(record[lastKey] as string)) {
        record[lastKey] = value;
      } else {
        record[lastKey] = ((record[lastKey] ?? "") as string) + value;
      }
    }

    return store;
  }

  private handleStreamLine(line: string, currentStore: T): T {
    if (!line.trim()) return currentStore;

    const { onMessage } = this.options;

    try {
      const msg: ProgressiveChunkMessage = JSON.parse(line);
      let updatedStore = currentStore;

      switch (msg.type) {
        case "init":
          updatedStore = msg.data as T;
          this.updateRefStore(updatedStore);
          break;

        case "ref":
          updatedStore = this.applyRefUpdate(updatedStore, msg.key, msg.value);
          break;

        case "stream":
          updatedStore = this.applyStreamUpdate(updatedStore, msg.key, String(msg.value));
          break;
      }

      if (onMessage) {
        onMessage(filterPlaceholders(updatedStore));
      }

      return updatedStore;
    } catch {
      return currentStore;
    }
  }
}
