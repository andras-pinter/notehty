use tauri::{AppHandle, Manager, State};

use crate::db::DbConn;
use crate::error::{Error, Result};

/// Returns the absolute path to the notehty.db file.
#[tauri::command]
pub fn db_path(app: AppHandle) -> Result<String> {
    let path = app
        .path()
        .app_data_dir()
        .map_err(|e| Error::Logic(e.to_string()))?
        .join("notehty.db");
    path.to_str()
        .map(|s| s.to_string())
        .ok_or_else(|| Error::Logic("invalid db path".into()))
}

/// Returns all local changes since `since_version` as a base64-encoded changeset blob.
/// Requires crsqlite extension to be loaded; returns an error otherwise.
#[tauri::command]
pub fn get_changes(_since_version: i64, _db: State<'_, DbConn>) -> Result<String> {
    Err(Error::Logic(
        "crsqlite not available — add the extension binary to resources/ to enable sync".into(),
    ))
}

/// Applies a base64-encoded changeset blob received from another device.
#[tauri::command]
pub fn apply_changes(_changeset: String, _db: State<'_, DbConn>) -> Result<()> {
    Err(Error::Logic(
        "crsqlite not available — add the extension binary to resources/ to enable sync".into(),
    ))
}

/// Returns the current local db version (used as cursor for incremental sync).
#[tauri::command]
pub fn get_db_version(_db: State<'_, DbConn>) -> Result<i64> {
    Err(Error::Logic(
        "crsqlite not available — add the extension binary to resources/ to enable sync".into(),
    ))
}
