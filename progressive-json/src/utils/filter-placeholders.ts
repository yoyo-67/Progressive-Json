import { isPlaceholder } from "./is-placeholder";

export function filterPlaceholders<T = unknown>(value: T): T {
  if (typeof value === "undefined") return undefined as T;
  if (typeof value === "string" && isPlaceholder(value)) {
    return null as T; // Remove unresolved placeholder
  }

  if (typeof value !== "object" || value === null) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(filterPlaceholders) as T;
  }

  // Handle ref objects (placeholder objects)
  if (
    (value as any).type === "ref" &&
    typeof (value as any).key === "string" &&
    isPlaceholder((value as any).key)
  ) {
    return null as T;
  }

  const result: Record<string, unknown> = {};
  for (const key in value as Record<string, unknown>) {
    const filtered = filterPlaceholders((value as Record<string, unknown>)[key]);
    if (filtered !== null) {
      result[key] = filtered;
    }
  }
  return result as T;
}
