// NOTE: These utilities are now available from '@yoyo-org/progressive-json'.
// Prefer importing from the package for consistency across the monorepo.
import { type Response } from "express";

export function wait(ms: number) {
  const delta = 300;
  return new Promise((resolve) => setTimeout(resolve, ms + delta));
}

export function writeln(res: Response) {
  return (placeholder: Placeholder) => {
    res.write(JSON.stringify(placeholder) + "\n");
  };
}

export function writeChunkHeaders(res: Response) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Transfer-Encoding", "chunked");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
}

export type Placeholder =
  | {
      type: "value" | "text";
      key: `ref$${number}`;
      value: any;
    }
  | {
      type: "init";
      data: Record<string, any>;
    };

export function init(data: Record<string, any>): Placeholder {
  return { type: "init", data };
}

export function value(key: `ref$${number}`, value: any): Placeholder {
  return { type: "value", key, value };
}

export function text(key: `ref$${number}`, value: any): Placeholder {
  return { type: "text", key, value };
}

let refKeyCounter = 1;

export function generateRefKey(): `ref$${number}` {
  return `ref$${refKeyCounter++}` as `ref$${number}`;
}

export function resetRefKeyCounter() {
  refKeyCounter = 1;
}
