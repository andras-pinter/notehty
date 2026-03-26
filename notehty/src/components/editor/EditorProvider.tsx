import { createContext, useContext, type ReactNode } from "react";
import { DocCollection, Schema } from "@blocksuite/store";
import { AffineSchemas } from "@blocksuite/blocks/schemas";
import { effects } from "@blocksuite/presets/effects";

// Register all BlockSuite web components once — guard against HMR double-registration
if (!customElements.get("affine-editor-container")) {
  effects();
}

const schema = new Schema().register(AffineSchemas);

export const collection = new DocCollection({ schema });
collection.meta.initialize();

const CollectionContext = createContext(collection);

export const useCollection = () => useContext(CollectionContext);

export function EditorProvider({ children }: { children: ReactNode }) {
  return (
    <CollectionContext.Provider value={collection}>
      {children}
    </CollectionContext.Provider>
  );
}
