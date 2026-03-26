import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { DocCollection, Schema } from "@blocksuite/store";
import { AffineSchemas } from "@blocksuite/blocks/schemas";
import { effects as presetsEffects } from "@blocksuite/presets/effects";
import * as Y from "yjs";
import type { Doc } from "@blocksuite/store";
import { getDocument } from "../../invoke";

let effectsRegistered = false;

function ensureEffects() {
  if (!effectsRegistered) {
    presetsEffects();
    effectsRegistered = true;
  }
}

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

let sharedCollection: DocCollection | null = null;

function getCollection(): DocCollection {
  if (!sharedCollection) {
    const schema = new Schema().register(AffineSchemas);
    sharedCollection = new DocCollection({ schema });
    sharedCollection.meta.initialize();
  }
  return sharedCollection;
}

export const EditorProvider = ({ children }: { children: React.ReactNode }) => {
  const [ready, setReady] = useState(false);
  const collectionRef = useRef<DocCollection>(getCollection());
  const loadingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    ensureEffects();
    setReady(true);
  }, []);

  const getOrLoadDoc = useCallback(async (id: string): Promise<Doc> => {
    const collection = collectionRef.current;

    const existing = collection.docs.get(id);
    if (existing) return existing as unknown as Doc;

    if (loadingRef.current.has(id)) {
      return new Promise((resolve) => {
        const check = setInterval(() => {
          const doc = collection.docs.get(id);
          if (doc) {
            clearInterval(check);
            resolve(doc as unknown as Doc);
          }
        }, 50);
      });
    }

    loadingRef.current.add(id);

    const savedBytes = await getDocument(id);
    const doc = collection.createDoc({ id });

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

    loadingRef.current.delete(id);
    return doc as unknown as Doc;
  }, []);

  const getDocIfLoaded = useCallback((id: string): Doc | null => {
    return (collectionRef.current.docs.get(id) as unknown as Doc) ?? null;
  }, []);

  const value = useMemo(
    () => ({ collection: collectionRef.current, getOrLoadDoc, getDocIfLoaded }),
    [getOrLoadDoc, getDocIfLoaded],
  );

  if (!ready) return null;

  return (
    <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
  );
};
