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

const STATUS_LABELS: Record<WorkItem["status"], string> = {
  queue: "Queue",
  priority: "Priority",
  in_progress: "In Progress",
  done: "Done",
};

const STATUS_NEXT: Record<WorkItem["status"], WorkItem["status"]> = {
  queue: "priority",
  priority: "in_progress",
  in_progress: "done",
  done: "queue",
};

const STATUS_COLORS: Record<WorkItem["status"], string> = {
  queue: "var(--text-subtle)",
  priority: "var(--accent-text)",
  in_progress: "var(--focus-accent)",
  done: "#4ade80",
};

const WorkItemModal = ({ item, onClose, onUpdate }: WorkItemModalProps) => {
  const [title, setTitle] = useState(item.title);
  const [titleError, setTitleError] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const savedTitleRef = useRef(item.title);

  useEffect(() => {
    setTitle(item.title);
    savedTitleRef.current = item.title;
    setTitleError(false);
  }, [item.id, item.title]);

  useEffect(() => {
    titleRef.current?.focus();
    titleRef.current?.select();
  }, [item.id]);

  const saveTitle = useCallback(async (value: string): Promise<boolean> => {
    if (!value.trim()) {
      setTitleError(true);
      titleRef.current?.focus();
      return false;
    }
    if (value.trim() === savedTitleRef.current) return true;
    try {
      const updated = await updateWorkItemTitle(item.id, value.trim());
      savedTitleRef.current = updated.title;
      onUpdate(updated);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }, [item.id, onUpdate]);

  const handleClose = useCallback(async () => {
    if (!title.trim()) {
      // Item was never given a title — discard it entirely
      try { await deleteWorkItem(item.id); } catch { /* ignore */ }
      onClose();
      return;
    }
    const ok = await saveTitle(title);
    if (ok) onClose();
  }, [saveTitle, title, onClose, item.id]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); handleClose(); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleClose]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === backdropRef.current) handleClose();
    },
    [handleClose],
  );

  const handleStatusCycle = useCallback(async () => {
    try {
      const updated = await setWorkItemStatus(item.id, STATUS_NEXT[item.status]);
      onUpdate(updated);
    } catch (e) {
      console.error(e);
    }
  }, [item.id, item.status, onUpdate]);

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
            gap: 10,
            padding: "12px 16px",
            borderBottom: "1px solid var(--border)",
            flexShrink: 0,
          }}
        >
          <input
            ref={titleRef}
            value={title}
            onChange={(e) => { setTitle(e.target.value); setTitleError(false); }}
            onBlur={() => saveTitle(title)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); titleRef.current?.blur(); } }}
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
              paddingBottom: 2,
              transition: "border-color 80ms, color 80ms",
            }}
            onContextMenu={(e) => { e.preventDefault(); handleDelete(); }}
            title="Right-click to delete"
          />

          <button
            onClick={handleStatusCycle}
            title="Click to change status"
            style={{
              padding: "3px 8px",
              borderRadius: 4,
              border: "1px solid var(--border)",
              background: "var(--surface-3)",
              color: STATUS_COLORS[item.status],
              fontSize: 11,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "inherit",
              whiteSpace: "nowrap",
              transition: "all 80ms",
            }}
          >
            {STATUS_LABELS[item.status]}
            {item.is_focus === 1 && " ★"}
          </button>

          {item.status === "in_progress" && (
            <button
              onClick={handleFocusToggle}
              style={{
                padding: "3px 8px",
                borderRadius: 4,
                border: item.is_focus === 1 ? "1px solid var(--focus-accent)" : "1px solid var(--border)",
                background: item.is_focus === 1 ? "rgba(167,139,250,0.15)" : "var(--surface-3)",
                color: item.is_focus === 1 ? "var(--focus-accent)" : "var(--text-muted)",
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
            onClick={handleClose}
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

        <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
          <BlockSuiteEditor docId={String(item.id)} mode="page" />
        </div>
      </div>
    </div>
  );
};

export default WorkItemModal;
