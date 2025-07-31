export type ProgressiveChunkMessage =
  | { type: "init"; data: unknown }
  | { type: "value"; key: string; value: unknown }
  | { type: "text"; key: string; value: unknown }
  | { type: "push"; key: string; value: unknown }
  | { type: "concat"; key: string; value: unknown }
  | { type: string; key: string; value: unknown; [key: string]: unknown };

// Plugin system types
export interface Plugin<
  TMessage extends ProgressiveChunkMessage = ProgressiveChunkMessage,
  TStore extends PlaceholderStore = PlaceholderStore
> {
  type: string;
  handleMessage: (message: TMessage, store: TStore, context: PluginContext<TStore>) => TStore;
}

export interface PluginContext<T extends PlaceholderStore = PlaceholderStore> {
  updateAtPath: (
    store: T,
    key: string,
    updater: (obj: Record<string | number, unknown>, lastKey: string | number) => void
  ) => T;
  normalizeRefKey: (key: string) => string;
  getRefIdFromKey: (refKey: string) => number | null;
  refStore: Record<number, (string | number)[]>;
}

interface ProgressiveChunkOptions {
  validateReferences?: boolean;
  maxDepth?: number;
}

export interface StreamProcessorOptions<T extends PlaceholderStore = PlaceholderStore>
  extends ProgressiveChunkOptions {
  url: string;
  enabled?: boolean;
  initialStore?: T;
  onMessage?: (store: T) => void;
  plugins?: Plugin<any, any>[];
  
  // New: Declarative transforms
  transform?: (rawData: T) => T;
  
  // New: Selective updates
  select?: (data: T) => Partial<T>;
  
  // New: Built-in change detection
  compare?: (prev: T, next: T) => boolean;
  
  // New: Streaming lifecycle hooks
  onStreamStart?: () => void;
  onStreamEnd?: (data: T) => void;
  onStreamError?: (error: Error) => void;
  
  // New: Partial update handlers
  onPartialUpdate?: (path: string[], value: any) => void;
}

export type PlaceholderStore<T = unknown> = Record<string, T>;
