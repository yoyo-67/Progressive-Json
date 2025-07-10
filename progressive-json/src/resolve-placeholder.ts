export type ProgressiveChunkMessage =
  | { type: "init"; data: unknown }
  | { type: "value"; key: string; value: unknown }
  | { type: "text"; key: string; value: unknown }
  | { type: "push"; key: string; value: unknown }
  | { type: "concat"; key: string; value: unknown };

interface ProgressiveChunkOptions {
  validateReferences?: boolean;
  maxDepth?: number;
}

export interface StreamProcessorOptions<T = unknown> extends ProgressiveChunkOptions {
  url: string;
  initialStore?: T;
  onMessage?: (store: T) => void;
}

export type PlaceholderStore<T = unknown> = Record<string, T>;
