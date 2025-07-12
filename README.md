# progressive-json

**Stream JSON data as it arrives, not when it's complete**

[![npm version](https://badge.fury.io/js/@yoyo-org%2Fprogressive-json.svg)](https://badge.fury.io/js/@yoyo-org%2Fprogressive-json)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

## The Problem

Waiting for complete JSON responses creates slow, unresponsive experiences. Users see blank screens while large datasets load.

**progressive-json** streams JSON data chunk by chunk, updating your client as each piece arrives.

## How It Works

The server sends JSON in progressive chunks, and your app processes each piece immediately:   

![Progressive JSON Demo](https://github.com/yoyo-67/Progressive-Json/blob/main/assets/demo-json.gif)

## Features

- **⚡ Instant Updates** - See data as it streams in
- **🎯 Smart References** - Handle complex nested data seamlessly  
- **⚛️ React Ready** - Simple `useProgressiveJson` hook
- **🛡️ TypeScript** - Full type safety included
- **🔄 Universal** - Works with any streaming endpoint
- **🔌 Plugin System** - Extend functionality with custom message types

## Core Concepts

### References and Placeholders

Progressive JSON works by creating "placeholders" in your initial JSON structure, then filling them in as data becomes available.

1. **Create references** using `generateRefKey()`
2. **Use references as placeholders** in your initial JSON structure
3. **Fill placeholders** using API functions as data becomes available

```ts
// 1. Create reference
const userNameRef = generateRefKey();

// 2. Use as placeholder
writer(init({ user: { name: userNameRef } }));

// 3. Fill with actual data
writer(value(userNameRef, "Alice"));
```

### Mixing API Calls

You can call different API functions on the same reference:

```ts
// This is perfectly valid:
writer(text(logRef, "Starting... "));
writer(text(logRef, "progress... "));
writer(value(logRef, "Complete!")); // Replaces entire content
```

## API Reference

### Core Functions

#### `init(data)`
Initialize the JSON structure with placeholders for dynamic content.
```ts
const userNameRef = generateRefKey();
const postsRef = generateRefKey();

init({
  user: { name: userNameRef, age: 30 },
  posts: postsRef,
  staticData: "Loaded!"
})
```

#### `value(ref, value)`
Set or replace a placeholder with its final value.
```ts
value(userNameRef, "Alice")
value(postsRef, [{ id: 1, title: "First Post" }])
```

#### `text(ref, value)`
Append text to a placeholder progressively.
```ts
text(logRef, "Processing... ")
text(logRef, "almost done... ")
text(logRef, "complete!")
// Result: "Processing... almost done... complete!"
```

#### `push(ref, value)`
Add a single item to an array placeholder.
```ts
push(notificationsRef, { id: 1, message: "New notification" })
push(notificationsRef, { id: 2, message: "Another notification" })
```

#### `concat(ref, values)`
Add multiple items to an array placeholder at once.
```ts
concat(usersRef, [
  { id: 1, name: "Alice" }, 
  { id: 2, name: "Bob" }
])
```

### When to Use Each Function

- **`value()`** - Set or replace entire value (final data)
- **`text()`** - Build up text progressively (streaming text)
- **`push()`** - Add single items to arrays one by one
- **`concat()`** - Add multiple items to arrays efficiently

### Utility Functions

#### `generateRefKey()`
Creates a unique reference key for placeholders.
```ts
const myRef = generateRefKey();
```

#### `writeln(res)` & `writeChunkHeaders(res)`
Server utilities for streaming responses.

```ts
// Source code - no black magic!
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
```

Usage:
```ts
writeChunkHeaders(res);
const writer = writeln(res);
```

## Plugin System

Extend progressive-json with custom message types and behaviors.

### Creating a Plugin

```ts
import type { Plugin } from "@yoyo-org/progressive-json";

const myPlugin: Plugin = {
  type: "my-type",
  handleMessage: (message, store, context) => {
    // Handle your custom message type
    return context.updateAtPath(store, message.key, (obj, lastKey) => {
      obj[lastKey] = message.value;
    });
  },
};
```

### Using Plugins

```ts
import { useProgressiveJson } from "@yoyo-org/progressive-json";

const { store } = useProgressiveJson({
  url: "...",
  plugins: [myPlugin],
});
```

### Type-Safe Plugins

For full type safety, use the two-generic interface:

```ts
type CustomMessage = { 
  type: "custom"; 
  key: string; 
  value: string; 
};

const typedPlugin: Plugin<CustomMessage, MyStoreType> = {
  type: "custom",
  handleMessage: (message, store, context) => {
    // message is fully typed as CustomMessage
    // store is fully typed as MyStoreType
    return context.updateAtPath(store, message.key, (obj, lastKey) => {
      obj[lastKey] = message.value;
    });
  },
};
```

### Server-Side Plugin Messages

To send custom plugin messages from the server, create helper functions and a custom writer:

```ts
// 1. Create helper function for your custom message type
function custom(key: string, value: string, metadata?: { timestamp: string }) {
  return { type: "custom", key, value, metadata };
}

// 2. Create a custom writer that handles plugin messages
function writePluginMessage(res: any, message: any) {
  res.write(JSON.stringify(message) + "\n");
}

// 3. Use in your server endpoint
app.get("/api/custom-plugin", async (req, res) => {
  writeChunkHeaders(res);
  const writer = writeln(res);
  
  const customDataRef = generateRefKey();
  
  // Send initial structure
  writer(init({ customData: customDataRef }));
  
  // Send custom plugin message
  writePluginMessage(res, custom(customDataRef, "Hello from custom plugin!", {
    timestamp: new Date().toISOString(),
  }));
  
  res.end();
});
```

### Complete Plugin Example

**Client-side plugin:**
```ts
type CustomMessage = { 
  type: "custom"; 
  key: string; 
  value: string; 
  metadata?: { timestamp: string };
};

const customPlugin: Plugin<CustomMessage> = {
  type: "custom",
  handleMessage: (message, store, context) => {
    console.log("Received custom message:", message.value);
    console.log("Timestamp:", message.metadata?.timestamp);
    
    return context.updateAtPath(store, message.key, (obj, lastKey) => {
      obj[lastKey] = message.value;
    });
  },
};
```

**Server-side helper:**
```ts
function custom(key: string, value: string, metadata?: { timestamp: string }) {
  return { type: "custom", key, value, metadata };
}

// Usage in server
writePluginMessage(res, custom(myRef, "Custom data", { 
  timestamp: new Date().toISOString() 
}));
```

## Quick Start

### Install

```bash
npm install @yoyo-org/progressive-json
```

### 1. Server Example (Express)

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
} from "@yoyo-org/progressive-json";

const app = express();
app.use(cors());

app.get("/api/progressive", async (req, res) => {
  writeChunkHeaders(res);
  const writer = writeln(res);

  // Create references
  const userNameRef = generateRefKey();
  const postsRef = generateRefKey();
  const logRef = generateRefKey();

  // Send initial structure
  writer(init({
    user: { name: userNameRef, age: 30 },
    posts: postsRef,
    staticData: "Loaded!",
    log: logRef,
  }));
  
  await new Promise(r => setTimeout(r, 100));

  // Send data progressively
  writer(value(userNameRef, "Alice"));
  await new Promise(r => setTimeout(r, 100));

  writer(value(postsRef, [
    { id: 1, title: "First Post" },
    { id: 2, title: "Second Post" }
  ]));
  await new Promise(r => setTimeout(r, 100));

  // Stream text progressively
  const words = "Streaming text word by word".split(" ");
  for (const word of words) {
    writer(text(logRef, word + " "));
    await new Promise(r => setTimeout(r, 200));
  }

  res.end();
});

app.listen(3001, () => {
  console.log("Server running at http://localhost:3001");
});
```

### 2. Client Example (React)

```tsx
import { useProgressiveJson } from "@yoyo-org/progressive-json";

export function ProgressiveDemo() {
  const { store } = useProgressiveJson({
    url: "http://localhost:3001/api/progressive",
  });

  if (!store) return <div>Loading...</div>;

  return (
    <div>
      <h2>Progressive JSON Demo</h2>
      <pre>{JSON.stringify(store, null, 2)}</pre>
      
      {/* Live streaming text */}
      <div>
        <strong>Live log:</strong> {store.log}
      </div>
    </div>
  );
}
```

### 3. TypeScript Support

Define your data structure for full type safety:

```tsx
interface MyData {
  user: { name: string; age: number };
  posts: Array<{ id: number; title: string }>;
  log: string;
  staticData: string;
}

const { store } = useProgressiveJson<MyData>({
  url: "http://localhost:3001/api/progressive",
});

// store is now fully typed as MyData | null
```

## Advanced Examples

### Array Operations

```ts
// Server side
const itemsRef = generateRefKey();

writer(init({ items: itemsRef }));

// Add items one by one
writer(push(itemsRef, { id: 1, name: "Item 1" }));
writer(push(itemsRef, { id: 2, name: "Item 2" }));

// Add multiple items at once
writer(concat(itemsRef, [
  { id: 3, name: "Item 3" },
  { id: 4, name: "Item 4" }
]));
```

### Nested References

```ts
// Server side
const userRef = generateRefKey();
const profileRef = generateRefKey();

writer(init({
  user: userRef,
  metadata: { timestamp: Date.now() }
}));

writer(value(userRef, {
  name: "Alice",
  profile: profileRef
}));

writer(value(profileRef, {
  bio: "Software developer",
  avatar: "https://example.com/avatar.png"
}));
```

### Progressive Text Streaming

```ts
// Server side - perfect for AI responses
const responseRef = generateRefKey();
writer(init({ aiResponse: responseRef }));

const response = "This is a progressive response from AI";
for (const char of response) {
  writer(text(responseRef, char));
  await new Promise(r => setTimeout(r, 50));
}
```

## License

MIT License - see [LICENSE](./progressive-json/LICENSE) for details.

---

**Made with ❤️ by [@yoyo-67](https://github.com/yoyo-67)**

