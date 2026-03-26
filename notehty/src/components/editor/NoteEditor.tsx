import { useEffect, useRef } from "react";
import {
  useCreateBlockNote,
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import {
  BlockNoteSchema,
  defaultBlockSpecs,
  filterSuggestionItems,
} from "@blocknote/core";
import type { PartialBlock } from "@blocknote/core";
import { PenLine } from "lucide-react";
import "@blocknote/mantine/style.css";
import "@blocknote/core/fonts/inter.css";
import { getDocument, updateDocument } from "../../invoke";
import { DrawingBlock } from "./DrawingBlock";

const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    drawing: DrawingBlock(),
  },
});

interface NoteEditorProps {
  docId: string;
}

const SAVE_MS = 800;

const NoteEditor = ({ docId }: NoteEditorProps) => {
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedRef = useRef(false);
  const docIdRef = useRef(docId);

  const editor = useCreateBlockNote({ schema });

  useEffect(() => {
    docIdRef.current = docId;
    loadedRef.current = false;

    (async () => {
      const bytes = await getDocument(docId);
      if (docIdRef.current !== docId) return;

      if (bytes.length > 0) {
        try {
          const json = new TextDecoder().decode(new Uint8Array(bytes));
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const blocks = JSON.parse(json) as any[];
          await editor.replaceBlocks(editor.document, blocks);
        } catch {
          // corrupted — start fresh
        }
      }

      loadedRef.current = true;
    })();
  }, [docId, editor]);

  const handleChange = () => {
    if (!loadedRef.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const blocks = editor.document as any[];
      const json = JSON.stringify(blocks);
      const bytes = Array.from(new TextEncoder().encode(json));
      await updateDocument(
        docIdRef.current,
        bytes,
        getPlainText(blocks),
        getTitle(blocks),
      );
    }, SAVE_MS);
  };

  return (
    <BlockNoteView
      editor={editor}
      theme="dark"
      onChange={handleChange}
      sideMenu={false}
      slashMenu={false}
      style={{ height: "100%", background: "transparent" }}
    >
      <SuggestionMenuController
        triggerCharacter="/"
        getItems={async (query) =>
          filterSuggestionItems(
            [
              ...getDefaultReactSlashMenuItems(editor),
              {
                title: "Drawing",
                subtext: "Insert a freehand drawing canvas",
                onItemClick: () => {
                  const pos = editor.getTextCursorPosition();
                  editor.insertBlocks([{ type: "drawing" }], pos.block, "after");
                },
                aliases: ["draw", "sketch", "canvas"],
                group: "Media",
                icon: <PenLine size={18} />,
              },
            ],
            query,
          )
        }
      />
    </BlockNoteView>
  );
};

function getTitle(blocks: PartialBlock[]): string {
  return blocks.length > 0 ? extractText(blocks[0]) : "";
}

function getPlainText(blocks: PartialBlock[]): string {
  return blocks.map(extractText).filter(Boolean).join("\n");
}

function extractText(block: PartialBlock): string {
  if (!block.content || !Array.isArray(block.content)) return "";
  return block.content
    .filter(
      (c): c is { type: "text"; text: string; styles: Record<string, unknown> } =>
        typeof c === "object" && c !== null && (c as { type: string }).type === "text",
    )
    .map((c) => c.text)
    .join("");
}

export default NoteEditor;
