import { isPlaceholder } from "./is-placeholder";
import { extractPlaceholderId } from "./extract-placeholder-id";

export type PlaceholderPath = Array<string | number>;
export type RefPathMap = Record<number, PlaceholderPath>;

/**
 * Recursively finds all placeholders in the value and returns a mapping from refId to their path.
 * @param value The object/array to search
 * @param currentPath The path so far (for recursion)
 * @param result The result map (for recursion)
 */
export function findPlaceholders<T = unknown>(
  value: T,
  currentPath: PlaceholderPath = [],
  result: RefPathMap = {}
): RefPathMap {
  if (typeof value === "string" && isPlaceholder(value)) {
    const refId = extractPlaceholderId(value);
    if (refId !== -1) {
      result[refId] = [...currentPath];
    }
    return result;
  }

  if (typeof value !== "object" || value === null) {
    return result;
  }

  if (Array.isArray(value)) {
    value.forEach((item, idx) => {
      findPlaceholders(item, [...currentPath, idx], result);
    });
    return result;
  }

  for (const key in value as Record<string, unknown>) {
    findPlaceholders((value as Record<string, unknown>)[key], [...currentPath, key], result);
  }
  return result;
}
