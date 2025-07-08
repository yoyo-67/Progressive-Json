import { findPlaceholders } from "./find-placeholders";
import { describe, it, expect } from "vitest";

describe("findPlaceholders", () => {
  it("finds placeholders in a flat object", () => {
    const obj = { a: "ref$1", b: 2, c: "ref$2" };
    const result = findPlaceholders(obj);
    expect(result).toEqual({ 1: ["a"], 2: ["c"] });
  });

  it("finds placeholders in a nested object", () => {
    const obj = { a: { b: "ref$3" }, c: [1, "ref$4"] };
    const result = findPlaceholders(obj);
    expect(result).toEqual({ 3: ["a", "b"], 4: ["c", 1] });
  });

  it("ignores non-placeholder strings", () => {
    const obj = { a: "hello", b: "ref$notanumber" };
    const result = findPlaceholders(obj);
    expect(result).toEqual({});
  });

  it("finds multiple placeholders in arrays", () => {
    const arr = ["ref$5", { x: "ref$6" }, [0, "ref$7"]];
    const result = findPlaceholders(arr);
    expect(result).toEqual({ 5: [0], 6: [1, "x"], 7: [2, 1] });
  });
});
