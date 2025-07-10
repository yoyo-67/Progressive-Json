export type Placeholder<T = unknown> =
  | {
      type: "value" | "text" | "push" | "concat";
      key: `ref$${number}`;
      value: T;
    }
  | {
      type: "init";
      data: Record<string, T>;
    };

export function init<T = unknown>(data: Record<string, T>): Placeholder<T> {
  return { type: "init", data };
}

export function value<T = unknown>(key: `ref$${number}`, value: T): Placeholder<T> {
  return { type: "value", key, value };
}

export function text<T = unknown>(key: `ref$${number}`, value: T): Placeholder<T> {
  return { type: "text", key, value };
}

export function push<T = unknown>(key: `ref$${number}`, value: T): Placeholder<T> {
  return { type: "push", key, value };
}

export function concat<T = unknown>(key: `ref$${number}`, value: T[]): Placeholder<T[]> {
  return { type: "concat", key, value };
}

let refKeyCounter = 1;

export function generateRefKey(): `ref$${number}` {
  return `ref$${refKeyCounter++}` as `ref$${number}`;
}

export function resetRefKeyCounter() {
  refKeyCounter = 1;
}

export function writeln(res: { write: (chunk: string) => void }) {
  return (placeholder: Placeholder) => {
    res.write(JSON.stringify(placeholder) + "\n");
  };
}

export function writeChunkHeaders(res: { setHeader: (name: string, value: string) => void }) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Transfer-Encoding", "chunked");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
}
