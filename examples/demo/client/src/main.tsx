import "./index.css";
import { ProgressiveChunkDemo } from "../App.tsx";
import { createRoot } from "react-dom/client";
import { PluginDemo } from "./PluginDemo.tsx";

export function Main() {
  // return <ProgressiveChunkDemo />;
  return <PluginDemo />;
}

const container = document.getElementById("root");
const root = createRoot(container!);
root.render(<Main />);
