// This file must be the FIRST import in main.tsx.
// Calling effects synchronously here guarantees all BlockSuite custom elements
// are registered before any React component is evaluated or rendered.
//
// We MUST call blocksEffects() first — it registers editor-host (via block-std),
// all block-level components (affine-paragraph, affine-note, etc.), and widgets.
// presetsEffects() then registers the top-level wrappers (affine-editor-container,
// edgeless-editor, etc.) that depend on those block components.
//
// blocksEffects() is NOT called by presetsEffects() — the presets effects.js only
// side-effect-imports @blocksuite/blocks/effects without calling its effects fn.
// Omitting blocksEffects() means editor-host is never registered, causing WebKit
// to throw "new.target does not define a custom element" in BlockStdScope.render().
import { effects as blocksEffects } from "@blocksuite/blocks/effects";
import { effects as presetsEffects } from "@blocksuite/presets/effects";

if (typeof customElements !== "undefined" && !customElements.get("editor-host")) {
  blocksEffects();
}
if (typeof customElements !== "undefined" && !customElements.get("affine-editor-container")) {
  presetsEffects();
}
