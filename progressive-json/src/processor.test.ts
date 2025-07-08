import { describe, it, expect } from "vitest";
import { Processor } from "./processor";
import type { PlaceholderStore } from "./resolve-placeholder";

function makeProcessorWithStore(store: PlaceholderStore) {
  // Dummy options, no fetch
  return new Processor({ url: "", initialStore: store });
}

describe("Processor refStore integration", () => {
  it("populates refStore on init and updates store on ref", () => {
    const initial = { a: "ref$1", b: 2, c: { d: "ref$2" } };
    const processor = makeProcessorWithStore(initial);
    // Simulate receiving a ref message
    const refMsg = JSON.stringify({ type: "ref", key: "ref$1", value: 42 });
    processor["processChunk"](new TextEncoder().encode(refMsg + "\n"));
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
