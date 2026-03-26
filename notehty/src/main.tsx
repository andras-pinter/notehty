import "virtual:uno.css";
import "@toeverything/theme/style.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { EditorProvider } from "./components/editor/EditorProvider";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <EditorProvider>
      <App />
    </EditorProvider>
  </React.StrictMode>,
);
