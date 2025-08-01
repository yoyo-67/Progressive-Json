import { useState, useEffect } from "react";
import {
  incrementPlugin,
  mergePlugin,
  useProgressiveSSE,
} from "@yoyo-org/progressive-json";

export function ProgressiveSSEDemo() {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Login function
  const login = async () => {
    try {
      const response = await fetch("http://localhost:3001/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: "demo",
          password: "password",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAuthToken(data.token);
        setLoginError(null);
      } else {
        setLoginError("Invalid credentials");
      }
    } catch (error) {
      setLoginError("Failed to login");
    }
  };

  // Use the SSE hook with authentication
  const { store, isStreaming, streamError } = useProgressiveSSE<ProgressiveData>({
    url: authToken ? "http://localhost:3001/api/progressive-sse" : "",
    authToken: authToken || undefined,
    enabled: !!authToken,
    plugins: [mergePlugin, incrementPlugin],
    onStreamStart: () => console.log("SSE stream started"),
    onStreamEnd: () => console.log("SSE stream ended"),
    onStreamError: (error) => console.error("SSE stream error:", error),
  });

  // Auto-login on mount for demo purposes
  useEffect(() => {
    if (!authToken) {
      login();
    }
  }, []);

  if (!authToken) {
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
        <h2 style={{ color: "#ffe066" }}>SSE Authentication</h2>
        {loginError && (
          <p style={{ color: "#ff6b6b" }}>{loginError}</p>
        )}
        <button
          onClick={login}
          style={{
            padding: "8px 16px",
            background: "#4c6ef5",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          Login
        </button>
      </div>
    );
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
      <h2 style={{ color: "#ffe066" }}>Progressive SSE Demo with Auth</h2>
      
      <div style={{ marginBottom: 16 }}>
        <span style={{ color: "#82c91e" }}>
          Status: {isStreaming ? "Streaming..." : "Connected"}
        </span>
        {streamError && (
          <p style={{ color: "#ff6b6b" }}>
            Error: {streamError.message}
          </p>
        )}
      </div>

      <pre
        style={{
          background: "#111",
          color: "#f8f8f8",
          padding: 8,
          minHeight: 100,
          borderRadius: 4,
          overflow: "auto",
        }}
      >
        {store ? JSON.stringify(store, null, 2) : "Waiting for data..."}
      </pre>

      <button
        onClick={() => {
          setAuthToken(null);
          window.location.reload();
        }}
        style={{
          marginTop: 16,
          padding: "8px 16px",
          background: "#ff6b6b",
          color: "white",
          border: "none",
          borderRadius: 4,
          cursor: "pointer",
        }}
      >
        Logout
      </button>
    </div>
  );
}

type ProgressiveUser = {
  name?: string;
  age: number;
  avatar?: string;
  email?: string;
  verified?: boolean;
  lastLogin?: string;
  preferences?: {
    theme: string;
    notifications: boolean;
  };
};

type ProgressivePost = {
  id: number;
  title: string;
  content: string;
  items?: Array<{
    id: number;
    text: string;
    timestamp: number;
    status: string;
  }>;
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
  counters?: {
    loginCount?: number;
    postsCount?: number;
  };
  customData?: any;
};