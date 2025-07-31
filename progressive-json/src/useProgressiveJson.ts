import { useState, useSyncExternalStore, useEffect, useCallback } from "react";
import { Processor } from "./processor";
import type { PlaceholderStore, StreamProcessorOptions } from "./resolve-placeholder";
import { filterPlaceholders } from "./utils/filter-placeholders";

export interface UseProgressiveJsonReturn<T extends PlaceholderStore> {
  store: T | undefined;
  rawStore: T | undefined;
  transformedStore: T | undefined;
  isStreaming: boolean;
  streamError: Error | null;
  startFetching: () => void;
  stop: () => void;
  updateOptions: (newOptions: Partial<StreamProcessorOptions<T>>) => void;
}

export function useProgressiveJson<T extends PlaceholderStore>(
  options: StreamProcessorOptions<T>
): UseProgressiveJsonReturn<T> {
  const [processor] = useState(() => new Processor<T>(options));

  // Update processor options when they change
  useEffect(() => {
    processor.updateOptions(options);
  }, [processor, options]);

  // Clean up processor on unmount
  useEffect(() => {
    return () => {
      processor.destroy();
    };
  }, [processor]);

  // Get the selected/transformed store (main API)
  const store = filterPlaceholders(
    useSyncExternalStore(processor.subscribe.bind(processor), processor.getStore.bind(processor))
  );

  // Get raw store for debugging/advanced use cases
  const rawStore = useSyncExternalStore(
    processor.subscribe.bind(processor), 
    processor.getRawStore.bind(processor)
  );

  // Get transformed store (after transform but before select)
  const transformedStore = useSyncExternalStore(
    processor.subscribe.bind(processor), 
    processor.getTransformedStore.bind(processor)
  );

  // Get streaming state
  const isStreaming = useSyncExternalStore(
    processor.subscribe.bind(processor),
    processor.isCurrentlyStreaming.bind(processor)
  );

  // Get stream error
  const streamError = useSyncExternalStore(
    processor.subscribe.bind(processor),
    processor.getStreamError.bind(processor) 
  );

  const startFetching = useCallback(() => {
    processor.startFetching();
  }, [processor]);

  const stop = useCallback(() => {
    processor.stop();
  }, [processor]);

  const updateOptions = useCallback((newOptions: Partial<StreamProcessorOptions<T>>) => {
    processor.updateOptions(newOptions);
  }, [processor]);
  
  return { 
    store,
    rawStore,
    transformedStore,
    isStreaming,
    streamError,
    startFetching,
    stop,
    updateOptions
  };
}
