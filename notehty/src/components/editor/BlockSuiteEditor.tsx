import { useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import type { Doc } from "@blocksuite/store";
import { useEditor } from "./EditorProvider";
import { updateDocument } from "../../invoke";

interface BlockSuiteEditorProps {
  docId: string;
  mode?: "page" | "edgeless";
  onDocReady?: (doc: Doc) => void;
}

const SAVE_DEBOUNCE_MS = 800;

const BlockSuiteEditor = ({
  docId,
  mode = "page",
  onDocReady,
}: BlockSuiteEditorProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLElement | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { getOrLoadDoc } = useEditor();
  const [doc, setDoc] = useState<Doc | null>(null);

  useEffect(() => {
    let cancelled = false;
    getOrLoadDoc(docId).then((loadedDoc) => {
      if (!cancelled) {
        setDoc(loadedDoc);
        onDocReady?.(loadedDoc);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [docId, getOrLoadDoc, onDocReady]);

  useEffect(() => {
    if (!containerRef.current || !doc) return;

    const editor = document.createElement("affine-editor-container");
    (editor as HTMLElement & { doc: Doc; mode: string }).doc = doc;
    (editor as HTMLElement & { doc: Doc; mode: string }).mode = mode;
    editor.style.cssText =
      "display:block;width:100%;height:100%;min-height:0;";
    containerRef.current.appendChild(editor);
    editorRef.current = editor;

    const handleUpdate = () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        const bytes = Y.encodeStateAsUpdate(doc.spaceDoc);
        const arr = Array.from(bytes);
        const title = extractTitle(doc);
        const text = extractPlainText(doc);
        updateDocument(docId, arr, text, title).catch(console.error);
      }, SAVE_DEBOUNCE_MS);
    };

    doc.spaceDoc.on("update", handleUpdate);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      doc.spaceDoc.off("update", handleUpdate);
      editor.remove();
      editorRef.current = null;
    };
  }, [doc, docId, mode]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", minHeight: 0 }}
    />
  );
};

function extractTitle(doc: Doc): string {
  try {
    const blocks = doc.getBlockByFlavour("affine:page");
    if (blocks.length > 0) {
      const props = blocks[0] as unknown as {
        title?: { toString: () => string };
      };
      return props.title ? props.title.toString() : "";
    }
  } catch {
    // ignore
  }
  return "";
}

function extractPlainText(doc: Doc): string {
  try {
    const paragraphs = doc.getBlockByFlavour("affine:paragraph");
    return paragraphs
      .map((b) => {
        const props = b as unknown as { text?: { toString: () => string } };
        return props.text ? props.text.toString() : "";
      })
      .join("\n");
  } catch {
    // ignore
  }
  return "";
}

export default BlockSuiteEditor;
