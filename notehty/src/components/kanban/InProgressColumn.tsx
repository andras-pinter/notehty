import { useDroppable } from "@dnd-kit/core";
import type { WorkItem } from "../../invoke";
import KanbanCard from "./KanbanCard";

interface InProgressColumnProps {
  parked: WorkItem[];
  focused: WorkItem[];
  onCardClick: (item: WorkItem) => void;
  onAddItem: (subColumn: "parked" | "focus") => void;
  onDeleted: () => void;
}

const SubColumn = ({
  id,
  label,
  items,
  accentColor,
  onCardClick,
  onAddItem,
  onDeleted,
}: {
  id: string;
  label: string;
  items: WorkItem[];
  accentColor?: string;
  onCardClick: (item: WorkItem) => void;
  onAddItem: () => void;
  onDeleted: () => void;
}) => {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      onDoubleClick={(e) => {
        if ((e.target as HTMLElement).closest("[data-kanban-card]")) return;
        onAddItem();
      }}
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Sub-column header */}
      <div
        style={{
          padding: "8px 12px",
          display: "flex",
          alignItems: "center",
          gap: 6,
          flexShrink: 0,
        }}
      >
        {accentColor && (
          <span
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
            fontSize: 11,
            fontWeight: 600,
            color: "var(--text-subtle)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
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
            padding: "1px 5px",
          }}
        >
          {items.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "4px 8px 8px",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          minHeight: 60,
          background: isOver ? "var(--accent-dim)" : undefined,
          borderRadius: 4,
          transition: "background 80ms",
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
              fontSize: 11,
              textAlign: "center",
              padding: "12px 0",
              userSelect: "none",
            }}
          >
            {id === "focus" ? "Drop or double-click" : "Double-click to add"}
          </div>
        )}
      </div>
    </div>
  );
};

const InProgressColumn = ({
  parked,
  focused,
  onCardClick,
  onAddItem,
  onDeleted,
}: InProgressColumnProps) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        background: "var(--surface-2)",
        borderRadius: 8,
        minWidth: 0,
        flex: "0 0 480px",
        overflow: "hidden",
      }}
    >
      {/* Parent column header */}
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
          In Progress
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
          {parked.length + focused.length}
        </span>
      </div>

      {/* Sub-columns */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <SubColumn
          id="parked"
          label="Parked"
          items={parked}
          onCardClick={onCardClick}
          onAddItem={() => onAddItem("parked")}
          onDeleted={onDeleted}
        />
        <div
          style={{
            width: 0,
            borderLeft: "1px dashed var(--border-mid)",
            flexShrink: 0,
            alignSelf: "stretch",
          }}
        />
        <SubColumn
          id="focus"
          label="Focus"
          accentColor="var(--focus-accent)"
          items={focused}
          onCardClick={onCardClick}
          onAddItem={() => onAddItem("focus")}
          onDeleted={onDeleted}
        />
      </div>
    </div>
  );
};

export default InProgressColumn;
