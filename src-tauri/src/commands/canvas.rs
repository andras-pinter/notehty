use diesel::prelude::*;
use tauri::State;

use crate::{
    db::DbPool,
    models::{BlockKind, CanvasBlock},
};

#[derive(serde::Deserialize)]
pub struct CreateCanvasBlock {
    pub kind: BlockKind,
    pub content: serde_json::Value,
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

#[derive(serde::Deserialize)]
pub struct UpdateCanvasBlock {
    pub id: uuid::Uuid,
    pub content: Option<serde_json::Value>,
    pub x: Option<f64>,
    pub y: Option<f64>,
    pub width: Option<f64>,
    pub height: Option<f64>,
}

#[tauri::command]
pub fn list_canvas_blocks(pool: State<DbPool>) -> crate::Result<Vec<CanvasBlock>> {
    let mut conn = pool.get()?;
    todo!()
}
