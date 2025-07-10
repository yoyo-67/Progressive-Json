# progressive-json

**Stream JSON data as it arrives, not when it's complete**

[![npm version](https://badge.fury.io/js/@yoyo-org%2Fprogressive-json.svg)](https://badge.fury.io/js/@yoyo-org%2Fprogressive-json)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

## The Problem

Waiting for complete JSON responses creates slow, unresponsive experiences. Users see blank screens while large datasets load, and memory usage spikes as entire payloads are held in memory.

**progressive-json** streams JSON data chunk by chunk, updating your UI as each piece arrives.


## How It Works

The server sends JSON in progressive chunks, and your app processes each piece immediately:   

![Progressive JSON Demo](https://github.com/yoyo-67/Progressive-Json/blob/main/assets/demo-json.gif)

## Features

- **⚡ Instant Updates** - See data as it streams in
- **🎯 Smart References** - Handle complex nested data seamlessly  
- **⚛️ React Ready** - Simple `useProgressiveJson` hook
- **🛡️ TypeScript** - Full type safety included
- **🚀 Lightweight** - Zero dependencies, minimal bundle
- **🔄 Universal** - Works with any streaming endpoint

## API

The library provides five core functions for building progressive JSON responses:

### `init(data)`
Initialize the JSON structure with placeholders for dynamic content.
```ts
init({
  user: { name: userNameRef, age: 30 },
  posts: postsRef,
  staticData: "Loaded!"
})
```

### `value(key, value)`
Replace a placeholder with its final value.
```ts
value(userNameRef, "Alice")
value(postsRef, [{ id: 1, title: "First Post" }])
```

### `text(key, value)`
Append content to a streaming field (updates in real-time).
```ts
text(logRef, "New message ")
text(logRef, "arrived!")
```

### `push(key, value)`
Add items to an array field.
```ts
push(notificationsRef, { id: 1, message: "New notification" })
push(notificationsRef, { id: 2, message: "Another notification" })
```

### `concat(key, values)`
Replace an array field with new values.
```ts
concat(usersRef, [{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }])
```

## Quick Start

### Install

```bash
npm install @yoyo-org/progressive-json
```

### 1. Minimal Server Example (Express, with Streaming)

```ts
import express from "express";
import cors from "cors";
import {
  writeln,
  writeChunkHeaders,
  init,
  value,
  text,
  generateRefKey,
  resetRefKeyCounter,
} from "@yoyo-org/progressive-json";

const app = express();
app.use(cors());

app.get("/api/progressive-chunk", async (req, res) => {
  writeChunkHeaders(res);
  const writer = writeln(res);
  resetRefKeyCounter();

  // Create reference keys
  const userNameRef = generateRefKey();
  const postsRef = generateRefKey();
  const logRef = generateRefKey(); // Streaming field

  // Send initial structure
  writer(
    init({
      user: { name: userNameRef, age: 30 },
      posts: postsRef,
      staticData: "Loaded!",
      log: logRef, // Streaming field
    })
  );
  await new Promise(r => setTimeout(r, 150));

  // Send referenced values
  writer(value(userNameRef, "Alice"));
  await new Promise(r => setTimeout(r, 150));

  writer(value(postsRef, [
    { id: 1, title: "First Post", content: "Hello world!" },
    { id: 2, title: "Second Post", content: "Another post." }
  ]));
  await new Promise(r => setTimeout(r, 150));

  // Stream a log field, word by word
  const words = "Streaming updates as they arrive!".split(" ");
  for (const word of words) {
    await new Promise(r => setTimeout(r, 200));
    writer(text(logRef, word + " "));
  }

  res.end();
});

app.listen(3001, () => {
  console.log("Server running at http://localhost:3001");
});
```

### 2. Minimal Client Example (React, with Streaming Field)

```tsx
import { useProgressiveJson } from "@yoyo-org/progressive-json";

export function ProgressiveChunkDemo() {
  const { store } = useProgressiveJson({
    url: "http://localhost:3001/api/progressive-chunk",
  });

  if (!store) return <div>Loading...</div>;

  return (
    <div>
      <h2>Progressive Chunk Demo</h2>
      <pre>{JSON.stringify(store, null, 2)}</pre>
      <div>
        <strong>Live log:</strong> {store.log}
      </div>
    </div>
  );
}
```

---

**The `log` field above will update live as the server streams new data!**

You can expand on this with more fields, references, and streaming updates as shown in the full demo.

## License

MIT License - see [LICENSE](./progressive-json/LICENSE) for details.

---

**Made with ❤️ by [@yoyo-67](https://github.com/yoyo-67)**

