import { useRef, useEffect } from "react";
import type { Doc } from "@blocksuite/store";
import { DocCollection } from "@blocksuite/store";
import type { AffineEditorContainer } from "@blocksuite/presets";
import { useCollection } from "./EditorProvider";
import { getDocument, updateDocument } from "../../invoke";

interface Props {
  docId: string;
}

// Module-level caches — survive StrictMode double-invoke
const docCache = new Map<string, Doc>();
const docLoading = new Map<string, Promise<Doc>>();

function getOrCreateDoc(collection: DocCollection, docId: string): Promise<Doc> {
  if (docCache.has(docId)) return Promise.resolve(docCache.get(docId)!);
  if (docLoading.has(docId)) return docLoading.get(docId)!;

  const promise = (async () => {
    const rawBytes = await getDocument(docId);
    const doc = collection.createDoc({ id: docId });
    docCache.set(docId, doc);
    docLoading.delete(docId);

    if (rawBytes.length > 0) {
      // Restore from stored Yjs state — apply update first, then load so
      // BlockSuite initialises block models from the existing Y data.
      DocCollection.Y.applyUpdate(doc.spaceDoc, new Uint8Array(rawBytes));
      doc.load();
    } else {
      // Fresh doc — use the initFn overload so blocks are added inside the
      // load phase (before doc.ready = true), which is the correct API.
      doc.load(() => {
        const rootId = doc.addBlock("affine:page", {});
        doc.addBlock("affine:surface", {}, rootId);
        const noteId = doc.addBlock("affine:note", {}, rootId);
        doc.addBlock("affine:paragraph", {}, noteId);
      });
      const state = DocCollection.Y.encodeStateAsUpdate(doc.spaceDoc);
      await updateDocument(docId, Array.from(state), "", "").catch(console.error);
    }

    return doc;
  })();

  docLoading.set(docId, promise);
  return promise;
}

export function BlockSuiteEditor({ docId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const collection = useCollection();

  useEffect(() => {
    if (!containerRef.current) return;

    let mounted = true;
    let editorEl: AffineEditorContainer | null = null;
    let saveTimer: ReturnType<typeof setTimeout>;
    let cleanupFn: (() => void) | undefined;

    getOrCreateDoc(collection, docId).then((doc) => {
      if (!mounted || !containerRef.current) return;

      editorEl = document.createElement("affine-editor-container") as AffineEditorContainer;
      editorEl.doc = doc;
      editorEl.autofocus = true;
      containerRef.current.appendChild(editorEl);

      const onUpdate = () => {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(async () => {
          const state = DocCollection.Y.encodeStateAsUpdate(doc.spaceDoc);
          await updateDocument(docId, Array.from(state), "", "").catch(console.error);
        }, 800);
      };

      doc.spaceDoc.on("update", onUpdate);
      cleanupFn = () => {
        clearTimeout(saveTimer);
        doc.spaceDoc.off("update", onUpdate);
      };
    });

    return () => {
      mounted = false;
      cleanupFn?.();
      if (containerRef.current && editorEl) {
        try { containerRef.current.removeChild(editorEl); } catch { /* already removed */ }
      }
    };
  }, [docId, collection]);

  return (
    <div
      ref={containerRef}
      style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}
    />
  );
}
