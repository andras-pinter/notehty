use diesel::prelude::*;
use tauri::State;

use crate::db::DbConn;
use crate::error::{Error, Result};
use crate::models::{NewDocument, NewWorkItem, WorkItem};
use crate::schema::{documents, work_items};

/// Atomically:
/// 1. Update the global notepad document with `global_yjs`
/// 2. Create a new WorkItem with `title` and `status = queue`
/// 3. Insert a new document for the work item seeded with `new_item_yjs`
#[tauri::command]
pub fn promote_selection(
    global_yjs: Vec<u8>,
    new_item_yjs: Vec<u8>,
    title: String,
    db: State<'_, DbConn>,
) -> Result<WorkItem> {
    let conn = &mut *db.lock().map_err(|_| Error::Logic("db lock poisoned".into()))?;
    conn.transaction(|conn| {
        // Update global notepad document.
        diesel::update(documents::table.find("global"))
            .set((
                documents::yjs_state.eq(&global_yjs),
                documents::updated_at
                    .eq(diesel::dsl::sql::<diesel::sql_types::Text>("datetime('now')")),
            ))
            .execute(conn)?;

        // Create the new WorkItem.
        diesel::insert_into(work_items::table)
            .values(NewWorkItem {
                title: &title,
                status: "queue",
                is_focus: 0,
            })
            .execute(conn)?;

        let item: WorkItem = work_items::table
            .select(WorkItem::as_select())
            .order(work_items::id.desc())
            .first(conn)?;

        // Insert the work item document.
        let doc_id = item.id.to_string();
        diesel::insert_into(documents::table)
            .values(NewDocument {
                id: &doc_id,
                yjs_state: &new_item_yjs,
            })
            .execute(conn)?;

        Ok(item)
    })
}

/// Legacy block-based promotion — kept as a no-op stub for API compatibility.
#[tauri::command]
pub fn promote_block(
    _block_id: i32,
    _db: State<'_, DbConn>,
) -> Result<WorkItem> {
    Err(Error::Logic(
        "promote_block is deprecated; use promote_selection instead".into(),
    ))
}
