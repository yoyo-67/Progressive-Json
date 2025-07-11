import { describe, it, expect } from "vitest";
import { Processor } from "./processor";
import { mergePlugin } from "./plugins/merge";
import type { PlaceholderStore, ProgressiveChunkMessage } from "./resolve-placeholder";
import type { Plugin } from "./resolve-placeholder";

function makeProcessorWithStore(store: PlaceholderStore) {
  // Dummy options, no fetch
  return new Processor({ url: "", initialStore: store });
}

describe("Processor refStore integration", () => {
  it("populates refStore on init and updates store on value", () => {
    const initial = { a: "ref$1", b: 2, c: { d: "ref$2" } };
    const processor = makeProcessorWithStore(initial);
    // Simulate receiving a value message
    const valueMsg = JSON.stringify({ type: "value", key: "ref$1", value: 42 });
    processor["processChunk"](new TextEncoder().encode(valueMsg + "\n"));
    // Check that refStore still contains both refs
    expect(processor["refStore"]).toMatchObject({ 1: ["a"], 2: ["c", "d"] });
    // Check that the store was updated at the correct path
    expect(processor.getStore()).toMatchObject({
      a: 42,
      b: 2,
      c: { d: "ref$2" },
    });
  });
});

describe("Plugin System", () => {
  it("should handle merge plugin correctly", () => {
    const processor = new Processor({
      url: "test",
      plugins: [mergePlugin],
    });

    // Simulate initial data
    const initMessage = { type: "init", data: { user: "ref$1" } };
    let store = processor["handleStreamLine"](JSON.stringify(initMessage), {});

    // Set initial user data
    const valueMessage = { type: "value", key: "ref$1", value: { name: "Alice", age: 30 } };
    store = processor["handleStreamLine"](JSON.stringify(valueMessage), store);

    // Merge additional data
    const mergeMessage = {
      type: "merge",
      key: "ref$1",
      value: { email: "alice@example.com", verified: true },
    };
    store = processor["handleStreamLine"](JSON.stringify(mergeMessage), store);

    expect(store.user).toEqual({
      name: "Alice",
      age: 30,
      email: "alice@example.com",
      verified: true,
    });
  });

  it("should handle custom plugin", () => {
    const customPlugin: Plugin<ProgressiveChunkMessage, PlaceholderStore<unknown>> = {
      type: "increment",
      handleMessage: (message, store, context) => {
        if (message.type !== "increment" || !message.key) return store;

        const incrementAmount = (message.value as number) ?? 1;

        return context.updateAtPath(store, message.key, (obj, lastKey) => {
          const currentValue = (obj[lastKey] as number) || 0;
          obj[lastKey] = currentValue + incrementAmount;
        });
      },
    };

    const processor = new Processor({
      url: "test",
      plugins: [customPlugin],
    });

    // Simulate initial data
    const initMessage = { type: "init", data: { counter: "ref$1" } };
    let store = processor["handleStreamLine"](JSON.stringify(initMessage), {});

    // Set initial counter
    const valueMessage = { type: "value", key: "ref$1", value: 0 };
    store = processor["handleStreamLine"](JSON.stringify(valueMessage), store);

    // Increment counter
    const incrementMessage = { type: "increment", key: "ref$1" };
    store = processor["handleStreamLine"](JSON.stringify(incrementMessage), store);

    expect(store.counter).toBe(1);

    // Increment by specific amount
    const incrementBy5Message = { type: "increment", key: "ref$1", value: 5 };
    store = processor["handleStreamLine"](JSON.stringify(incrementBy5Message), store);

    expect(store.counter).toBe(6);
  });

  it("should fall back to built-in handlers when no plugin matches", () => {
    const processor = new Processor({
      url: "test",
      plugins: [mergePlugin], // Only merge plugin
    });

    // Simulate initial data
    const initMessage = { type: "init", data: { user: "ref$1" } };
    let store = processor["handleStreamLine"](JSON.stringify(initMessage), {});

    // Use built-in value handler (should work)
    const valueMessage = { type: "value", key: "ref$1", value: { name: "Alice" } };
    store = processor["handleStreamLine"](JSON.stringify(valueMessage), store);

    expect(store.user).toEqual({ name: "Alice" });
  });

  it("should handle multiple plugins", () => {
    const incrementPlugin: Plugin<ProgressiveChunkMessage, PlaceholderStore<unknown>> = {
      type: "increment",
      handleMessage: (message, store, context) => {
        if (message.type !== "increment" || !message.key) return store;

        const incrementAmount = (message.value as number) ?? 1;

        return context.updateAtPath(store, message.key, (obj, lastKey) => {
          const currentValue = (obj[lastKey] as number) || 0;
          obj[lastKey] = currentValue + incrementAmount;
        });
      },
    };

    const processor = new Processor({
      url: "test",
      plugins: [mergePlugin, incrementPlugin],
    });

    // Simulate initial data
    const initMessage = { type: "init", data: { user: "ref$1", counter: "ref$2" } };
    let store = processor["handleStreamLine"](JSON.stringify(initMessage), {});

    // Set initial values
    const userValueMessage = { type: "value", key: "ref$1", value: { name: "Alice" } };
    const counterValueMessage = { type: "value", key: "ref$2", value: 0 };
    store = processor["handleStreamLine"](JSON.stringify(userValueMessage), store);
    store = processor["handleStreamLine"](JSON.stringify(counterValueMessage), store);

    // Use merge plugin
    const mergeMessage = { type: "merge", key: "ref$1", value: { age: 30 } };
    store = processor["handleStreamLine"](JSON.stringify(mergeMessage), store);

    // Use increment plugin
    const incrementMessage = { type: "increment", key: "ref$2" };
    store = processor["handleStreamLine"](JSON.stringify(incrementMessage), store);

    expect(store.user).toEqual({ name: "Alice", age: 30 });
    expect(store.counter).toBe(1);
  });
});
