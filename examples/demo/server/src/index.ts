import express, { type Response } from "express";
import http from "http";
import cors from "cors";
import {
  writeln,
  writeChunkHeaders,
  init,
  ref,
  stream,
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
  const heyRef = generateRefKey();

  writer(
    init({
      user: { name: userNameRef, age: 30, avatar: userAvatarRef },
      posts: postsRef,
      config: { theme: "dark", notifications: notificationsRef },
      staticData: "Loaded!",
    })
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
    ])
  );
  await wait(150);

  writer(ref(notificationsRef, true));
  await wait(100);

  writer(
    ref(thirdPostRef, {
      id: 3,
      title: "Third Post",
      content: "More content here.",
      hey: heyRef,
    })
  );
  await wait(50);

  const words =
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.".split(
      " "
    );
  for (let i = 0; i < 10; i++) {
    await wait(100);
    let buffer = `${words[i % words.length]} `;
    writer(stream(heyRef, buffer));
  }

  res.end();
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
