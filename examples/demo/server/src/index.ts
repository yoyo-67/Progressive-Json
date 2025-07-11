import express from "express";
import http from "http";
import cors from "cors";
import {
  writeln,
  writeChunkHeaders,
  init,
  value,
  push,
  generateRefKey,
  resetRefKeyCounter,
  concat,
} from "@yoyo-org/progressive-json";
import { merge, increment } from "@yoyo-org/progressive-json";

// Custom message type for custom plugin
function custom(key: string, value: string, metadata?: { timestamp: string }) {
  return { type: "custom", key, value, metadata };
}

// Create a custom writer that can handle plugin message types
function writePluginMessage(res: any, message: any) {
  res.write(JSON.stringify(message) + "\n");
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const app = express();
app.use(cors());
const server = http.createServer(app);

app.get("/api/progressive-chunk", async (req, res) => {
  writeChunkHeaders(res);
  const writer = writeln(res);
  resetRefKeyCounter();

  const userNameRef = generateRefKey();
  const userAvatarRef = generateRefKey();
  const postsRef = generateRefKey();
  const notificationsRef = generateRefKey();
  const thirdPostRef = generateRefKey();
  const itemsRef = generateRefKey();
  const countersRef = generateRefKey();
  const customDataRef = generateRefKey();
  const loginCountRef = generateRefKey();
  const postsCountRef = generateRefKey();

  writer(
    init({
      user: { name: userNameRef, age: 30, avatar: userAvatarRef },
      posts: postsRef,
      config: { theme: "dark", notifications: notificationsRef },
      staticData: "Loaded!",
      counters: { loginCount: loginCountRef, postsCount: postsCountRef },
      customData: customDataRef,
    })
  );
  await wait(150);

  writer(value(userNameRef, "Alice"));
  await wait(150);

  writer(value(userAvatarRef, "https://example.com/avatar.png"));
  await wait(450);

  writer(
    value(postsRef, [
      { id: 1, title: "First Post", content: "Hello world!" },
      { id: 2, title: "Second Post", content: "Another post." },
      thirdPostRef,
    ])
  );

  await wait(150);

  writer(value(notificationsRef, true));
  await wait(100);

  writer(
    value(thirdPostRef, {
      id: 3,
      title: "Third Post",
      content: "More content here.",
      items: itemsRef,
    })
  );
  await wait(50);

  for (let i = 0; i < 1; i++) {
    await wait(500);
    const newItem = {
      id: i,
      text: `Item ${i}`,
      timestamp: Date.now(),
      status: i % 2 === 0 ? "active" : "pending",
    };
    writer(push(itemsRef, newItem));
  }

  await wait(100);
  function createNewItem(i: number) {
    return {
      id: i,
      text: `Item ${i}`,
      timestamp: Date.now(),
      status: i % 2 === 0 ? "active" : "pending",
    };
  }

  writer(
    concat(
      itemsRef,
      Array.from({ length: 1 }, (_, i) => createNewItem(i + 4))
    )
  );

  // Plugin system demonstrations
  await wait(200);

  // Set initial counter values
  writer(value(loginCountRef, 0));
  await wait(150);
  writer(value(postsCountRef, 0));
  await wait(150);

  // Use increment plugin to increment counters
  writePluginMessage(res, increment(loginCountRef));
  await wait(150);

  writePluginMessage(res, increment(postsCountRef, 3)); // Increment by 3
  await wait(150);

  // Use merge plugin to add user properties progressively
  writePluginMessage(res, merge(userNameRef, { email: "alice@example.com", verified: true }));
  await wait(150);

  writePluginMessage(
    res,
    merge(userNameRef, {
      lastLogin: new Date().toISOString(),
      preferences: { theme: "dark", notifications: true },
    })
  );
  await wait(150);

  // Use custom plugin
  writePluginMessage(
    res,
    custom(customDataRef, "Hello from custom plugin!", {
      timestamp: new Date().toISOString(),
    })
  );
  await wait(150);

  res.end();
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
