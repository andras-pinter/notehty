use diesel::prelude::*;
use serde::{Deserialize, Serialize};
use tauri::State;

use crate::db::DbState;
use crate::error::{Error, Result};
use crate::models::{NewWorkItem, WorkItem};
use crate::schema::{documents, work_items};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct WorkItemWithDoc {
    #[serde(flatten)]
    pub item: WorkItem,
    pub doc_id: String,
}

#[tauri::command]
pub fn list_work_items(state: State<DbState>) -> Result<Vec<WorkItem>> {
    let mut conn = state.0.lock().expect("db mutex poisoned");
    let items = work_items::table
        .order(work_items::created_at.asc())
        .load::<WorkItem>(&mut *conn)?;
    Ok(items)
}

#[tauri::command]
pub fn create_work_item(state: State<DbState>) -> Result<WorkItem> {
    let mut conn = state.0.lock().expect("db mutex poisoned");
    conn.transaction(|conn| {
        diesel::insert_into(work_items::table)
            .values(NewWorkItem {
                title: "",
                status: "queue",
            })
            .execute(conn)?;

        let item = work_items::table
            .order(work_items::id.desc())
            .first::<WorkItem>(conn)?;

        // Seed the document for this work item
        diesel::insert_into(documents::table)
            .values((
                documents::id.eq(item.id.to_string()),
                documents::yjs_state.eq(Vec::<u8>::new()),
            ))
            .on_conflict(documents::id)
            .do_nothing()
            .execute(conn)?;

        Ok(item)
    })
}

#[tauri::command]
pub fn update_work_item_title(
    state: State<DbState>,
    id: i32,
    title: String,
) -> Result<WorkItem> {
    let mut conn = state.0.lock().expect("db mutex poisoned");
    diesel::update(work_items::table.find(id))
        .set((
            work_items::title.eq(&title),
            work_items::updated_at
                .eq(diesel::dsl::sql::<diesel::sql_types::Text>("datetime('now')")),
        ))
        .execute(&mut *conn)?;
    let item = work_items::table
        .find(id)
        .first::<WorkItem>(&mut *conn)?;
    Ok(item)
}

#[tauri::command]
pub fn set_work_item_status(
    state: State<DbState>,
    id: i32,
    status: String,
) -> Result<WorkItem> {
    let valid = ["queue", "priority", "in_progress", "done"];
    if !valid.contains(&status.as_str()) {
        return Err(Error::Logic(format!("invalid status: {status}")));
    }

    let mut conn = state.0.lock().expect("db mutex poisoned");
    conn.transaction(|conn| {
        // Clear is_focus when moving away from in_progress
        let clear_focus = status != "in_progress";
        if clear_focus {
            diesel::update(work_items::table.find(id))
                .set((
                    work_items::status.eq(&status),
                    work_items::is_focus.eq(0),
                    work_items::updated_at
                        .eq(diesel::dsl::sql::<diesel::sql_types::Text>("datetime('now')")),
                ))
                .execute(conn)?;
        } else {
            diesel::update(work_items::table.find(id))
                .set((
                    work_items::status.eq(&status),
                    work_items::updated_at
                        .eq(diesel::dsl::sql::<diesel::sql_types::Text>("datetime('now')")),
                ))
                .execute(conn)?;
        }

        work_items::table.find(id).first::<WorkItem>(conn).map_err(Into::into)
    })
}

/// Sets is_focus = 1 on the given item, demotes any currently focused item to parked.
/// Errors if the target item is not in_progress.
#[tauri::command]
pub fn set_focus(state: State<DbState>, id: i32) -> Result<WorkItem> {
    let mut conn = state.0.lock().expect("db mutex poisoned");
    conn.transaction(|conn| {
        let item = work_items::table.find(id).first::<WorkItem>(conn)?;
        if item.status != "in_progress" {
            return Err(Error::Logic(
                "can only focus an in_progress work item".into(),
            ));
        }

        // Demote any other currently focused item to parked (is_focus = 0)
        diesel::update(
            work_items::table
                .filter(work_items::is_focus.eq(1))
                .filter(work_items::id.ne(id)),
        )
        .set(work_items::is_focus.eq(0))
        .execute(conn)?;

        // Set focus on target
        diesel::update(work_items::table.find(id))
            .set(work_items::is_focus.eq(1))
            .execute(conn)?;

        work_items::table.find(id).first::<WorkItem>(conn).map_err(Into::into)
    })
}

/// Sets status = in_progress, is_focus = 0 atomically (moves item to Parked sub-column).
#[tauri::command]
pub fn park_work_item(state: State<DbState>, id: i32) -> Result<WorkItem> {
    let mut conn = state.0.lock().expect("db mutex poisoned");
    diesel::update(work_items::table.find(id))
        .set((
            work_items::status.eq("in_progress"),
            work_items::is_focus.eq(0),
            work_items::updated_at
                .eq(diesel::dsl::sql::<diesel::sql_types::Text>("datetime('now')")),
        ))
        .execute(&mut *conn)?;
    work_items::table
        .find(id)
        .first::<WorkItem>(&mut *conn)
        .map_err(Into::into)
}

#[tauri::command]
pub fn delete_work_item(state: State<DbState>, id: i32) -> Result<()> {
    let mut conn = state.0.lock().expect("db mutex poisoned");
    conn.transaction(|conn| {
        diesel::delete(documents::table.find(id.to_string())).execute(conn)?;
        diesel::delete(work_items::table.find(id)).execute(conn)?;
        Ok(())
    })
}
