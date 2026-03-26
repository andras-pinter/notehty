use diesel::prelude::*;
use tauri::State;

use crate::db::DbState;
use crate::error::Result;
use crate::schema::{documents, work_items};

/// Returns the raw Yjs binary state for a document.
#[tauri::command]
pub fn get_document(state: State<DbState>, id: String) -> Result<Vec<u8>> {
    let mut conn = state.0.lock().expect("db mutex poisoned");
    let state = documents::table
        .find(&id)
        .select(documents::yjs_state)
        .first::<Vec<u8>>(&mut *conn)?;
    Ok(state)
}

/// Saves Yjs blob and updates the FTS5 index atomically.
#[tauri::command]
pub fn update_document(
    state: State<DbState>,
    id: String,
    yjs_state: Vec<u8>,
    plain_text: String,
    title: String,
) -> Result<()> {
    let mut conn = state.0.lock().expect("db mutex poisoned");
    conn.transaction(|conn| {
        diesel::update(documents::table.find(&id))
            .set((
                documents::yjs_state.eq(&yjs_state),
                documents::updated_at.eq(diesel::dsl::sql::<diesel::sql_types::Text>(
                    "datetime('now')",
                )),
            ))
            .execute(conn)?;

        // FTS5 virtual tables don't support UPSERT; use DELETE + INSERT
        diesel::sql_query("DELETE FROM fts_content WHERE doc_id = ?")
            .bind::<diesel::sql_types::Text, _>(&id)
            .execute(conn)?;
        diesel::sql_query(
            "INSERT INTO fts_content(doc_id, title, body) VALUES (?, ?, ?)",
        )
        .bind::<diesel::sql_types::Text, _>(&id)
        .bind::<diesel::sql_types::Text, _>(&title)
        .bind::<diesel::sql_types::Text, _>(&plain_text)
        .execute(conn)?;

        Ok(())
    })
}

/// Atomically promotes selected text from the global notepad to a new WorkItem.
/// Writes both updated docs + creates WorkItem in a single transaction.
#[tauri::command]
pub fn promote_selection(
    state: State<DbState>,
    global_yjs: Vec<u8>,
    new_item_yjs: Vec<u8>,
    title: String,
) -> Result<crate::models::WorkItem> {
    use crate::models::NewWorkItem;

    let mut conn = state.0.lock().expect("db mutex poisoned");
    conn.transaction(|conn| {
        // Create the new work item
        let new_item = NewWorkItem {
            title: &title,
            status: "queue",
        };
        diesel::insert_into(work_items::table)
            .values(&new_item)
            .execute(conn)?;

        let item = work_items::table
            .order(work_items::id.desc())
            .first::<crate::models::WorkItem>(conn)?;

        // Store the new work item's document
        let item_doc_id = item.id.to_string();
        diesel::insert_into(documents::table)
            .values((
                documents::id.eq(&item_doc_id),
                documents::yjs_state.eq(&new_item_yjs),
            ))
            .on_conflict(documents::id)
            .do_update()
            .set(documents::yjs_state.eq(&new_item_yjs))
            .execute(conn)?;

        // Update global notepad with selection removed
        diesel::update(documents::table.find("global"))
            .set(documents::yjs_state.eq(&global_yjs))
            .execute(conn)?;

        Ok(item)
    })
}
