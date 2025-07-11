import { fetchJson } from "./fetch-json";
import type {
  ProgressiveChunkMessage,
  StreamProcessorOptions,
  PlaceholderStore,
  Plugin,
  PluginContext,
} from "./resolve-placeholder";
import { filterPlaceholders } from "./utils/filter-placeholders";
import { findPlaceholders, RefPathMap, PlaceholderPath } from "./utils/find-placeholders";
import { isPlaceholder } from "./utils/is-placeholder";
import { produce } from "immer";

export class Processor<T extends PlaceholderStore = PlaceholderStore> {
  private store: T | undefined;
  private options: StreamProcessorOptions<T>;
  private decoder = new TextDecoder();
  private listeners: Array<() => void> = [];
  private refStore: RefPathMap = {};
  private plugins: Plugin<any, any>[] = [];

  constructor(options: StreamProcessorOptions<T>) {
    this.options = options;
    this.store = options.initialStore;
    this.plugins = options.plugins || [];

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
      this.notifyListeners();
    }
  }

  // --- Internals ---

  private notifyListeners() {
    this.listeners.forEach((listener) => listener());
  }

  normalizeRefKey(key: string): string {
    return key.startsWith("ref") ? key : `ref${key}`;
  }

  getRefIdFromKey(refKey: string): number | null {
    const match = refKey.match(/^ref\$(\d+)$/);
    return match ? Number(match[1]) : null;
  }

  private updateRefStore(store: T) {
    const found = findPlaceholders(store);
    Object.entries(found).forEach(([refId, path]) => {
      this.refStore[Number(refId)] = path;
    });
  }

  updateAtPath(
    store: T,
    key: string,
    updater: (obj: Record<string | number, unknown>, lastKey: string | number) => void
  ): T {
    const refKey = this.normalizeRefKey(key);
    const refId = this.getRefIdFromKey(refKey);
    if (refId == null) return store;

    const path = this.refStore[refId];
    if (!path) return store;

    return produce(store, (draft) => {
      let obj: unknown = draft;
      for (let i = 0; i < path.length - 1; i++) {
        if (typeof obj === "object" && obj !== null) {
          obj = (obj as Record<string | number, unknown>)[path[i]];
        }
      }

      const lastKey = path[path.length - 1];
      if (typeof obj === "object" && obj !== null) {
        updater(obj as Record<string | number, unknown>, lastKey);
      }
    });
  }

  private applyPushUpdate(store: T, key: string, value: unknown): T {
    return this.updateAtPath(store, key, (obj, lastKey) => {
      if (!Array.isArray(obj[lastKey])) obj[lastKey] = [];
      (obj[lastKey] as unknown[]).push(value);
    });
  }

  private applyConcatUpdate(store: T, key: string, value: unknown[]): T {
    return this.updateAtPath(store, key, (obj, lastKey) => {
      if (!Array.isArray(obj[lastKey])) obj[lastKey] = [];
      (obj[lastKey] as unknown[]).push(...value);
    });
  }

  private applyRefUpdate(store: T, key: string, value: unknown): T {
    const updatedStore = this.updateAtPath(store, key, (obj, lastKey) => {
      obj[lastKey] = value;
    });
    this.updateRefStore(updatedStore);
    return updatedStore;
  }

  private applyStreamUpdate(store: T, key: string, value: string): T {
    return this.updateAtPath(store, key, (obj, lastKey) => {
      if (typeof obj[lastKey] === "string" && isPlaceholder(obj[lastKey] as string)) {
        obj[lastKey] = value;
      } else {
        obj[lastKey] = ((obj[lastKey] ?? "") as string) + value;
      }
    });
  }

  private handleStreamLine(line: string, currentStore: T): T {
    if (!line.trim()) return currentStore;
    const { onMessage } = this.options;
    let updatedStore = currentStore;
    try {
      const msg: ProgressiveChunkMessage = JSON.parse(line);

      // Find a plugin whose type matches the message type
      const plugin = this.plugins.find((p) => p.type === msg.type);
      if (plugin) {
        const context: PluginContext<any> = {
          updateAtPath: this.updateAtPath.bind(this),
          normalizeRefKey: this.normalizeRefKey.bind(this),
          getRefIdFromKey: this.getRefIdFromKey.bind(this),
          refStore: this.refStore,
        };
        // Type-safe dispatch: cast msg to the plugin's message type
        updatedStore = (plugin.handleMessage as any)(msg, currentStore, context) as T;
      } else {
        // Handle built-in message types
        switch (msg.type) {
          case "init":
            updatedStore = this.handleInit(msg.data as T);
            break;
          case "value":
            updatedStore = this.applyRefUpdate(updatedStore, msg.key, msg.value);
            break;
          case "text":
            updatedStore = this.applyStreamUpdate(updatedStore, msg.key, String(msg.value));
            break;
          case "push":
            updatedStore = this.applyPushUpdate(updatedStore, msg.key, msg.value);
            break;
          case "concat":
            updatedStore = this.applyConcatUpdate(updatedStore, msg.key, msg.value as unknown[]);
            break;
        }
      }

      if (onMessage) {
        onMessage(filterPlaceholders(updatedStore));
      }
      return updatedStore;
    } catch {
      return currentStore;
    }
  }

  private handleInit(data: T): T {
    this.updateRefStore(data);
    return data;
  }
}
