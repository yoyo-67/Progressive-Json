import React from "react";
import {
  useProgressiveJson,
  mergePlugin,
  incrementPlugin,
  type Plugin,
  type PlaceholderStore,
} from "@yoyo-org/progressive-json";

// Example of a typed plugin using the two-generic interface
type CustomMessage = { type: "custom"; key: string; value: string; metadata?: { timestamp: string } };

const customPlugin: Plugin<CustomMessage, PlaceholderStore<unknown>> = {
  type: "custom",
  handleMessage: (message, store, context) => {
    // message is guaranteed to be a custom message
    console.log("Custom plugin called with value:", message.value);
    return context.updateAtPath(
      store,
      message.key,
      (obj: Record<string | number, unknown>, lastKey: string | number) => {
        obj[lastKey] = message.value;
      }
    );
  },
};

export function PluginDemo() {
  const { store } = useProgressiveJson<ProgressiveData>({
    url: "http://localhost:3001/api/progressive-chunk",
    plugins: [mergePlugin, incrementPlugin, customPlugin], // Register all plugins
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
      <h2 style={{ color: "#ffe066" }}>Plugin System Demo</h2>

      <div style={{ marginBottom: "16px" }}>
        <h3 style={{ color: "#4fc3f7" }}>Two-Generic Plugin Interface</h3>
        <p>This demo shows the new Plugin interface with two generic types:</p>
        <pre
          style={{
            background: "#333",
            padding: "8px",
            borderRadius: "4px",
            fontSize: "12px",
          }}
        >
          {`interface Plugin<
  TMessage extends ProgressiveChunkMessage = ProgressiveChunkMessage,
  TStore extends PlaceholderStore = PlaceholderStore
> {
  name: string;
  messageTypes: string[];
  handleMessage: (
    message: TMessage,
    store: TStore,
    context: PluginContext<TStore>
  ) => TStore;
}`}
        </pre>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <h4 style={{ color: "#81c784" }}>Plugin Examples:</h4>
        <ul>
          <li>
            <strong>Merge Plugin:</strong> Built-in plugin that merges objects progressively
          </li>
          <li>
            <strong>Increment Plugin:</strong> Built-in plugin that increments numeric values
          </li>
          <li>
            <strong>Custom Plugin:</strong> Example of a typed plugin with custom message structure
          </li>
        </ul>
      </div>

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

      <div
        style={{
          marginTop: "16px",
          padding: "12px",
          background: "#333",
          borderRadius: "4px",
        }}
      >
        <h4 style={{ color: "#81c784" }}>Benefits of Two Generics:</h4>
        <ul style={{ fontSize: "14px" }}>
          <li>
            ✅ <strong>TMessage:</strong> Type-safe message structure
          </li>
          <li>
            ✅ <strong>TStore:</strong> Type-safe store structure
          </li>
          <li>✅ Better IntelliSense and autocomplete</li>
          <li>✅ Compile-time error checking</li>
          <li>✅ Self-documenting code</li>
        </ul>
      </div>

      <div
        style={{
          marginTop: "16px",
          padding: "12px",
          background: "#1a1a1a",
          borderRadius: "4px",
          border: "1px solid #444",
        }}
      >
        <h4 style={{ color: "#ff9800" }}>Usage Examples:</h4>
        <pre style={{ fontSize: "12px", margin: 0 }}>
          {`// Basic plugin (uses default types)
const basicPlugin: Plugin = { ... };

// Plugin with typed message
const typedMessagePlugin: Plugin<CustomMessage> = { ... };

// Plugin with typed store
const typedStorePlugin: Plugin<ProgressiveChunkMessage, MyStore> = { ... };

// Plugin with both typed message and store
const fullyTypedPlugin: Plugin<CustomMessage, MyStore> = { ... };`}
        </pre>
      </div>

      <div
        style={{
          marginTop: "16px",
          padding: "12px",
          background: "#2d1b69",
          borderRadius: "4px",
          border: "1px solid #7c4dff",
        }}
      >
        <h4 style={{ color: "#bb86fc" }}>Type Safety Example:</h4>
        <p style={{ fontSize: "14px" }}>
          The <code>customPlugin</code> above demonstrates type safety. TypeScript knows that:
        </p>
        <ul style={{ fontSize: "14px" }}>
          <li>
            <code>message.metadata?.timestamp</code> is a string (if it exists)
          </li>
          <li>
            <code>message.value</code> is a string (not unknown)
          </li>
          <li>The plugin can only handle "custom" message types</li>
        </ul>
      </div>
    </div>
  );
}

// Type definitions
interface ProgressiveData {
  user: ProgressiveUser;
  posts?: ProgressivePost[];
  config: ProgressiveConfig;
  staticData: string;
  counters: {
    loginCount: number;
    postsCount: number;
  };
  customData?: string;
  [key: string]: unknown;
}

type ProgressiveUser = {
  name?: string;
  age: number;
  avatar?: string;
  email?: string;
  verified?: boolean;
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
