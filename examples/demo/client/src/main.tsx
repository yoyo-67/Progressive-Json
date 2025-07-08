import "./index.css";
import { ProgressiveChunkDemo } from "../App.tsx";
import { createRoot } from "react-dom/client";

export function Main() {
  return <ProgressiveChunkDemo />;
}

const container = document.getElementById("root");
const root = createRoot(container!);
root.render(<Main />);
