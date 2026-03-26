import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { Trash2 } from "lucide-react";
import type { WorkItem } from "../../invoke";
import { deleteWorkItem } from "../../invoke";

interface KanbanCardProps {
  item: WorkItem;
  onClick: () => void;
  onDeleted?: () => void;
  isDragOverlay?: boolean;
}

const KanbanCard = ({
  item,
  onClick,
  onDeleted,
  isDragOverlay = false,
}: KanbanCardProps) => {
  const [hovered, setHovered] = useState(false);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item.id,
    data: { item },
  });

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteWorkItem(item.id);
      onDeleted?.();
    } catch (err) {
      console.error(err);
    }
  };

  const cardStyle: React.CSSProperties = {
    background: hovered && !isDragging ? "var(--surface-4)" : "var(--surface-3)",
    border: "1px solid var(--border)",
    borderRadius: 6,
    padding: "10px 12px",
    cursor: isDragging ? "grabbing" : "grab",
    transition: "background 80ms",
    opacity: isDragging ? 0 : 1,
    boxShadow: isDragOverlay ? "0 8px 24px rgba(0,0,0,0.4)" : undefined,
    userSelect: "none",
    position: "relative",
  };

  if (isDragOverlay) {
    return (
      <div style={{ ...cardStyle, opacity: 1, cursor: "grabbing" }}>
        <CardTitle item={item} />
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      data-kanban-card="true"
      {...attributes}
      {...listeners}
      style={cardStyle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={onClick}
    >
      <CardTitle item={item} />
      {hovered && !isDragging && (
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={handleDelete}
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            background: "none",
            border: "none",
            color: "var(--text-subtle)",
            cursor: "pointer",
            padding: 3,
            borderRadius: 3,
            display: "flex",
            alignItems: "center",
            transition: "color 80ms",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--danger)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-subtle)"; }}
          title="Delete"
        >
          <Trash2 size={12} />
        </button>
      )}
    </div>
  );
};

const CardTitle = ({ item }: { item: WorkItem }) => (
  <p
    style={{
      margin: 0,
      fontSize: 13,
      color: "var(--text)",
      fontWeight: 400,
      lineHeight: 1.4,
      pointerEvents: "none",
      paddingRight: 20,
    }}
  >
    {item.title || <em style={{ color: "var(--text-subtle)" }}>Untitled</em>}
    {item.is_focus === 1 && (
      <span style={{ color: "var(--focus-accent)", marginLeft: 6, fontSize: 11 }}>★</span>
    )}
  </p>
);

export default KanbanCard;
