import type {
  Plugin,
  PluginContext,
  PlaceholderStore,
  ProgressiveChunkMessage,
} from "../resolve-placeholder";

/**
 * Server-side message creator for merge plugin
 */
export function merge(key: string, value: Record<string, unknown>) {
  return { type: "merge", key, value };
}

export type MergeMessage = { type: "merge"; key: string; value: Record<string, unknown> };

/**
 * Merge Plugin
 *
 * Handles "merge" message type that merges the current placeholder value with a new object.
 *
 * Example server usage:
 * ```ts
 * writer(merge(userRef, { email: "alice@example.com", verified: true }));
 * ```
 *
 * This will merge the new properties with the existing user object.
 */
export const mergePlugin: Plugin<MergeMessage, PlaceholderStore<unknown>> = {
  type: "merge",
  handleMessage: (message, store, context) => {
    // message is guaranteed to be a merge message
    return context.updateAtPath(store, message.key, (obj, lastKey) => {
      const currentValue = obj[lastKey];
      if (typeof currentValue === "object" && currentValue !== null && !Array.isArray(currentValue)) {
        obj[lastKey] = {
          ...(currentValue as Record<string, unknown>),
          ...(message.value as Record<string, unknown>),
        };
      } else {
        obj[lastKey] = message.value;
      }
    });
  },
};
