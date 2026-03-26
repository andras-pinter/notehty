import { useCallback, useEffect, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  closestCenter,
} from "@dnd-kit/core";
import type { WorkItem } from "../invoke";
import {
  listWorkItems,
  createWorkItem,
  setWorkItemStatus,
  setFocus,
} from "../invoke";
import KanbanColumn from "./kanban/KanbanColumn";
import KanbanCard from "./kanban/KanbanCard";
import InProgressColumn from "./kanban/InProgressColumn";

interface KanbanViewProps {
  onOpenItem: (item: WorkItem) => void;
}

const KanbanView = ({ onOpenItem }: KanbanViewProps) => {
  const [items, setItems] = useState<WorkItem[]>([]);
  const [dragging, setDragging] = useState<WorkItem | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  const reload = useCallback(() => {
    listWorkItems().then(setItems).catch(console.error);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const queue = items.filter((i) => i.status === "queue");
  const priority = items.filter((i) => i.status === "priority");
  const parked = items.filter(
    (i) => i.status === "in_progress" && i.is_focus === 0,
  );
  const focused = items.filter(
    (i) => i.status === "in_progress" && i.is_focus === 1,
  );
  const done = items.filter((i) => i.status === "done");

  const handleDragStart = useCallback(
    ({ active }: DragStartEvent) => {
      const item = items.find((i) => i.id === active.id);
      setDragging(item ?? null);
    },
    [items],
  );

  const handleDragEnd = useCallback(
    async ({ active, over }: DragEndEvent) => {
      setDragging(null);
      if (!over) return;

      const item = items.find((i) => i.id === active.id);
      if (!item) return;

      const target = over.id as string;

      try {
        if (target === "focus") {
          await setFocus(item.id);
        } else if (target === "parked") {
          await setWorkItemStatus(item.id, "in_progress");
        } else {
          const statusMap: Record<string, WorkItem["status"]> = {
            queue: "queue",
            priority: "priority",
            done: "done",
          };
          const newStatus = statusMap[target];
          if (newStatus && newStatus !== item.status) {
            await setWorkItemStatus(item.id, newStatus);
          }
        }
        reload();
      } catch (e) {
        console.error("DnD error:", e);
        reload();
      }
    },
    [items, reload],
  );

  const handleAdd = useCallback(
    async (status: WorkItem["status"]) => {
      try {
        const item = await createWorkItem();
        const updated = await setWorkItemStatus(item.id, status);
        reload();
        onOpenItem(updated);
      } catch (e) {
        console.error("Create error:", e);
      }
    },
    [reload, onOpenItem],
  );

  const handleAddFocus = useCallback(async () => {
    try {
      const item = await createWorkItem();
      const inProgress = await setWorkItemStatus(item.id, "in_progress");
      const focused = await setFocus(inProgress.id);
      reload();
      onOpenItem(focused);
    } catch (e) {
      console.error("Create focus error:", e);
    }
  }, [reload, onOpenItem]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div
        style={{
          display: "flex",
          gap: 12,
          padding: 20,
          height: "100%",
          overflowX: "auto",
          alignItems: "stretch",
        }}
      >
        <KanbanColumn
          id="queue"
          title="Queue"
          items={queue}
          onCardClick={onOpenItem}
          onAddItem={() => handleAdd("queue")}
        />
        <KanbanColumn
          id="priority"
          title="Priority"
          accentColor="var(--accent)"
          items={priority}
          onCardClick={onOpenItem}
          onAddItem={() => handleAdd("priority")}
        />
        <InProgressColumn
          parked={parked}
          focused={focused}
          onCardClick={onOpenItem}
          onAddItem={(sub) =>
            sub === "focus" ? handleAddFocus() : handleAdd("in_progress")
          }
        />
        <KanbanColumn
          id="done"
          title="Done"
          accentColor="#4ade80"
          items={done}
          onCardClick={onOpenItem}
          onAddItem={() => handleAdd("done")}
        />
      </div>

      <DragOverlay dropAnimation={null}>
        {dragging && (
          <KanbanCard
            item={dragging}
            onClick={() => undefined}
            isDragOverlay
          />
        )}
      </DragOverlay>
    </DndContext>
  );
};

export default KanbanView;
