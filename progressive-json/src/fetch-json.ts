import { type PlaceholderStore } from "./resolve-placeholder";
import { Processor } from "./processor";
import { assert } from "./utils/assert";

export async function fetchJson<T extends PlaceholderStore>(
  url: string,
  processor: Processor<T>,
) {
  const response = await fetch(url);
  assert(response.ok, `Failed to fetch from ${url}: ${response.statusText}`);
  assert(response.body, "No response body received");
  const reader = response.body.getReader();

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }

      processor.processChunk(value);
    }
  } finally {
    reader.releaseLock();
  }
}
