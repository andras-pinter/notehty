import "./effects-init"; // MUST be first — registers all BlockSuite custom elements
import React from "react";
import ReactDOM from "react-dom/client";
import "virtual:uno.css";
import App from "./App";
import "./App.css";
import { EditorProvider } from "./components/editor/EditorProvider";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <EditorProvider>
      <App />
    </EditorProvider>
  </React.StrictMode>,
);
