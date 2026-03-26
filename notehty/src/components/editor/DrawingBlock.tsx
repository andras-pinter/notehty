import { createReactBlockSpec } from "@blocknote/react";
import DrawingEditor from "./DrawingEditor";

export const DrawingBlock = createReactBlockSpec(
  {
    type: "drawing" as const,
    propSchema: {},
    content: "none" as const,
  },
  {
    render: ({ block }) => (
      <div
        style={{
          width: "100%",
          height: 340,
          position: "relative",
          borderRadius: 6,
          overflow: "hidden",
          border: "1px solid var(--border)",
          margin: "4px 0",
        }}
      >
        <DrawingEditor docId={`block_${block.id}`} />
      </div>
    ),
  },
);
