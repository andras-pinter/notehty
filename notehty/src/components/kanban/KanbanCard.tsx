import { useDraggable } from "@dnd-kit/core";
import { GripVertical } from "lucide-react";
import type { WorkItem } from "../../invoke";

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  queue:       { bg: "rgba(255,255,255,0.05)", text: "var(--text-subtle)" },
  priority:    { bg: "rgba(249,115,22,0.15)",  text: "#fb923c" },
  in_progress: { bg: "var(--accent-dim)",       text: "var(--accent-text)" },
  done:        { bg: "rgba(74,222,128,0.12)",   text: "#4ade80" },
};

const STATUS_LABELS: Record<string, string> = {
  queue: "Queue", priority: "Priority", in_progress: "In Progress", done: "Done",
};

interface Props {
  item: WorkItem;
  onClick: (item: WorkItem) => void;
}

export function KanbanCard({ item, onClick }: Props) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item.id,
  });

  const colors = STATUS_COLORS[item.status] ?? STATUS_COLORS.queue;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onClick(item)}
      style={{
        background: "var(--surface-3)",
        border: "1px solid var(--border)",
        borderRadius: 6,
        padding: "10px 10px 10px 8px",
        display: "flex",
        alignItems: "flex-start",
        gap: 6,
        cursor: "grab",
        visibility: isDragging ? "hidden" : "visible",
        userSelect: "none",
        transition: "background 80ms",
      }}
      onMouseEnter={(e) =>
        ((e.currentTarget as HTMLDivElement).style.background = "var(--surface-4)")
      }
      onMouseLeave={(e) =>
        ((e.currentTarget as HTMLDivElement).style.background = "var(--surface-3)")
      }
    >
      {/* Drag handle visual */}
      <div
        style={{
          color: "var(--text-subtle)",
          padding: "1px 0",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
        }}
      >
        <GripVertical size={14} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            color: "var(--text)",
            fontSize: 13,
            fontFamily: "Geist, sans-serif",
            marginBottom: 6,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {item.title || <span style={{ color: "var(--text-subtle)" }}>Untitled</span>}
        </div>
        <span
          style={{
            display: "inline-block",
            background: colors.bg,
            color: colors.text,
            fontSize: 11,
            fontFamily: "Geist, sans-serif",
            borderRadius: 4,
            padding: "1px 6px",
          }}
        >
          {STATUS_LABELS[item.status]}
        </span>
      </div>
    </div>
  );
}
