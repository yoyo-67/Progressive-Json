export type ProgressiveChunkMessage =
  | { type: "init"; data: unknown }
  | { type: "ref"; key: string; value: unknown }
  | { type: "stream"; key: string; value: unknown };

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
