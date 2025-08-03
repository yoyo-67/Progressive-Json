import { type PlaceholderStore } from "./resolve-placeholder";
import { Processor } from "./processor";
import type { StreamProcessorOptions } from "./resolve-placeholder";

export async function fetchSSEWithAuth<T extends PlaceholderStore>(
  url: string,
  processor: Processor<T>,
  options: StreamProcessorOptions<T>,
) {
  let eventSource: EventSource | null = null;

  try {
    eventSource = new EventSource(url);
    let connectionOpened = false;

    eventSource.onopen = () => {
      connectionOpened = true;
      console.log("SSE connection opened");
    };

    eventSource.onmessage = (event) => {
      connectionOpened = true;

      try {
        // Handle [DONE] signal
        if (event.data === "[DONE]") {
          eventSource?.close();
          processor.onStreamComplete(processor.getStore() as T);
          return;
        }

        // Convert SSE data to chunk format expected by processor
        const chunk = new TextEncoder().encode(event.data + "\n");
        processor.processChunk(chunk);
      } catch (error) {
        processor.handleStreamError(error as Error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("SSE error:", error);

      // Handle authentication errors
      if (!connectionOpened && eventSource?.readyState === EventSource.CLOSED) {
        processor.handleStreamError(
          new Error("Authentication failed. Please sign in again."),
        );
      } else {
        processor.handleStreamError(new Error("Connection lost"));
      }

      eventSource?.close();
    };

    // Handle abort/cleanup
    const cleanup = () => {
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
    };

    // Store cleanup function on processor for stop() method
    (processor as any)._sseCleanup = cleanup;
  } catch (error) {
    if (eventSource) {
      eventSource.close();
    }
    throw error;
  }
}
