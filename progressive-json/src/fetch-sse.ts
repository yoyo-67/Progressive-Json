import { type PlaceholderStore } from "./resolve-placeholder";
import { Processor } from "./processor";
import { assert } from "./utils/assert";

export interface SSEOptions {
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export async function fetchSSE<T extends PlaceholderStore>(
  url: string,
  processor: Processor<T>,
  options?: SSEOptions
) {
  const eventSource = new EventSource(url, {
    withCredentials: true,
  });

  // If we need to pass auth headers, we'll need to use a polyfill or fetch API
  // Native EventSource doesn't support custom headers
  if (options?.headers) {
    return fetchSSEWithHeaders(url, processor, options);
  }

  eventSource.onmessage = (event) => {
    try {
      const data = new TextEncoder().encode(event.data + "\n");
      processor.processChunk(data);
    } catch (error) {
      processor.onStreamError(error as Error);
    }
  };

  eventSource.onerror = (error) => {
    eventSource.close();
    processor.onStreamError(new Error("SSE connection error"));
  };

  eventSource.addEventListener("end", () => {
    eventSource.close();
    processor.onStreamComplete(processor.getStore() as T);
  });

  // Handle abort signal
  if (options?.signal) {
    options.signal.addEventListener("abort", () => {
      eventSource.close();
    });
  }

  return eventSource;
}

// Fallback implementation using fetch API for custom headers
async function fetchSSEWithHeaders<T extends PlaceholderStore>(
  url: string,
  processor: Processor<T>,
  options: SSEOptions
) {
  const response = await fetch(url, {
    headers: {
      ...options.headers,
      "Accept": "text/event-stream",
    },
    signal: options.signal,
  });

  assert(response.ok, `Failed to fetch from ${url}: ${response.statusText}`);
  assert(response.body, "No response body received");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") {
            processor.onStreamComplete(processor.getStore() as T);
            return;
          }
          try {
            const chunk = new TextEncoder().encode(data + "\n");
            processor.processChunk(chunk);
          } catch (error) {
            processor.onStreamError(error as Error);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}