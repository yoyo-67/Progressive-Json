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

  writer(value(userNameRef, "Alice"));
  await wait(150);

  writer(value(userAvatarRef, "https://example.com/avatar.png"));
  await wait(450);

  writer(
    value(postsRef, [
      { id: 1, title: "First Post", content: "Hello world!" },
      { id: 2, title: "Second Post", content: "Another post." },
      thirdPostRef,
    ]),
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
    }),
  );
  await wait(50);

  for (let i = 0; i < 4; i++) {
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
      Array.from({ length: 4 }, (_, i) => createNewItem(i + 4)),
    ),
  );

  res.end();
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
