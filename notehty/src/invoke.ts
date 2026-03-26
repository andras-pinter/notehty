import { invoke as tauriInvoke } from "@tauri-apps/api/core";

export interface WorkItem {
  id: number;
  title: string;
  status: "queue" | "priority" | "in_progress" | "done";
  is_focus: number;
  created_at: string;
  updated_at: string;
}

// --- sync ---

export const dbPath = () => tauriInvoke<string>("db_path");

export const getDbVersion = () => tauriInvoke<number>("get_db_version");

export const getChanges = (sinceVersion: number) =>
  tauriInvoke<string>("get_changes", { sinceVersion });

export const applyChanges = (changeset: string) =>
  tauriInvoke<void>("apply_changes", { changeset });

// --- documents ---

export const getDocument = (id: string) =>
  tauriInvoke<number[]>("get_document", { id });

export const updateDocument = (
  id: string,
  yjsState: number[],
  plainText: string,
  title: string,
) => tauriInvoke<void>("update_document", { id, yjsState, plainText, title });

export const promoteSelection = (
  globalYjs: number[],
  newItemYjs: number[],
  title: string,
) =>
  tauriInvoke<WorkItem>("promote_selection", {
    globalYjs,
    newItemYjs,
    title,
  });

// --- work items ---

export const listWorkItems = () =>
  tauriInvoke<WorkItem[]>("list_work_items");

export const createWorkItem = () =>
  tauriInvoke<WorkItem>("create_work_item");

export const updateWorkItemTitle = (id: number, title: string) =>
  tauriInvoke<WorkItem>("update_work_item_title", { id, title });

export const setWorkItemStatus = (
  id: number,
  status: WorkItem["status"],
) => tauriInvoke<WorkItem>("set_work_item_status", { id, status });

export const setFocus = (id: number) =>
  tauriInvoke<WorkItem>("set_focus", { id });

export const parkWorkItem = (id: number) =>
  tauriInvoke<WorkItem>("park_work_item", { id });

export const deleteWorkItem = (id: number) =>
  tauriInvoke<void>("delete_work_item", { id });
