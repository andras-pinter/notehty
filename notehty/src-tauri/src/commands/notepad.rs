use diesel::prelude::*;
use tauri::State;

use crate::db::DbConn;
use crate::error::{Error, Result};
use crate::models::{Document, NewDocument};
use crate::schema::documents;

#[tauri::command]
pub fn get_document(id: String, db: State<'_, DbConn>) -> Result<Vec<u8>> {
    let conn = &mut *db.lock().map_err(|_| Error::Logic("db lock poisoned".into()))?;
    let doc = documents::table
        .find(&id)
        .select(Document::as_select())
        .first(conn)
        .optional()?;

    Ok(doc.map(|d| d.yjs_state).unwrap_or_default())
}

#[tauri::command]
pub fn update_document(
    id: String,
    yjs_state: Vec<u8>,
    plain_text: String,
    title: String,
    db: State<'_, DbConn>,
) -> Result<()> {
    let conn = &mut *db.lock().map_err(|_| Error::Logic("db lock poisoned".into()))?;
    conn.transaction(|conn| {
        // Upsert the document blob.
        diesel::insert_into(documents::table)
            .values(NewDocument {
                id: &id,
                yjs_state: &yjs_state,
            })
            .on_conflict(documents::id)
            .do_update()
            .set((
                documents::yjs_state.eq(&yjs_state),
                documents::updated_at.eq(diesel::dsl::sql::<diesel::sql_types::Text>(
                    "datetime('now')",
                )),
            ))
            .execute(conn)?;

        // Upsert the FTS5 index entry.
        diesel::sql_query(
            "INSERT INTO fts_content(doc_id, title, body) VALUES (?1, ?2, ?3)
             ON CONFLICT DO UPDATE SET title = ?2, body = ?3",
        )
        .bind::<diesel::sql_types::Text, _>(&id)
        .bind::<diesel::sql_types::Text, _>(&title)
        .bind::<diesel::sql_types::Text, _>(&plain_text)
        .execute(conn)?;

        Ok(())
    })
}
