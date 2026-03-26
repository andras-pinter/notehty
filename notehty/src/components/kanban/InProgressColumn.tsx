import { useDroppable } from "@dnd-kit/core";
import { Plus } from "lucide-react";
import type { WorkItem } from "../../invoke";
import KanbanCard from "./KanbanCard";

interface InProgressColumnProps {
  parked: WorkItem[];
  focused: WorkItem[];
  onCardClick: (item: WorkItem) => void;
  onAddItem: (subColumn: "parked" | "focus") => void;
}

const SubColumn = ({
  id,
  label,
  items,
  accentColor,
  onCardClick,
  onAddItem,
}: {
  id: string;
  label: string;
  items: WorkItem[];
  accentColor?: string;
  onCardClick: (item: WorkItem) => void;
  onAddItem: () => void;
}) => {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
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
          padding: "4px 8px",
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
          />
        ))}
        {items.length === 0 && (
          <div
            style={{
              color: "var(--text-subtle)",
              fontSize: 12,
              textAlign: "center",
              padding: "12px 0",
            }}
          >
            {id === "focus" ? "Drop focus here" : "Empty"}
          </div>
        )}
      </div>

      <div style={{ padding: "6px 8px", flexShrink: 0 }}>
        <button
          onClick={onAddItem}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 5,
            padding: "5px",
            background: "none",
            border: "1px dashed var(--border)",
            borderRadius: 6,
            color: "var(--text-subtle)",
            cursor: "pointer",
            fontSize: 11,
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
          <Plus size={11} />
          Add
        </button>
      </div>
    </div>
  );
};

const InProgressColumn = ({
  parked,
  focused,
  onCardClick,
  onAddItem,
}: InProgressColumnProps) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        background: "var(--surface-2)",
        borderRadius: 8,
        minWidth: 0,
        flex: "0 0 360px",
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
        />
      </div>
    </div>
  );
};

export default InProgressColumn;
