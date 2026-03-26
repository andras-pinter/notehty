use diesel::prelude::*;
use tauri::State;

use crate::db::{DbPath, DbState};
use crate::error::Result;

#[tauri::command]
pub fn db_path(path: State<DbPath>) -> Result<String> {
    Ok(path.0.to_string_lossy().to_string())
}

/// Returns current DB version (crsqlite logical clock).
/// Requires crsqlite extension — returns 0 if not loaded.
#[tauri::command]
pub fn get_db_version(state: State<DbState>) -> Result<i64> {
    let mut conn = state.0.lock().expect("db mutex poisoned");
    let rows = diesel::sql_query(
        "SELECT COALESCE(crsql_db_version(), 0) as version",
    )
    .load::<VersionRow>(&mut *conn)
    .unwrap_or_default();
    Ok(rows.into_iter().next().map(|r| r.version).unwrap_or(0))
}

/// Returns all changes since `since_version` as a base64-encoded changeset blob.
/// Requires crsqlite extension.
#[tauri::command]
pub fn get_changes(_state: State<DbState>, _since_version: i64) -> Result<String> {
    Err(crate::error::Error::Logic(
        "sync not available: crsqlite extension not loaded".into(),
    ))
}

/// Applies a base64-encoded changeset blob received from another device.
/// Requires crsqlite extension.
#[tauri::command]
pub fn apply_changes(_state: State<DbState>, _changeset: String) -> Result<()> {
    Err(crate::error::Error::Logic(
        "sync not available: crsqlite extension not loaded".into(),
    ))
}

#[derive(QueryableByName, Default)]
struct VersionRow {
    #[diesel(sql_type = diesel::sql_types::BigInt)]
    version: i64,
}
