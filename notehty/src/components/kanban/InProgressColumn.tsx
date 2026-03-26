import type { WorkItem } from "../../invoke";
import { KanbanColumn } from "./KanbanColumn";

interface Props {
  parked: WorkItem[];
  focused: WorkItem[];
  onCardClick: (item: WorkItem) => void;
  onAddParked: () => void;
  onAddFocused: () => void;
}

export function InProgressColumn({ parked, focused, onCardClick, onAddParked, onAddFocused }: Props) {
  return (
    <div
      style={{
        display: "flex",
        flex: 2,
        border: "1px solid var(--border)",
        borderRadius: 8,
        overflow: "hidden",
        background: "var(--surface-2)",
        minWidth: 0,
      }}
    >
      {/* Parent header */}
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
        <div
          style={{
            padding: "10px 12px 8px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text-muted)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
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
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Parked sub-column */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
            <KanbanColumn
              id="parked"
              label="Parked"
              items={parked}
              onCardClick={onCardClick}
              onAddClick={onAddParked}
            />
          </div>

          {/* Dotted divider */}
          <div
            style={{
              width: 1,
              background:
                "repeating-linear-gradient(to bottom, var(--border-mid) 0, var(--border-mid) 4px, transparent 4px, transparent 8px)",
              flexShrink: 0,
            }}
          />

          {/* Focus sub-column */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
            <KanbanColumn
              id="focus"
              label="Focus"
              items={focused}
              accentColor="var(--focus-accent)"
              onCardClick={onCardClick}
              onAddClick={onAddFocused}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
