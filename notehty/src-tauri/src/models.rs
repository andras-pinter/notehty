use diesel::prelude::*;
use serde::{Deserialize, Serialize};

use crate::schema::{documents, work_items};

#[derive(Queryable, Selectable, Serialize, Deserialize, Debug, Clone)]
#[diesel(table_name = work_items)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct WorkItem {
    pub id: i32,
    pub title: String,
    pub status: String,
    pub is_focus: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Insertable)]
#[diesel(table_name = work_items)]
pub struct NewWorkItem<'a> {
    pub title: &'a str,
    pub status: &'a str,
}

#[derive(Queryable, Selectable, Debug)]
#[diesel(table_name = documents)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct Document {
    pub id: String,
    pub yjs_state: Vec<u8>,
    pub updated_at: String,
}
