import { useRef } from "react";
import { Tldraw, type Editor } from "tldraw";
import "tldraw/tldraw.css";
import { getDocument, updateDocument } from "../../invoke";

interface DrawingEditorProps {
  docId: string;
}

const SAVE_MS = 1000;

const DrawingEditor = ({ docId }: DrawingEditorProps) => {
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMount = (editor: Editor) => {
    (async () => {
      const bytes = await getDocument(docId + "_drawing");
      if (bytes.length > 0) {
        try {
          const json = new TextDecoder().decode(new Uint8Array(bytes));
          const snapshot = JSON.parse(json);
          editor.loadSnapshot(snapshot);
        } catch {
          // corrupted — start with blank canvas
        }
      }

      editor.store.listen(
        () => {
          if (saveTimer.current) clearTimeout(saveTimer.current);
          saveTimer.current = setTimeout(() => {
            const snapshot = editor.getSnapshot();
            const json = JSON.stringify(snapshot);
            const bytes = Array.from(new TextEncoder().encode(json));
            updateDocument(docId + "_drawing", bytes, "", "").catch(console.error);
          }, SAVE_MS);
        },
        { source: "user" },
      );
    })();
  };

  return (
    <div style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}>
      <Tldraw onMount={handleMount} inferDarkMode />
    </div>
  );
};

export default DrawingEditor;
