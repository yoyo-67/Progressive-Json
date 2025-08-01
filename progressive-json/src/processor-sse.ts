import { fetchJson } from "./fetch-json";
import { fetchSSE } from "./fetch-sse";
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

export interface SSEProcessorOptions<T extends PlaceholderStore> extends StreamProcessorOptions<T> {
  useSSE?: boolean;
  headers?: Record<string, string>;
}

export class ProcessorSSE<T extends PlaceholderStore = PlaceholderStore> {
  private store: T | undefined;
  private transformedStore: T | undefined;
  private selectedStore: Partial<T> | undefined;
  private options: SSEProcessorOptions<T>;
  private decoder = new TextDecoder();
  private listeners: Array<() => void> = [];
  private refStore: RefPathMap = {};
  private plugins: Plugin<any, any>[] = [];
  private isStreaming = false;
  private streamError: Error | null = null;
  private abortController: AbortController | null = null;
  private eventSource: EventSource | null = null;

  constructor(options: SSEProcessorOptions<T>) {
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
      if (this.options.useSSE) {
        this.abortController = new AbortController();
        await fetchSSE(this.options.url, this, {
          headers: this.options.headers,
          signal: this.abortController.signal,
        });
      } else {
        await fetchJson(this.options.url, this);
      }
    } catch (error) {
      this.handleStreamError(error as Error);
    }
  }

  private handleStreamError(error: Error) {
    this.isStreaming = false;
    this.streamError = error;
    this.options.onStreamError?.(error);
    this.notifyListeners();
  }

  processChunk(chunk: Uint8Array): void {
    const text = this.decoder.decode(chunk);
    const lines = text.split("\n");

    for (const line of lines) {
      if (line.trim()) {
        try {
          const message: ProgressiveChunkMessage = JSON.parse(line);
          this.processMessage(message);
        } catch (e) {
          // Skip invalid JSON lines
        }
      }
    }
  }

  private processMessage(message: ProgressiveChunkMessage): void {
    // Check if this is a plugin message
    const plugin = this.plugins.find((p) => p.type === message.type);
    if (plugin && plugin.handler) {
      const context = this.createPluginContext(message);
      plugin.handler(message, context);
      return;
    }

    // Handle standard messages
    switch (message.type) {
      case "init":
        this.store = message.data as T;
        this.updateRefStore(this.store!);
        this.updateTransformedStore();
        this.notifyListeners();
        break;
      case "value":
        this.updateValue(message.ref, message.data);
        break;
      case "push":
        this.pushToArray(message.ref, message.data);
        break;
      case "concat":
        this.concatToArray(message.ref, message.data);
        break;
    }
  }

  private createPluginContext(message: ProgressiveChunkMessage): PluginContext {
    return {
      getRefPath: (ref: string) => this.refStore[ref],
      updateValue: (ref: string, value: any) => this.updateValue(ref, value),
      getValue: (ref: string) => this.getValueByRef(ref),
      notifyListeners: () => this.notifyListeners(),
    };
  }

  startFetching(): void {
    if (this.options.url && this.options.enabled !== false) {
      this.startStreaming();
    }
  }

  updateOptions(newOptions: Partial<SSEProcessorOptions<T>>): void {
    const oldEnabled = this.options.enabled;
    const oldUrl = this.options.url;
    this.options = { ...this.options, ...newOptions };

    // Restart streaming if URL or enabled state changed
    if (
      this.options.url &&
      this.options.enabled !== false &&
      (oldUrl !== this.options.url || oldEnabled === false)
    ) {
      this.stop();
      this.startStreaming();
    } else if (this.options.enabled === false) {
      this.stop();
    }
  }

  private updateRefStore(data: any, path: string[] = []): void {
    const placeholders = findPlaceholders(data);
    placeholders.forEach((placeholder) => {
      this.refStore[placeholder.ref] = placeholder.path;
    });
  }

  private updateValue(ref: string, value: any): void {
    const path = this.refStore[ref];
    if (path && this.store) {
      this.store = produce(this.store, (draft) => {
        this.setValueAtPath(draft, path, value);
      });
      this.updateTransformedStore();
      this.notifyListeners();
    }
  }

  private pushToArray(ref: string, value: any): void {
    const path = this.refStore[ref];
    if (path && this.store) {
      this.store = produce(this.store, (draft) => {
        const array = this.getValueAtPath(draft, path);
        if (Array.isArray(array)) {
          array.push(value);
        }
      });
      this.updateTransformedStore();
      this.notifyListeners();
    }
  }

  private concatToArray(ref: string, values: any[]): void {
    const path = this.refStore[ref];
    if (path && this.store) {
      this.store = produce(this.store, (draft) => {
        const array = this.getValueAtPath(draft, path);
        if (Array.isArray(array)) {
          array.push(...values);
        }
      });
      this.updateTransformedStore();
      this.notifyListeners();
    }
  }

  stop(): void {
    this.isStreaming = false;
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  onStreamComplete(finalData: T): void {
    this.isStreaming = false;
    this.updateTransformedStore();
    this.options.onStreamEnd?.(finalData);
    this.notifyListeners();
  }

  onStreamError(error: Error): void {
    this.handleStreamError(error);
  }

  destroy(): void {
    this.stop();
    this.listeners = [];
  }

  // Store access methods
  getStore(): T | undefined {
    return this.selectedStore as T || this.transformedStore;
  }

  getRawStore(): T | undefined {
    return this.store;
  }

  getTransformedStore(): T | undefined {
    return this.transformedStore;
  }

  isCurrentlyStreaming(): boolean {
    return this.isStreaming;
  }

  getStreamError(): Error | null {
    return this.streamError;
  }

  // Subscription methods
  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener());
  }

  // Helper methods
  private updateTransformedStore(): void {
    if (!this.store) return;
    
    this.transformedStore = this.options.transform
      ? this.options.transform(this.store)
      : this.store;
      
    this.selectedStore = this.options.select
      ? this.options.select(this.transformedStore)
      : this.transformedStore;
  }

  private getValueByRef(ref: string): any {
    const path = this.refStore[ref];
    if (path && this.store) {
      return this.getValueAtPath(this.store, path);
    }
    return undefined;
  }

  private setValueAtPath(obj: any, path: PlaceholderPath, value: any): void {
    let current = obj;
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]];
    }
    current[path[path.length - 1]] = value;
  }

  private getValueAtPath(obj: any, path: PlaceholderPath): any {
    let current = obj;
    for (const key of path) {
      current = current[key];
    }
    return current;
  }
}