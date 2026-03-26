use diesel::prelude::*;
use tauri::State;

use crate::db::DbConn;
use crate::error::{Error, Result};
use crate::models::{NewWorkItem, WorkItem};
use crate::schema::work_items;

fn last_inserted_work_item(conn: &mut SqliteConnection) -> Result<WorkItem> {
    Ok(work_items::table
        .select(WorkItem::as_select())
        .order(work_items::id.desc())
        .first(conn)?)
}

#[tauri::command]
pub fn list_work_items(db: State<'_, DbConn>) -> Result<Vec<WorkItem>> {
    let conn = &mut *db.lock().map_err(|_| Error::Logic("db lock poisoned".into()))?;
    Ok(work_items::table
        .select(WorkItem::as_select())
        .order(work_items::created_at.asc())
        .load(conn)?)
}

#[tauri::command]
pub fn create_work_item(db: State<'_, DbConn>) -> Result<WorkItem> {
    let conn = &mut *db.lock().map_err(|_| Error::Logic("db lock poisoned".into()))?;
    diesel::insert_into(work_items::table)
        .values(NewWorkItem {
            title: "",
            status: "queue",
            is_focus: 0,
        })
        .execute(conn)?;
    last_inserted_work_item(conn)
}

#[tauri::command]
pub fn update_work_item_title(id: i32, title: String, db: State<'_, DbConn>) -> Result<WorkItem> {
    let conn = &mut *db.lock().map_err(|_| Error::Logic("db lock poisoned".into()))?;
    diesel::update(work_items::table.find(id))
        .set((
            work_items::title.eq(&title),
            work_items::updated_at
                .eq(diesel::dsl::sql::<diesel::sql_types::Text>("datetime('now')")),
        ))
        .execute(conn)?;
    Ok(work_items::table
        .find(id)
        .select(WorkItem::as_select())
        .first(conn)?)
}

#[tauri::command]
pub fn set_work_item_status(
    id: i32,
    status: String,
    db: State<'_, DbConn>,
) -> Result<WorkItem> {
    let allowed = ["queue", "priority", "in_progress", "done"];
    if !allowed.contains(&status.as_str()) {
        return Err(Error::Logic(format!("invalid status: {status}")));
    }

    let conn = &mut *db.lock().map_err(|_| Error::Logic("db lock poisoned".into()))?;
    conn.transaction(|conn| {
        let is_focus = if status == "in_progress" {
            work_items::table
                .find(id)
                .select(work_items::is_focus)
                .first::<i32>(conn)?
        } else {
            0
        };

        diesel::update(work_items::table.find(id))
            .set((
                work_items::status.eq(&status),
                work_items::is_focus.eq(is_focus),
                work_items::updated_at
                    .eq(diesel::dsl::sql::<diesel::sql_types::Text>("datetime('now')")),
            ))
            .execute(conn)?;

        Ok(work_items::table
            .find(id)
            .select(WorkItem::as_select())
            .first(conn)?)
    })
}

#[tauri::command]
pub fn set_focus(id: i32, db: State<'_, DbConn>) -> Result<WorkItem> {
    let conn = &mut *db.lock().map_err(|_| Error::Logic("db lock poisoned".into()))?;
    conn.transaction(|conn| {
        let item: WorkItem = work_items::table
            .find(id)
            .select(WorkItem::as_select())
            .first(conn)?;

        if item.status != "in_progress" {
            return Err(Error::Logic(
                "can only set focus on an in_progress item".into(),
            ));
        }

        diesel::update(
            work_items::table
                .filter(work_items::is_focus.eq(1))
                .filter(work_items::id.ne(id)),
        )
        .set((
            work_items::is_focus.eq(0),
            work_items::updated_at
                .eq(diesel::dsl::sql::<diesel::sql_types::Text>("datetime('now')")),
        ))
        .execute(conn)?;

        diesel::update(work_items::table.find(id))
            .set((
                work_items::is_focus.eq(1),
                work_items::updated_at
                    .eq(diesel::dsl::sql::<diesel::sql_types::Text>("datetime('now')")),
            ))
            .execute(conn)?;

        Ok(work_items::table
            .find(id)
            .select(WorkItem::as_select())
            .first(conn)?)
    })
}

#[tauri::command]
pub fn delete_work_item(id: i32, db: State<'_, DbConn>) -> Result<()> {
    let conn = &mut *db.lock().map_err(|_| Error::Logic("db lock poisoned".into()))?;
    conn.transaction(|conn| {
        let doc_id = id.to_string();
        diesel::delete(crate::schema::documents::table.find(&doc_id)).execute(conn)?;
        diesel::sql_query("DELETE FROM fts_content WHERE doc_id = ?1")
            .bind::<diesel::sql_types::Text, _>(&doc_id)
            .execute(conn)?;
        diesel::delete(work_items::table.find(id)).execute(conn)?;
        Ok(())
    })
}
