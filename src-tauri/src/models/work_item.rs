use crate::{models::Status, schema::work_items};
use diesel::{
    prelude::{AsChangeset, Identifiable, Insertable},
    Queryable, Selectable,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkItem {
    pub id: uuid::Uuid,
    pub title: String,
    pub description: String,
    pub status: Status,
    pub is_focus: bool,
    pub canvas_data: Option<String>,
    pub position: i32,
    pub created_at: chrono::NaiveDateTime,
    pub updated_at: chrono::NaiveDateTime,
}

#[derive(Debug, Clone, Queryable, Selectable, Identifiable)]
#[diesel(table_name = work_items)]
pub struct WorkItemRow {
    pub id: String,
    pub title: String,
    pub description: String,
    pub status: String,
    pub is_focus: bool,
    pub canvas_data: Option<String>,
    pub position: i32,
    pub created_at: chrono::NaiveDateTime,
    pub updated_at: chrono::NaiveDateTime,
}

#[derive(Debug, Insertable)]
#[diesel(table_name = work_items)]
pub struct NewWorkItem<'w> {
    pub id: &'w str,
    pub title: &'w str,
    pub description: &'w str,
    pub status: &'w str,
    pub is_focus: bool,
    pub position: i32,
    pub created_at: chrono::NaiveDateTime,
    pub updated_at: chrono::NaiveDateTime,
}

#[derive(Debug, AsChangeset)]
#[diesel(table_name = work_items)]
pub struct WorkItemChangeset {
    pub title: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub is_focus: Option<bool>,
    pub canvas_data: Option<Option<String>>,
    pub position: Option<i32>,
    pub updated_at: chrono::NaiveDateTime,
}

impl From<WorkItemRow> for WorkItem {
    fn from(wi: WorkItemRow) -> Self {
        WorkItem {
            id: wi.id.parse().expect("invalid uuid"),
            title: wi.title,
            description: wi.description,
            is_focus: wi.is_focus,
            position: wi.position,
            created_at: wi.created_at,
            updated_at: wi.updated_at,
            status: Status::from_db(&wi.status),
            canvas_data: wi.canvas_data.and_then(|s| serde_json::from_str(&s).ok()),
        }
    }
}
