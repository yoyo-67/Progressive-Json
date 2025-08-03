import { fetchJson } from "./fetch-json";
import type {
  ProgressiveChunkMessage,
  StreamProcessorOptions,
  PlaceholderStore,
  Plugin,
  PluginContext,
} from "./resolve-placeholder";
import { filterPlaceholders } from "./utils/filter-placeholders";
import {
  findPlaceholders,
  RefPathMap,
  PlaceholderPath,
} from "./utils/find-placeholders";
import { isPlaceholder } from "./utils/is-placeholder";
import { produce } from "immer";

export class Processor<T extends PlaceholderStore = PlaceholderStore> {
  private store: T | undefined;
  private transformedStore: T | undefined;
  private selectedStore: Partial<T> | undefined;
  private options: StreamProcessorOptions<T>;
  private decoder = new TextDecoder();
  private listeners: Array<() => void> = [];
  private refStore: RefPathMap = {};
  private plugins: Plugin<any, any>[] = [];
  private isStreaming = false;
  private streamError: Error | null = null;

  constructor(options: StreamProcessorOptions<T>) {
    this.options = options;
    this.store = options.initialStore;
    this.plugins = options.plugins || [];

    if (this.store) {
      this.updateRefStore(this.store);
      this.updateTransformedStore();
    }

    // Only start fetching if enabled is not explicitly set to false
    if (options.enabled !== false && options.url) {
      this.startStreaming();
    }
  }

  private async startStreaming() {
    if (this.isStreaming) return;

    this.isStreaming = true;
    this.streamError = null;
    this.options.onStreamStart?.();

    try {
      // Use custom fetch function if provided, otherwise use default
      if (this.options.customFetch) {
        await this.options.customFetch(this.options.url, this, this.options);
      } else {
        await fetchJson(this.options.url, this);
      }
    } catch (error) {
      this.doHandleStreamError(error as Error);
    }
  }

  private doHandleStreamError(error: Error) {
    this.isStreaming = false;
    this.streamError = error;
    this.options.onStreamError?.(error);
    this.notifyListeners();
  }

  private updateTransformedStore() {
    if (!this.store) {
      this.transformedStore = undefined;
      this.selectedStore = undefined;
      return;
    }

    // Apply transform if provided
    this.transformedStore = this.options.transform
      ? this.options.transform(this.store)
      : this.store;

    // Apply selector if provided
    this.selectedStore = this.options.select
      ? this.options.select(this.transformedStore)
      : this.transformedStore;
  }

  // --- Public API ---

  getStore(): T | undefined {
    return this.selectedStore as T | undefined;
  }

  getRawStore(): T | undefined {
    return this.store;
  }

  getTransformedStore(): T | undefined {
    return this.transformedStore;
  }

  getRefStore(): RefPathMap {
    return this.refStore;
  }

  isCurrentlyStreaming(): boolean {
    return this.isStreaming;
  }

  getStreamError(): Error | null {
    return this.streamError;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  startFetching(): void {
    if (this.options.url && this.options.enabled !== false) {
      this.startStreaming();
    }
  }

  updateOptions(newOptions: Partial<StreamProcessorOptions<T>>): void {
    const oldEnabled = this.options.enabled;
    const oldUrl = this.options.url;
    this.options = { ...this.options, ...newOptions };

    // Restart streaming if URL changed or enabled changed from false to true
    if (
      (oldEnabled === false && this.options.enabled !== false) ||
      (oldUrl !== this.options.url && this.options.enabled !== false)
    ) {
      this.startStreaming();
    }

    // Update transforms if store exists
    if (this.store) {
      this.updateTransformedStore();
      this.notifyListeners();
    }
  }

  processChunk(chunk: Uint8Array): void {
    const text = this.decoder.decode(chunk, { stream: true });
    for (const line of text.split("\n")) {
      if (!this.store) {
        this.store = {} as T;
      }

      const prevStore = this.store;
      this.store = this.handleStreamLine(line, this.store);

      // Only update transformed store and notify if data actually changed
      if (this.hasStoreChanged(prevStore, this.store)) {
        this.updateTransformedStore();
        this.notifyListeners();
      }
    }
  }

  // --- Internals ---

  private notifyListeners() {
    this.listeners.forEach((listener) => listener());
  }

  private hasStoreChanged(prev: T, next: T): boolean {
    // Use custom compare function if provided
    if (this.options.compare) {
      return !this.options.compare(prev, next);
    }

    // Default: simple reference equality
    return prev !== next;
  }

  stop(): void {
    this.isStreaming = false;
    // Cleanup SSE connection if exists
    if ((this as any)._sseCleanup) {
      (this as any)._sseCleanup();
      delete (this as any)._sseCleanup;
    }
    // Note: fetchJson implementation should handle abort signals
  }

  onStreamComplete(finalData: T): void {
    this.isStreaming = false;
    this.updateTransformedStore();
    this.options.onStreamEnd?.(finalData);
    this.notifyListeners();
  }

  handleStreamError(error: Error): void {
    this.doHandleStreamError(error);
  }

  destroy(): void {
    this.stop();
    this.listeners = [];
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
    updater: (
      obj: Record<string | number, unknown>,
      lastKey: string | number,
    ) => void,
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
      if (
        typeof obj[lastKey] === "string" &&
        isPlaceholder(obj[lastKey] as string)
      ) {
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
        updatedStore = (plugin.handleMessage as any)(
          msg,
          currentStore,
          context,
        ) as T;
      } else {
        // Handle built-in message types
        switch (msg.type) {
          case "init":
            updatedStore = this.handleInit(msg.data as T);
            break;
          case "value":
            updatedStore = this.applyRefUpdate(
              updatedStore,
              msg.key,
              msg.value,
            );
            break;
          case "text":
            updatedStore = this.applyStreamUpdate(
              updatedStore,
              msg.key,
              String(msg.value),
            );
            break;
          case "push":
            updatedStore = this.applyPushUpdate(
              updatedStore,
              msg.key,
              msg.value,
            );
            break;
          case "concat":
            updatedStore = this.applyConcatUpdate(
              updatedStore,
              msg.key,
              msg.value as unknown[],
            );
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
