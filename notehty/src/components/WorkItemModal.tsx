import { useEffect, useRef, useState } from "react";
import { X, Maximize2 } from "lucide-react";
import type { WorkItem } from "../invoke";
import {
  updateWorkItemTitle,
  setWorkItemStatus,
  setFocus,
  parkWorkItem,
  deleteWorkItem,
} from "../invoke";
import { BlockSuiteEditor } from "./editor/BlockSuiteEditor";

const STATUS_LABELS: { value: WorkItem["status"]; label: string }[] = [
  { value: "queue", label: "Queue" },
  { value: "priority", label: "Priority" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

interface Props {
  item: WorkItem;
  onClose: () => void;
  onUpdate: (updated: WorkItem) => void;
  onDelete: (id: number) => void;
}

export function WorkItemModal({ item, onClose, onUpdate, onDelete }: Props) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState(item.title);
  const [saving, setSaving] = useState(false);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const saveTitle = async () => {
    if (title === item.title) return;
    setSaving(true);
    const updated = await updateWorkItemTitle(item.id, title).catch(() => null);
    setSaving(false);
    if (updated) onUpdate(updated);
  };

  const changeStatus = async (status: WorkItem["status"]) => {
    let updated: WorkItem | null = null;
    if (status === "in_progress" && item.status !== "in_progress") {
      // Moving into in_progress → park (not focus)
      updated = await parkWorkItem(item.id).catch(() => null);
    } else {
      updated = await setWorkItemStatus(item.id, status).catch(() => null);
    }
    if (updated) onUpdate(updated);
  };

  const toggleFocus = async () => {
    if (item.status !== "in_progress") return;
    let updated: WorkItem | null;
    if (item.is_focus) {
      updated = await parkWorkItem(item.id).catch(() => null);
    } else {
      updated = await setFocus(item.id).catch(() => null);
    }
    if (updated) onUpdate(updated);
  };

  const handleDelete = async () => {
    await deleteWorkItem(item.id).catch(() => null);
    onDelete(item.id);
    onClose();
  };

  return (
    <div
      ref={backdropRef}
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
    >
      <div
        style={{
          width: "85%",
          height: "90%",
          background: "var(--surface-2)",
          border: "1px solid var(--border-mid)",
          borderRadius: 8,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 16px",
            borderBottom: "1px solid var(--border)",
            flexShrink: 0,
          }}
        >
          {/* Title */}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") saveTitle(); }}
            placeholder="Untitled"
            style={{
              flex: 1,
              background: "none",
              border: "none",
              outline: "none",
              color: "var(--text)",
              fontSize: 16,
              fontWeight: 600,
              fontFamily: "Geist, sans-serif",
              opacity: saving ? 0.6 : 1,
            }}
          />
          {title !== item.title && (
            <button
              onClick={saveTitle}
              style={{
                background: "var(--accent-dim)",
                border: "1px solid var(--accent)",
                borderRadius: 4,
                color: "var(--accent-text)",
                fontSize: 11,
                fontFamily: "Geist, sans-serif",
                padding: "3px 8px",
                cursor: "pointer",
              }}
            >
              Save
            </button>
          )}

          {/* Status selector */}
          <select
            value={item.status}
            onChange={(e) => changeStatus(e.target.value as WorkItem["status"])}
            style={{
              background: "var(--surface-3)",
              border: "1px solid var(--border)",
              borderRadius: 4,
              color: "var(--text-muted)",
              fontSize: 12,
              fontFamily: "Geist, sans-serif",
              padding: "3px 8px",
              cursor: "pointer",
            }}
          >
            {STATUS_LABELS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          {/* Focus toggle */}
          {item.status === "in_progress" && (
            <button
              onClick={toggleFocus}
              title={item.is_focus ? "Unset focus" : "Set as focus"}
              style={{
                background: item.is_focus ? "var(--accent-dim)" : "var(--surface-3)",
                border: `1px solid ${item.is_focus ? "var(--accent)" : "var(--border)"}`,
                borderRadius: 4,
                color: item.is_focus ? "var(--accent-text)" : "var(--text-subtle)",
                fontSize: 11,
                fontFamily: "Geist, sans-serif",
                padding: "3px 8px",
                cursor: "pointer",
              }}
            >
              {item.is_focus ? "Focused" : "Focus"}
            </button>
          )}

          {/* Delete */}
          <button
            onClick={handleDelete}
            title="Delete work item"
            style={{
              background: "none",
              border: "1px solid var(--border)",
              borderRadius: 4,
              color: "var(--danger)",
              fontSize: 11,
              fontFamily: "Geist, sans-serif",
              padding: "3px 8px",
              cursor: "pointer",
            }}
          >
            Delete
          </button>

          <span title="Open in new window (coming soon)" style={{ display: "flex", alignItems: "center" }}>
            <Maximize2 size={14} style={{ color: "var(--text-subtle)", cursor: "not-allowed" }} />
          </span>

          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-subtle)",
              display: "flex",
              alignItems: "center",
              padding: 4,
              borderRadius: 4,
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Editor body */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          <BlockSuiteEditor docId={String(item.id)} />
        </div>
      </div>
    </div>
  );
}
