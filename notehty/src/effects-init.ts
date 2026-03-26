// This file must be the FIRST import in main.tsx.
// Calling effects() synchronously here guarantees all BlockSuite custom elements
// are registered before any React component is evaluated or rendered.
// The customElements.get() guard makes this safe for Vite HMR re-evaluation
// (re-running this module won't call effects() again if elements are already defined).
import { effects } from "@blocksuite/presets/effects";

if (typeof customElements !== "undefined" && !customElements.get("affine-editor-container")) {
  effects();
}
