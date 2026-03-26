import { useState } from "react";
import { FileText, LayoutGrid, ChevronLeft, ChevronRight } from "lucide-react";
import { NotepadView } from "./components/NotepadView";
import { KanbanView } from "./components/KanbanView";
import "./App.css";

type View = "notepad" | "kanban";

const NAV_ITEMS: { id: View; label: string; Icon: React.ComponentType<{ size?: number }> }[] = [
  { id: "kanban", label: "Kanban", Icon: LayoutGrid },
  { id: "notepad", label: "Notepad", Icon: FileText },
];

export default function App() {
  const [view, setView] = useState<View>("kanban");
  const [collapsed, setCollapsed] = useState(true);

  return (
    <div style={{ display: "flex", height: "100%", background: "var(--bg)" }}>
      {/* Sidebar */}
      <aside
        style={{
          width: collapsed ? 48 : 220,
          minWidth: collapsed ? 48 : 220,
          background: "var(--surface-1)",
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          transition: "width 120ms ease, min-width 120ms ease",
          overflow: "hidden",
        }}
      >
        {/* Logo */}
        <div
          style={{
            height: 48,
            display: "flex",
            alignItems: "center",
            padding: collapsed ? "0 12px" : "0 16px",
            borderBottom: "1px solid var(--border)",
            gap: 8,
            justifyContent: collapsed ? "center" : "space-between",
          }}
        >
          {!collapsed && (
            <span
              style={{
                fontFamily: "Geist, sans-serif",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text-muted)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Notehty
            </span>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-subtle)",
              padding: 4,
              borderRadius: 4,
              display: "flex",
              alignItems: "center",
            }}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Nav items */}
        <nav style={{ padding: "8px 0" }}>
          {NAV_ITEMS.map(({ id, label, Icon }) => {
            const active = view === id;
            return (
              <button
                key={id}
                onClick={() => setView(id)}
                style={{
                  width: "100%",
                  background: active ? "var(--accent-dim)" : "none",
                  border: "none",
                  borderLeft: active ? "2px solid var(--accent)" : "2px solid transparent",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: collapsed ? "8px 0" : "8px 16px",
                  justifyContent: collapsed ? "center" : "flex-start",
                  color: active ? "var(--accent-text)" : "var(--text-muted)",
                  fontSize: 14,
                  fontFamily: "Geist, sans-serif",
                  transition: "background 80ms, color 80ms",
                }}
              >
                <Icon size={16} />
                {!collapsed && <span>{label}</span>}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, background: "var(--surface-2)", overflow: "hidden", display: "flex" }}>
        {view === "notepad" ? <NotepadView /> : <KanbanView />}
      </main>
    </div>
  );
}
