import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { WorkItem } from "../invoke";
import {
  updateWorkItemTitle,
  setWorkItemStatus,
  setFocus,
  deleteWorkItem,
} from "../invoke";
import BlockSuiteEditor from "./editor/BlockSuiteEditor";

interface WorkItemModalProps {
  item: WorkItem;
  onClose: () => void;
  onUpdate: (item: WorkItem) => void;
}

const STATUS_OPTIONS: WorkItem["status"][] = [
  "queue",
  "priority",
  "in_progress",
  "done",
];

const STATUS_LABELS: Record<WorkItem["status"], string> = {
  queue: "Queue",
  priority: "Priority",
  in_progress: "In Progress",
  done: "Done",
};

const WorkItemModal = ({ item, onClose, onUpdate }: WorkItemModalProps) => {
  const [title, setTitle] = useState(item.title);
  const [titleError, setTitleError] = useState(false);
  const [saving, setSaving] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTitle(item.title);
  }, [item.id, item.title]);

  useEffect(() => {
    titleRef.current?.focus();
    titleRef.current?.select();
  }, [item.id]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === backdropRef.current) onClose();
    },
    [onClose],
  );

  const saveTitle = useCallback(async () => {
    if (!title.trim()) {
      setTitleError(true);
      titleRef.current?.focus();
      return;
    }
    setTitleError(false);
    if (title === item.title) return;
    setSaving(true);
    try {
      const updated = await updateWorkItemTitle(item.id, title);
      onUpdate(updated);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }, [title, item.id, item.title, onUpdate]);

  const handleStatusChange = useCallback(
    async (status: WorkItem["status"]) => {
      try {
        const updated = await setWorkItemStatus(item.id, status);
        onUpdate(updated);
      } catch (e) {
        console.error(e);
      }
    },
    [item.id, onUpdate],
  );

  const handleFocusToggle = useCallback(async () => {
    try {
      const updated = await setFocus(item.id);
      onUpdate(updated);
    } catch (e) {
      console.error(e);
    }
  }, [item.id, onUpdate]);

  const handleDelete = useCallback(async () => {
    if (!confirm("Delete this work item?")) return;
    try {
      await deleteWorkItem(item.id);
      onClose();
    } catch (e) {
      console.error(e);
    }
  }, [item.id, onClose]);

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
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
          maxWidth: 960,
          background: "var(--surface-2)",
          border: "1px solid var(--border-mid)",
          borderRadius: 8,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
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
          <input
            ref={titleRef}
            value={title}
            onChange={(e) => { setTitle(e.target.value); setTitleError(false); }}
            onBlur={saveTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                saveTitle();
              }
            }}
            placeholder="Title required"
            style={{
              flex: 1,
              background: "none",
              border: "none",
              borderBottom: titleError ? "1px solid var(--danger)" : "1px solid transparent",
              outline: "none",
              color: titleError ? "var(--danger)" : "var(--text)",
              fontSize: 16,
              fontWeight: 500,
              fontFamily: "inherit",
              opacity: saving ? 0.6 : 1,
              paddingBottom: 2,
              transition: "border-color 80ms, color 80ms",
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            title="Right-click to delete"
          />

          {/* Status selector */}
          <div style={{ display: "flex", gap: 4 }}>
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                style={{
                  padding: "4px 8px",
                  borderRadius: 4,
                  border:
                    item.status === s
                      ? "1px solid var(--accent)"
                      : "1px solid var(--border)",
                  background:
                    item.status === s ? "var(--accent-dim)" : "none",
                  color:
                    item.status === s
                      ? "var(--accent-text)"
                      : "var(--text-muted)",
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 80ms",
                }}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>

          {/* Focus toggle (only in_progress) */}
          {item.status === "in_progress" && (
            <button
              onClick={handleFocusToggle}
              style={{
                padding: "4px 10px",
                borderRadius: 4,
                border:
                  item.is_focus === 1
                    ? "1px solid var(--focus-accent)"
                    : "1px solid var(--border)",
                background:
                  item.is_focus === 1
                    ? "rgba(167,139,250,0.15)"
                    : "none",
                color:
                  item.is_focus === 1
                    ? "var(--focus-accent)"
                    : "var(--text-muted)",
                fontSize: 11,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 80ms",
              }}
            >
              {item.is_focus === 1 ? "★ Focus" : "Focus"}
            </button>
          )}

          <button
            onClick={onClose}
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
            title="Close (Esc)"
          >
            <X size={16} />
          </button>
        </div>

        {/* Editor */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          <BlockSuiteEditor
            docId={String(item.id)}
            mode="page"
          />
        </div>
      </div>
    </div>
  );
};

export default WorkItemModal;
