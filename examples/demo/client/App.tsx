import {
  incrementPlugin,
  mergePlugin,
  useProgressiveJson,
} from "@yoyo-org/progressive-json";

export function ProgressiveChunkDemo() {
  const { store } = useProgressiveJson<ProgressiveData>({
    url: "http://localhost:3001/api/progressive-chunk",
    plugins: [mergePlugin, incrementPlugin],
  });

  if (!store) {
    return <div>Loading...</div>;
  }

  return (
    <div
      style={{
        border: "1px solid #444",
        background: "#222",
        color: "#f8f8f8",
        padding: 16,
        margin: 16,
        borderRadius: 8,
      }}
    >
      <h2 style={{ color: "#ffe066" }}>Progressive Chunk Demo</h2>
      <pre
        style={{
          background: "#111",
          color: "#f8f8f8",
          padding: 8,
          minHeight: 100,
          borderRadius: 4,
        }}
      >
        {store ? JSON.stringify(store, null, 2) : "Loading..."}
      </pre>
    </div>
  );
}

type ProgressiveUser = {
  name?: string;
  age: number;
  avatar?: string;
};
type ProgressivePost = {
  id: number;
  title: string;
  content: string;
};
type ProgressiveConfig = {
  theme: string;
  notifications?: boolean;
};
type ProgressiveData = {
  user: ProgressiveUser;
  posts?: ProgressivePost[];
  config: ProgressiveConfig;
  staticData: string;
};
