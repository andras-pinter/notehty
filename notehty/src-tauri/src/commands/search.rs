use diesel::prelude::*;
use tauri::State;

use crate::db::DbConn;
use crate::error::{Error, Result};
use crate::models::SearchResult;

#[tauri::command]
pub fn search(query: String, db: State<'_, DbConn>) -> Result<Vec<SearchResult>> {
    if query.trim().is_empty() {
        return Ok(vec![]);
    }

    let conn = &mut *db.lock().map_err(|_| Error::Logic("db lock poisoned".into()))?;

    #[derive(QueryableByName)]
    struct Row {
        #[diesel(sql_type = diesel::sql_types::Text)]
        doc_id: String,
        #[diesel(sql_type = diesel::sql_types::Text)]
        title: String,
        #[diesel(sql_type = diesel::sql_types::Text)]
        snippet: String,
    }

    let rows = diesel::sql_query(
        "SELECT doc_id,
                title,
                snippet(fts_content, 2, '<mark>', '</mark>', '…', 10) AS snippet
         FROM fts_content
         WHERE fts_content MATCH ?1
         ORDER BY rank
         LIMIT 20",
    )
    .bind::<diesel::sql_types::Text, _>(&query)
    .load::<Row>(conn)?;

    Ok(rows
        .into_iter()
        .map(|r| SearchResult {
            doc_id: r.doc_id,
            title: r.title,
            snippet: r.snippet,
        })
        .collect())
}
