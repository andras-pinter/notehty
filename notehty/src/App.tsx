import { useState, useCallback } from "react";
import { FileText, LayoutGrid, ChevronLeft, ChevronRight } from "lucide-react";
import NotepadView from "./components/NotepadView";
import KanbanView from "./components/KanbanView";
import WorkItemModal from "./components/WorkItemModal";
import type { WorkItem } from "./invoke";

type View = "notepad" | "kanban";

const App = () => {
  const [view, setView] = useState<View>("kanban");
  const [collapsed, setCollapsed] = useState(true);
  const [selectedItem, setSelectedItem] = useState<WorkItem | null>(null);

  const openItem = useCallback((item: WorkItem) => setSelectedItem(item), []);
  const closeItem = useCallback(() => setSelectedItem(null), []);

  return (
    <div style={{ display: "flex", height: "100%", background: "var(--bg)" }}>
      <aside
        style={{
          width: collapsed ? 48 : 220,
          minWidth: collapsed ? 48 : 220,
          background: "var(--surface-1)",
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          transition: "width 80ms ease, min-width 80ms ease",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "space-between",
            padding: collapsed ? "16px 0" : "16px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          {!collapsed && (
            <span
              style={{
                fontWeight: 600,
                fontSize: 13,
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
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: 4,
              borderRadius: 4,
              display: "flex",
              alignItems: "center",
            }}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
        <nav style={{ flex: 1, padding: "8px 0" }}>
          <NavItem icon={<LayoutGrid size={16} />} label="Kanban" active={view === "kanban"} collapsed={collapsed} onClick={() => setView("kanban")} />
          <NavItem icon={<FileText size={16} />} label="Notepad" active={view === "notepad"} collapsed={collapsed} onClick={() => setView("notepad")} />
        </nav>
      </aside>
      <main style={{ flex: 1, background: "var(--surface-2)", overflow: "hidden", position: "relative" }}>
        {view === "notepad" && <NotepadView onPromote={openItem} />}
        {view === "kanban" && <KanbanView onOpenItem={openItem} />}
      </main>
      {selectedItem && (
        <WorkItemModal item={selectedItem} onClose={closeItem} onUpdate={setSelectedItem} />
      )}
    </div>
  );
};

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
}

const NavItem = ({ icon, label, active, collapsed, onClick }: NavItemProps) => (
  <button
    onClick={onClick}
    title={collapsed ? label : undefined}
    style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      width: "100%",
      padding: collapsed ? "10px 0" : "10px 16px",
      justifyContent: collapsed ? "center" : "flex-start",
      background: active ? "var(--accent-dim)" : "none",
      border: "none",
      borderLeft: active ? "2px solid var(--accent)" : "2px solid transparent",
      color: active ? "var(--accent-text)" : "var(--text-muted)",
      cursor: "pointer",
      fontSize: 13,
      fontFamily: "inherit",
      fontWeight: active ? 500 : 400,
      transition: "background 80ms",
    }}
    onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-4)"; }}
    onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
  >
    {icon}
    {!collapsed && <span>{label}</span>}
  </button>
);

export default App;
