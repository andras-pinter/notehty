import { useDraggable } from "@dnd-kit/core";
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

  const cardStyle: React.CSSProperties = {
    background: "var(--surface-3)",
    border: "1px solid var(--border)",
    borderRadius: 6,
    padding: "10px 12px",
    cursor: isDragging ? "grabbing" : "grab",
    transition: "background 80ms, border-color 80ms",
    opacity: isDragging ? 0 : 1,
    boxShadow: isDragOverlay ? "0 8px 24px rgba(0,0,0,0.4)" : undefined,
    userSelect: "none",
  };

  if (isDragOverlay) {
    return (
      <div style={{ ...cardStyle, opacity: 1, cursor: "grabbing" }}>
        <CardInner item={item} />
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={cardStyle}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={onClick}
      onMouseEnter={(e) => {
        if (!isDragging) {
          (e.currentTarget as HTMLDivElement).style.background = "var(--surface-4)";
          (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border-mid)";
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = "var(--surface-3)";
        (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)";
      }}
    >
      <CardInner item={item} />
    </div>
  );
};

const CardInner = ({ item }: { item: WorkItem }) => (
  <>
    <p
      style={{
        margin: 0,
        fontSize: 13,
        color: "var(--text)",
        fontWeight: 400,
        lineHeight: 1.4,
        marginBottom: 6,
        pointerEvents: "none",
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
        pointerEvents: "none",
      }}
    >
      {STATUS_LABELS[item.status]}
      {item.is_focus === 1 && " ★"}
    </span>
  </>
);

export default KanbanCard;
