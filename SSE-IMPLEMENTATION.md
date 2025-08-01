# Server-Sent Events (SSE) Implementation for Progressive-Json

This implementation adds Server-Sent Events (SSE) support to Progressive-Json with authentication capabilities.

## Features

- ✅ Server-Sent Events for real-time streaming
- ✅ Authentication support with Bearer tokens
- ✅ Automatic reconnection handling
- ✅ Keep-alive mechanism
- ✅ Backward compatibility with original implementation

## Server Setup

### 1. Install Dependencies

```bash
npm install jsonwebtoken
# or
yarn add jsonwebtoken
```

### 2. Server Implementation

```typescript
import express from "express";
import { writeSSEHeaders, writeSSE, closeSSE } from "@yoyo-org/progressive-json/dist/utils/server-sse";
import jwt from "jsonwebtoken";

// Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// SSE endpoint
app.get("/api/progressive-sse", authenticateToken, async (req, res) => {
  writeSSEHeaders(res);
  const writer = writeSSE(res);
  
  // Keep connection alive
  const keepAlive = setInterval(() => {
    res.write(":keepalive\n\n");
  }, 30000);

  // Handle client disconnect
  req.on("close", () => {
    clearInterval(keepAlive);
  });

  // Stream your data
  writer(init({ /* your initial data */ }));
  await wait(100);
  writer(value(refKey, "some value"));
  
  // Close connection when done
  closeSSE(res);
  clearInterval(keepAlive);
});
```

## Client Setup

### Using the React Hook

```typescript
import { useProgressiveSSE } from "@yoyo-org/progressive-json";

function MyComponent() {
  const { store, isStreaming, streamError } = useProgressiveSSE({
    url: "http://localhost:3001/api/progressive-sse",
    authToken: "your-jwt-token",
    plugins: [mergePlugin, incrementPlugin],
    onStreamStart: () => console.log("Stream started"),
    onStreamEnd: () => console.log("Stream ended"),
    onStreamError: (error) => console.error("Stream error:", error),
  });

  if (streamError) {
    return <div>Error: {streamError.message}</div>;
  }

  if (!store) {
    return <div>Loading...</div>;
  }

  return <pre>{JSON.stringify(store, null, 2)}</pre>;
}
```

### Using Programmatically

```typescript
import { ProcessorSSE } from "@yoyo-org/progressive-json";

const processor = new ProcessorSSE({
  url: "http://localhost:3001/api/progressive-sse",
  useSSE: true,
  headers: {
    Authorization: `Bearer ${authToken}`,
  },
  plugins: [mergePlugin, incrementPlugin],
});

// Subscribe to updates
const unsubscribe = processor.subscribe(() => {
  console.log("Store updated:", processor.getStore());
});

// Start fetching
processor.startFetching();

// Stop when done
processor.stop();
```

## Authentication Flow

1. **Login to get JWT token:**
```typescript
const response = await fetch("/api/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username, password }),
});
const { token } = await response.json();
```

2. **Use token with SSE:**
- The token is automatically included in the Authorization header
- For native EventSource (without custom headers), use query parameters or cookies

## Key Differences from Original Implementation

1. **Single persistent connection** instead of chunked HTTP response
2. **Real-time updates** with event-driven architecture
3. **Built-in reconnection** handling (with EventSource)
4. **Authentication support** via headers or cookies
5. **Keep-alive mechanism** to prevent connection timeouts

## Browser Compatibility

- Modern browsers fully support EventSource
- For older browsers or custom headers, the implementation falls back to fetch API with ReadableStream

## Security Considerations

1. Always use HTTPS in production
2. Implement proper JWT token expiration
3. Consider CORS settings for cross-origin requests
4. Validate and sanitize all streamed data

## Example Files

- **Server with Auth**: `/examples/demo/server/src/index-sse.ts`
- **Client with Auth**: `/examples/demo/client/App-SSE.tsx`
- **SSE Processor**: `/progressive-json/src/processor-sse.ts`
- **SSE React Hook**: `/progressive-json/src/useProgressiveSSE.ts`