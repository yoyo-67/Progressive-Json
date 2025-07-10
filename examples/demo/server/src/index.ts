import express, { type Response } from "express";
import http from "http";
import cors from "cors";
import {
  writeln,
  writeChunkHeaders,
  init,
  ref,
  push,
  generateRefKey,
  resetRefKeyCounter,
} from "@yoyo-org/progressive-json";

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

  writer(
    init({
      user: { name: userNameRef, age: 30, avatar: userAvatarRef },
      posts: postsRef,
      config: { theme: "dark", notifications: notificationsRef },
      staticData: "Loaded!",
    }),
  );
  await wait(150);

  writer(ref(userNameRef, "Alice"));
  await wait(150);

  writer(ref(userAvatarRef, "https://example.com/avatar.png"));
  await wait(450);

  writer(
    ref(postsRef, [
      { id: 1, title: "First Post", content: "Hello world!" },
      { id: 2, title: "Second Post", content: "Another post." },
      thirdPostRef,
    ]),
  );

  await wait(150);

  writer(ref(notificationsRef, true));
  await wait(100);

  writer(
    ref(thirdPostRef, {
      id: 3,
      title: "Third Post",
      content: "More content here.",
      items: itemsRef,
    }),
  );
  await wait(50);

  for (let i = 0; i < 10; i++) {
    await wait(500);
    const newItem = {
      id: i,
      text: `Item ${i}`,
      timestamp: Date.now(),
      status: i % 2 === 0 ? "active" : "pending",
    };
    writer(push(itemsRef, newItem));
  }

  res.end();
});

app.get("/api/stream-items", async (req, res) => {
  writeChunkHeaders(res);
  const writer = writeln(res);
  resetRefKeyCounter();

  const itemsRef = generateRefKey();

  // Initialize with empty array
  writer(init({ items: itemsRef }));
  await wait(100);

  // Start with empty array
  writer(ref(itemsRef, []));
  await wait(100);

  // Stream new items one by one
  for (let i = 0; i < 10; i++) {
    await wait(500);
    const newItem = {
      id: i,
      text: `Item ${i}`,
      timestamp: Date.now(),
      status: i % 2 === 0 ? "active" : "pending",
    };
    writer(push(itemsRef, newItem));
  }

  res.end();
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
