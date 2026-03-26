import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from "react";
import { DocCollection, Schema } from "@blocksuite/store";
import { AffineSchemas } from "@blocksuite/blocks/schemas";
import { effects as presetsEffects } from "@blocksuite/presets/effects";
import * as Y from "yjs";
import type { Doc } from "@blocksuite/store";
import { getDocument } from "../../invoke";

// Register web components once at module load — must happen before any editor mounts
presetsEffects();

interface EditorContextValue {
  collection: DocCollection;
  getOrLoadDoc: (id: string) => Promise<Doc>;
  getDocIfLoaded: (id: string) => Doc | null;
}

const EditorContext = createContext<EditorContextValue | null>(null);

export const useEditor = (): EditorContextValue => {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditor must be used within EditorProvider");
  return ctx;
};

// Singletons live outside React so StrictMode double-mount doesn't recreate them
let sharedCollection: DocCollection | null = null;
// Doc cache: collection.docs returns BlockCollection (wrong type); we keep Doc instances ourselves
const docCache = new Map<string, Doc>();

function getCollection(): DocCollection {
  if (!sharedCollection) {
    const schema = new Schema().register(AffineSchemas);
    sharedCollection = new DocCollection({ schema });
    sharedCollection.meta.initialize();
  }
  return sharedCollection;
}

export const EditorProvider = ({ children }: { children: React.ReactNode }) => {
  const collectionRef = useRef<DocCollection>(getCollection());
  const loadingRef = useRef<Map<string, Promise<Doc>>>(new Map());

  const getOrLoadDoc = useCallback(async (id: string): Promise<Doc> => {
    // Return cached Doc (proper Doc instance, not BlockCollection)
    const cached = docCache.get(id);
    if (cached) return cached;

    // Deduplicate in-flight loads
    const inflight = loadingRef.current.get(id);
    if (inflight) return inflight;

    const load = async (): Promise<Doc> => {
      const collection = collectionRef.current;
      const savedBytes = await getDocument(id);

      // createDoc adds a BlockCollection and returns a Doc wrapper
      const doc = collection.createDoc({ id }) as Doc;

      if (savedBytes && savedBytes.length > 0) {
        Y.applyUpdate(doc.spaceDoc, new Uint8Array(savedBytes));
        doc.load();
      } else {
        doc.load(() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const d = doc as any;
          const rootId = d.addBlock("affine:page", {});
          d.addBlock("affine:surface", {}, rootId);
          const noteId = d.addBlock("affine:note", {}, rootId);
          d.addBlock("affine:paragraph", {}, noteId);
        });
      }

      docCache.set(id, doc);
      loadingRef.current.delete(id);
      return doc;
    };

    const promise = load();
    loadingRef.current.set(id, promise);
    return promise;
  }, []);

  const getDocIfLoaded = useCallback((id: string): Doc | null => {
    return docCache.get(id) ?? null;
  }, []);

  const value = useMemo(
    () => ({ collection: collectionRef.current, getOrLoadDoc, getDocIfLoaded }),
    [getOrLoadDoc, getDocIfLoaded],
  );

  return (
    <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
  );
};
