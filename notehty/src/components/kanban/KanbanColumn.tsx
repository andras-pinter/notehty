import { useDroppable } from "@dnd-kit/core";
import type { WorkItem } from "../../invoke";
import KanbanCard from "./KanbanCard";

interface KanbanColumnProps {
  id: string;
  title: string;
  items: WorkItem[];
  onCardClick: (item: WorkItem) => void;
  onAddItem: () => void;
  onDeleted: () => void;
  accentColor?: string;
}

const KanbanColumn = ({
  id,
  title,
  items,
  onCardClick,
  onAddItem,
  onDeleted,
  accentColor,
}: KanbanColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      onDoubleClick={(e) => {
        // Only fire if double-click is on the column itself, not on a card
        if ((e.target as HTMLElement).closest("[data-kanban-card]")) return;
        onAddItem();
      }}
      style={{
        display: "flex",
        flexDirection: "column",
        borderRadius: 8,
        minWidth: 200,
        flex: 1,
        overflow: "hidden",
        transition: "background 80ms",
        background: isOver ? "var(--surface-3)" : "var(--surface-2)",
        cursor: "default",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexShrink: 0,
        }}
      >
        {accentColor && (
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: accentColor,
              flexShrink: 0,
            }}
          />
        )}
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            flex: 1,
          }}
        >
          {title}
        </span>
        <span
          style={{
            fontSize: 11,
            color: "var(--text-subtle)",
            background: "var(--surface-3)",
            borderRadius: 4,
            padding: "1px 6px",
          }}
        >
          {items.length}
        </span>
      </div>

      {/* Cards */}
      <div
        ref={setNodeRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "8px",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          minHeight: 80,
        }}
      >
        {items.map((item) => (
          <KanbanCard
            key={item.id}
            item={item}
            onClick={() => onCardClick(item)}
            onDeleted={onDeleted}
          />
        ))}
        {items.length === 0 && (
          <div
            style={{
              color: "var(--text-subtle)",
              fontSize: 12,
              textAlign: "center",
              padding: "16px 0",
              userSelect: "none",
            }}
          >
            Double-click to add
          </div>
        )}
      </div>
    </div>
  );
};

export default KanbanColumn;
