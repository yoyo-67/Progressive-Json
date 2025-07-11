import type {
  Plugin,
  PluginContext,
  PlaceholderStore,
  ProgressiveChunkMessage,
} from "../resolve-placeholder";

/**
 * Server-side message creator for increment plugin
 */
export function increment(key: string, value?: number) {
  return { type: "increment", key, value };
}

// Define a specific message type for increment
export type IncrementMessage = { type: "increment"; key: string; value: number | undefined };

/**
 * Increment Plugin
 *
 * Handles "increment" message type that increments a numeric value.
 *
 * Example server usage:
 * ```ts
 * writer(increment(counterRef)); // Increments by 1
 * writer(increment(counterRef, 5)); // Increments by 5
 * ```
 */
export const incrementPlugin: Plugin<IncrementMessage, PlaceholderStore<unknown>> = {
  type: "increment",
  handleMessage: (message, store, context) => {
    const incrementAmount = (message.value as number) ?? 1;
    return context.updateAtPath(store, message.key, (obj, lastKey) => {
      const currentValue = obj[lastKey];
      if (typeof currentValue === "number") {
        obj[lastKey] = currentValue + incrementAmount;
      } else {
        obj[lastKey] = incrementAmount;
      }
    });
  },
};
