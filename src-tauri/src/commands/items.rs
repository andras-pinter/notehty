use diesel::{prelude::*, r2d2};
use tauri::State;

use crate::{
    db::DbPool,
    models::{NewWorkItem, Status, WorkItem, WorkItemChangeset, WorkItemRow},
    schema::work_items::dsl as wi,
};

#[derive(serde::Deserialize)]
pub struct CreateWorkItem {
    pub title: String,
    pub description: Option<String>,
}

#[derive(serde::Deserialize)]
pub struct UpdateWorkItem {
    pub id: uuid::Uuid,
    pub title: Option<String>,
    pub description: Option<String>,
    pub status: Option<Status>,
    pub is_focus: Option<bool>,
    pub canvas: Option<serde_json::Value>,
    pub position: Option<i32>,
}

#[tauri::command]
pub fn list_work_items(pool: State<DbPool>) -> crate::Result<Vec<WorkItem>> {
    let mut conn = pool.get()?;

    let items = wi::work_items
        .order((wi::position.asc(), wi::created_at.asc()))
        .load::<WorkItemRow>(&mut conn)
        .map(|rows| rows.into_iter().map(WorkItem::from).collect())?;

    Ok(items)
}

#[tauri::command]
pub fn create_work_item(item: CreateWorkItem, pool: State<DbPool>) -> crate::Result<WorkItem> {
    let mut conn = pool.get()?;
    let now = chrono::Utc::now().naive_utc();
    let id = uuid::Uuid::new_v4();
    let pos = wi::work_items
        .filter(wi::status.eq(Status::Queue.to_db()))
        .select(diesel::dsl::max(wi::position))
        .first::<Option<i32>>(&mut conn)
        .unwrap_or_default()
        .map(|p| p + 1)
        .unwrap_or(0);

    let new_item = NewWorkItem {
        id: &id.to_string(),
        title: &item.title,
        description: item.description.as_deref().unwrap_or(""),
        status: Status::Queue.to_db(),
        is_focus: false,
        position: pos,
        created_at: now,
        updated_at: now,
    };

    let new_work_item = diesel::insert_into(wi::work_items)
        .values(&new_item)
        .returning(WorkItemRow::as_returning())
        .get_result(&mut conn)
        .map(WorkItem::from)?;

    Ok(new_work_item)
}

#[tauri::command]
pub fn update_work_item(item: UpdateWorkItem, pool: State<DbPool>) -> crate::Result<WorkItem> {
    let mut conn = pool.get()?;
    let now = chrono::Utc::now().naive_utc();

    if item.is_focus == Some(true) {
        diesel::update(
            wi::work_items
                .filter(wi::is_focus.eq(true))
                .filter(wi::id.ne(&item.id.to_string())),
        )
        .set((wi::is_focus.eq(false), wi::updated_at.eq(now)))
        .execute(&mut conn)?;
    }

    let in_focus = match item.status.as_ref() {
        Some(Status::InProgress) => item.is_focus,
        _ => Some(false),
    };

    let canvas_data = item.canvas.map(|v| serde_json::to_string(&v).ok());
    let changeset = WorkItemChangeset {
        title: item.title,
        description: item.description,
        status: item.status.map(|s| s.to_db().to_string()),
        is_focus: in_focus,
        canvas_data,
        position: item.position,
        updated_at: now,
    };

    let updated_item = diesel::update(wi::work_items.filter(wi::id.eq(&item.id.to_string())))
        .set(&changeset)
        .returning(WorkItemRow::as_returning())
        .get_result(&mut conn)
        .map(WorkItem::from)?;

    Ok(updated_item)
}

#[tauri::command]
pub fn reorder_work_items(ids: Vec<uuid::Uuid>, pool: State<DbPool>) -> crate::Result<()> {
    let mut conn = pool.get()?;
    let now = chrono::Utc::now().naive_utc();
    conn.transaction(|c| {
        for (pos, id) in ids.iter().enumerate() {
            diesel::update(wi::work_items.filter(wi::id.eq(id.to_string())))
                .set((wi::position.eq(pos as i32), wi::updated_at.eq(now)))
                .execute(c)?;
        }

        Ok::<_, r2d2::Error>(())
    })?;

    Ok(())
}
