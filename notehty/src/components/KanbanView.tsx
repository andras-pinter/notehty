import { useState, useEffect, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { WorkItem } from "../invoke";
import {
  listWorkItems,
  createWorkItem,
  setWorkItemStatus,
  setFocus,
  parkWorkItem,
} from "../invoke";
import { KanbanColumn } from "./kanban/KanbanColumn";
import { KanbanCard } from "./kanban/KanbanCard";
import { InProgressColumn } from "./kanban/InProgressColumn";
import { WorkItemModal } from "./WorkItemModal";

export const KanbanView = () => {
  const [items, setItems] = useState<WorkItem[]>([]);
  const [activeItem, setActiveItem] = useState<WorkItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<WorkItem | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const load = useCallback(async () => {
    const list = await listWorkItems().catch(() => [] as WorkItem[]);
    setItems(list);
  }, []);

  useEffect(() => { load(); }, [load]);

  const queue    = items.filter((i) => i.status === "queue");
  const priority = items.filter((i) => i.status === "priority");
  const parked   = items.filter((i) => i.status === "in_progress" && !i.is_focus);
  const focused  = items.filter((i) => i.status === "in_progress" && i.is_focus);
  const done     = items.filter((i) => i.status === "done");

  const handleDragStart = (event: DragStartEvent) => {
    const item = items.find((i) => i.id === event.active.id);
    setActiveItem(item ?? null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveItem(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const itemId = active.id as number;
    const target = over.id as string;

    // Optimistic update so the card moves immediately
    const newStatus = target === "focus" || target === "parked" ? "in_progress" : target as WorkItem["status"];
    const newFocus = target === "focus" ? 1 : 0;
    setItems((prev) => prev.map((i) => {
      if (i.id === itemId) return { ...i, status: newStatus, is_focus: newFocus };
      if (target === "focus" && i.is_focus) return { ...i, is_focus: 0 };
      return i;
    }));

    try {
      let updated: WorkItem | null = null;
      if (target === "focus") {
        updated = await setFocus(itemId);
      } else if (target === "parked") {
        updated = await parkWorkItem(itemId);
      } else {
        updated = await setWorkItemStatus(itemId, target as WorkItem["status"]);
      }
      if (updated) {
        // Reconcile with server response (handles focus demotion of other items)
        await load();
      }
    } catch (err) {
      console.error("drag failed:", err);
      await load(); // roll back on error
    }
  };

  const addToColumn = async (status: WorkItem["status"]) => {
    const item = await createWorkItem().catch(() => null);
    if (!item) return;
    // Move to the right status if needed
    let final = item;
    if (status !== "queue") {
      final = await setWorkItemStatus(item.id, status).catch(() => item);
    }
    setItems((prev) => [...prev, final]);
    setSelectedItem(final);
  };

  const handleCardClick = (item: WorkItem) => setSelectedItem(item);

  const handleModalUpdate = (updated: WorkItem) => {
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    setSelectedItem(updated);
  };

  const handleModalDelete = (id: number) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div
          style={{
            display: "flex",
            gap: 12,
            padding: 16,
            flex: 1,
            overflow: "hidden",
          }}
        >
          <KanbanColumn
            id="queue"
            label="Queue"
            items={queue}
            onCardClick={handleCardClick}
            onAddClick={() => addToColumn("queue")}
          />
          <KanbanColumn
            id="priority"
            label="Priority"
            accentColor="#fb923c"
            items={priority}
            onCardClick={handleCardClick}
            onAddClick={() => addToColumn("priority")}
          />
          <InProgressColumn
            parked={parked}
            focused={focused}
            onCardClick={handleCardClick}
            onAddParked={() => addToColumn("in_progress")}
            onAddFocused={() => addToColumn("in_progress")}
          />
          <KanbanColumn
            id="done"
            label="Done"
            items={done}
            onCardClick={handleCardClick}
            onAddClick={() => addToColumn("done")}
          />
        </div>

        <DragOverlay>
          {activeItem && (
            <KanbanCard item={activeItem} onClick={() => {}} />
          )}
        </DragOverlay>
      </DndContext>

      {selectedItem && (
        <WorkItemModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onUpdate={handleModalUpdate}
          onDelete={handleModalDelete}
        />
      )}
    </div>
  );
};
