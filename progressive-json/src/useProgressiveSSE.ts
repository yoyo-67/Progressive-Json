import { useState, useSyncExternalStore, useEffect, useCallback } from "react";
import { ProcessorSSE, SSEProcessorOptions } from "./processor-sse";
import type { PlaceholderStore } from "./resolve-placeholder";
import { filterPlaceholders } from "./utils/filter-placeholders";

export interface UseProgressiveSSEReturn<T extends PlaceholderStore> {
  store: T | undefined;
  rawStore: T | undefined;
  transformedStore: T | undefined;
  isStreaming: boolean;
  streamError: Error | null;
  startFetching: () => void;
  stop: () => void;
  updateOptions: (newOptions: Partial<SSEProcessorOptions<T>>) => void;
}

export interface UseProgressiveSSEOptions<T extends PlaceholderStore> extends SSEProcessorOptions<T> {
  authToken?: string;
}

export function useProgressiveSSE<T extends PlaceholderStore>(
  options: UseProgressiveSSEOptions<T>,
): UseProgressiveSSEReturn<T> {
  // Prepare headers with auth token if provided
  const processedOptions = {
    ...options,
    useSSE: true,
    headers: {
      ...options.headers,
      ...(options.authToken && { Authorization: `Bearer ${options.authToken}` }),
    },
  };

  const [processor] = useState(() => new ProcessorSSE<T>(processedOptions));

  // Update processor options when they change
  useEffect(() => {
    processor.updateOptions(processedOptions);
  }, [options.url, options.authToken, options.enabled]);

  // Clean up processor on unmount
  useEffect(() => {
    return () => {
      processor.destroy();
    };
  }, []);

  // Get the selected/transformed store (main API)
  const store = filterPlaceholders(
    useSyncExternalStore(
      processor.subscribe.bind(processor),
      processor.getStore.bind(processor),
    ),
  );

  // Get raw store for debugging/advanced use cases
  const rawStore = useSyncExternalStore(
    processor.subscribe.bind(processor),
    processor.getRawStore.bind(processor),
  );

  // Get transformed store (after transform but before select)
  const transformedStore = useSyncExternalStore(
    processor.subscribe.bind(processor),
    processor.getTransformedStore.bind(processor),
  );

  // Get streaming state
  const isStreaming = useSyncExternalStore(
    processor.subscribe.bind(processor),
    processor.isCurrentlyStreaming.bind(processor),
  );

  // Get stream error
  const streamError = useSyncExternalStore(
    processor.subscribe.bind(processor),
    processor.getStreamError.bind(processor),
  );

  const startFetching = useCallback(() => {
    processor.startFetching();
  }, [processor]);

  const stop = useCallback(() => {
    processor.stop();
  }, [processor]);

  const updateOptions = useCallback(
    (newOptions: Partial<SSEProcessorOptions<T>>) => {
      processor.updateOptions(newOptions);
    },
    [processor],
  );

  return {
    store,
    rawStore,
    transformedStore,
    isStreaming,
    streamError,
    startFetching,
    stop,
    updateOptions,
  };
}