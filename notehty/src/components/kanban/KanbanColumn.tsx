import { useDroppable } from "@dnd-kit/core";
import { Plus } from "lucide-react";
import type { WorkItem } from "../../invoke";
import { KanbanCard } from "./KanbanCard";

interface Props {
  id: string;
  label: string;
  items: WorkItem[];
  accentColor?: string;
  onCardClick: (item: WorkItem) => void;
  onAddClick: () => void;
}

export function KanbanColumn({ id, label, items, accentColor, onCardClick, onAddClick }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        overflow: "hidden",
        minWidth: 0,
        flex: 1,
      }}
    >
      {/* Column header */}
      <div
        style={{
          padding: "10px 12px 8px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexShrink: 0,
        }}
      >
        {accentColor && (
          <div
            style={{
              width: 6,
              height: 6,
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
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            flex: 1,
          }}
        >
          {label}
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

      {/* Card list — droppable zone */}
      <div
        ref={setNodeRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "8px",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          background: isOver ? "rgba(124,106,247,0.04)" : undefined,
          transition: "background 80ms",
          minHeight: 80,
        }}
      >
        {items.map((item) => (
          <KanbanCard key={item.id} item={item} onClick={onCardClick} />
        ))}
      </div>

      {/* Add button */}
      <button
        onClick={onAddClick}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "8px 12px",
          background: "none",
          border: "none",
          borderTop: "1px solid var(--border)",
          cursor: "pointer",
          color: "var(--text-subtle)",
          fontSize: 12,
          fontFamily: "Geist, sans-serif",
          flexShrink: 0,
          transition: "color 80ms, background 80ms",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)";
          (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-3)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = "var(--text-subtle)";
          (e.currentTarget as HTMLButtonElement).style.background = "";
        }}
      >
        <Plus size={12} />
        Add
      </button>
    </div>
  );
}
