use crate::schema::canvas_blocks;
use diesel::{
    prelude::{AsChangeset, Identifiable, Insertable, Queryable},
    Selectable,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum BlockKind {
    Text,
    Drawing,
    Sticky,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CanvasBlock {
    pub id: uuid::Uuid,
    pub kind: BlockKind,
    pub content: serde_json::Value,
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    pub created_at: chrono::NaiveDateTime,
}

#[derive(Debug, Clone, Queryable, Selectable, Identifiable)]
#[diesel(table_name = canvas_blocks)]
pub struct CanvasBlockRow {
    pub id: String,
    pub kind: String,
    pub content: String,
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    pub created_at: chrono::NaiveDateTime,
}

#[derive(Debug, Insertable)]
#[diesel(table_name = canvas_blocks)]
pub struct NewCanvasBlock<'c> {
    pub id: &'c str,
    pub kind: &'c str,
    pub content: &'c str,
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    pub created_at: chrono::NaiveDateTime,
}

#[derive(Debug, AsChangeset)]
#[diesel(table_name = canvas_blocks)]
pub struct NewCanvasChangeset {
    pub content: Option<String>,
    pub x: Option<f64>,
    pub y: Option<f64>,
    pub width: Option<f64>,
    pub height: Option<f64>,
}

impl BlockKind {
    pub fn from_db(s: &str) -> Self {
        match s {
            "drawing" => BlockKind::Drawing,
            "sticky" => BlockKind::Sticky,
            _ => BlockKind::Text,
        }
    }

    pub fn to_db(&self) -> &'static str {
        match self {
            BlockKind::Drawing => "drawing",
            BlockKind::Sticky => "sticky",
            BlockKind::Text => "text",
        }
    }
}

impl From<CanvasBlockRow> for CanvasBlock {
    fn from(cb: CanvasBlockRow) -> Self {
        CanvasBlock {
            id: cb.id.parse().expect("invalid uuid"),
            kind: BlockKind::from_db(&cb.kind),
            content: serde_json::from_str(&cb.content).unwrap_or(serde_json::Value::Null),
            x: cb.x,
            y: cb.y,
            width: cb.width,
            height: cb.height,
            created_at: cb.created_at,
        }
    }
}
