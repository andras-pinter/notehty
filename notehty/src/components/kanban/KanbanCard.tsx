import { useDraggable } from "@dnd-kit/core";
import { GripVertical } from "lucide-react";
import type { WorkItem } from "../../invoke";

const STATUS_LABELS: Record<WorkItem["status"], string> = {
  queue: "Queue",
  priority: "Priority",
  in_progress: "In Progress",
  done: "Done",
};

const STATUS_COLORS: Record<WorkItem["status"], string> = {
  queue: "var(--text-subtle)",
  priority: "var(--accent)",
  in_progress: "var(--focus-accent)",
  done: "#4ade80",
};

interface KanbanCardProps {
  item: WorkItem;
  onClick: () => void;
  isDragOverlay?: boolean;
}

const KanbanCard = ({
  item,
  onClick,
  isDragOverlay = false,
}: KanbanCardProps) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item.id,
    data: { item },
  });

  if (isDragOverlay) {
    return <CardContent item={item} />;
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        opacity: isDragging ? 0.3 : 1,
        position: "relative",
        display: "flex",
        cursor: isDragging ? "grabbing" : "default",
      }}
    >
      <button
        {...attributes}
        {...listeners}
        style={{
          background: "none",
          border: "none",
          padding: "0 4px",
          cursor: "grab",
          color: "var(--text-subtle)",
          display: "flex",
          alignItems: "center",
          flexShrink: 0,
          opacity: 0,
          transition: "opacity 80ms",
        }}
        className="drag-handle"
        title="Drag to reorder"
      >
        <GripVertical size={14} />
      </button>
      <div style={{ flex: 1 }} onClick={onClick}>
        <CardContent item={item} />
      </div>

      <style>{`
        div:hover > .drag-handle { opacity: 1 !important; }
      `}</style>
    </div>
  );
};

const CardContent = ({ item }: { item: WorkItem }) => (
  <div
    style={{
      background: "var(--surface-3)",
      border: "1px solid var(--border)",
      borderRadius: 6,
      padding: "10px 12px",
      cursor: "pointer",
      transition: "background 80ms, border-color 80ms",
    }}
    onMouseEnter={(e) => {
      (e.currentTarget as HTMLDivElement).style.background = "var(--surface-4)";
      (e.currentTarget as HTMLDivElement).style.borderColor =
        "var(--border-mid)";
    }}
    onMouseLeave={(e) => {
      (e.currentTarget as HTMLDivElement).style.background = "var(--surface-3)";
      (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)";
    }}
  >
    <p
      style={{
        margin: 0,
        fontSize: 13,
        color: "var(--text)",
        fontWeight: 400,
        lineHeight: 1.4,
        marginBottom: 6,
      }}
    >
      {item.title || <em style={{ color: "var(--text-subtle)" }}>Untitled</em>}
    </p>
    <span
      style={{
        display: "inline-block",
        fontSize: 11,
        padding: "2px 6px",
        borderRadius: 4,
        background: "var(--accent-dim)",
        color: STATUS_COLORS[item.status],
        fontWeight: 500,
      }}
    >
      {STATUS_LABELS[item.status]}
      {item.is_focus === 1 && " ★"}
    </span>
  </div>
);

export default KanbanCard;
