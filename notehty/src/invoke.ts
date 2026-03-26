import { invoke as tauriInvoke } from "@tauri-apps/api/core";

export interface WorkItem {
  id: number;
  title: string;
  status: "queue" | "priority" | "in_progress" | "done";
  is_focus: number;
  created_at: string;
  updated_at: string;
}

export interface SearchResult {
  doc_id: string;
  title: string;
  snippet: string;
}

// Documents
export const getDocument = (id: string): Promise<number[]> =>
  tauriInvoke("get_document", { id });

export const updateDocument = (
  id: string,
  yjsState: number[],
  plainText: string,
  title: string,
): Promise<void> =>
  tauriInvoke("update_document", {
    id,
    yjs_state: yjsState,
    plain_text: plainText,
    title,
  });

// Work items
export const listWorkItems = (): Promise<WorkItem[]> =>
  tauriInvoke("list_work_items");

export const createWorkItem = (): Promise<WorkItem> =>
  tauriInvoke("create_work_item");

export const updateWorkItemTitle = (
  id: number,
  title: string,
): Promise<WorkItem> => tauriInvoke("update_work_item_title", { id, title });

export const setWorkItemStatus = (
  id: number,
  status: WorkItem["status"],
): Promise<WorkItem> => tauriInvoke("set_work_item_status", { id, status });

export const setFocus = (id: number): Promise<WorkItem> =>
  tauriInvoke("set_focus", { id });

export const deleteWorkItem = (id: number): Promise<void> =>
  tauriInvoke("delete_work_item", { id });

// Promotion
export const promoteSelection = (
  globalYjs: number[],
  newItemYjs: number[],
  title: string,
): Promise<WorkItem> =>
  tauriInvoke("promote_selection", {
    global_yjs: globalYjs,
    new_item_yjs: newItemYjs,
    title,
  });

// Search
export const search = (query: string): Promise<SearchResult[]> =>
  tauriInvoke("search", { query });

// Sync
export const dbPath = (): Promise<string> => tauriInvoke("db_path");
export const getChanges = (sinceVersion: number): Promise<string> =>
  tauriInvoke("get_changes", { since_version: sinceVersion });
export const applyChanges = (changeset: string): Promise<void> =>
  tauriInvoke("apply_changes", { changeset });
export const getDbVersion = (): Promise<number> =>
  tauriInvoke("get_db_version");
