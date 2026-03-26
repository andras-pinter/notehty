use diesel::prelude::*;
use serde::{Deserialize, Serialize};

use crate::schema::{documents, work_items};

#[derive(Debug, Clone, Queryable, Selectable, Serialize, Deserialize)]
#[diesel(table_name = work_items)]
pub struct WorkItem {
    pub id: i32,
    pub title: String,
    pub status: String,
    pub is_focus: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Insertable)]
#[diesel(table_name = work_items)]
pub struct NewWorkItem<'a> {
    pub title: &'a str,
    pub status: &'a str,
    pub is_focus: i32,
}

#[derive(Debug, Clone, Queryable, Selectable, Serialize, Deserialize)]
#[diesel(table_name = documents)]
pub struct Document {
    pub id: String,
    pub yjs_state: Vec<u8>,
    pub updated_at: String,
}

#[derive(Debug, Insertable)]
#[diesel(table_name = documents)]
pub struct NewDocument<'a> {
    pub id: &'a str,
    pub yjs_state: &'a [u8],
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchResult {
    pub doc_id: String,
    pub title: String,
    pub snippet: String,
}
