import { useState, useSyncExternalStore } from "react";
import { Processor } from "./processor";
import type { PlaceholderStore, StreamProcessorOptions } from "./resolve-placeholder";
import { filterPlaceholders } from "./utils/filter-placeholders";

export function useProgressiveJson<T extends PlaceholderStore>(
  options: StreamProcessorOptions<T>
): {
  store: T | undefined;
} {
  const [processor] = useState(() => new Processor<T>(options));

  const store = filterPlaceholders(
    useSyncExternalStore(processor.subscribe.bind(processor), processor.getStore.bind(processor))
  );
  return { store };
}
