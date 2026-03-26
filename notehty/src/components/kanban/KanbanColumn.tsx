import { useDroppable } from "@dnd-kit/core";
import { Plus } from "lucide-react";
import type { WorkItem } from "../../invoke";
import KanbanCard from "./KanbanCard";

interface KanbanColumnProps {
  id: string;
  title: string;
  items: WorkItem[];
  onCardClick: (item: WorkItem) => void;
  onAddItem: () => void;
  accentColor?: string;
}

const KanbanColumn = ({
  id,
  title,
  items,
  onCardClick,
  onAddItem,
  accentColor,
}: KanbanColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        background: "var(--surface-2)",
        border: `1px solid ${isOver ? "var(--border-mid)" : "var(--border)"}`,
        borderRadius: 8,
        minWidth: 0,
        flex: 1,
        maxWidth: 280,
        overflow: "hidden",
        transition: "border-color 80ms",
        boxShadow: isOver
          ? "inset 0 0 0 1px var(--accent-dim)"
          : undefined,
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
          />
        ))}
        {items.length === 0 && (
          <div
            style={{
              color: "var(--text-subtle)",
              fontSize: 12,
              textAlign: "center",
              padding: "16px 0",
            }}
          >
            Empty
          </div>
        )}
      </div>

      {/* Add button */}
      <div
        style={{
          borderTop: "1px solid var(--border)",
          padding: "8px",
          flexShrink: 0,
        }}
      >
        <button
          onClick={onAddItem}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: "6px 12px",
            background: "none",
            border: "1px dashed var(--border)",
            borderRadius: 6,
            color: "var(--text-subtle)",
            cursor: "pointer",
            fontSize: 12,
            fontFamily: "inherit",
            transition: "all 80ms",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor =
              "var(--border-mid)";
            (e.currentTarget as HTMLButtonElement).style.color =
              "var(--text-muted)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor =
              "var(--border)";
            (e.currentTarget as HTMLButtonElement).style.color =
              "var(--text-subtle)";
          }}
        >
          <Plus size={13} />
          Add
        </button>
      </div>
    </div>
  );
};

export default KanbanColumn;
