use diesel::prelude::*;
use diesel::sqlite::SqliteConnection;
use diesel_migrations::{embed_migrations, EmbeddedMigrations, MigrationHarness};
use std::path::{Path, PathBuf};

use crate::error::{Error, Result};

pub const MIGRATIONS: EmbeddedMigrations = embed_migrations!("migrations");

pub type DbConn = std::sync::Mutex<SqliteConnection>;

pub fn establish(db_path: &Path) -> Result<SqliteConnection> {
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let url = db_path
        .to_str()
        .ok_or_else(|| Error::Logic("invalid db path".into()))?;
    Ok(SqliteConnection::establish(url)?)
}

pub fn run_migrations(conn: &mut SqliteConnection) -> Result<()> {
    conn.run_pending_migrations(MIGRATIONS)
        .map_err(|e| Error::Logic(e.to_string()))?;
    Ok(())
}

/// Attempt to load the crsqlite extension and mark tables as CRRs.
/// Logs a warning and returns normally if the binary is not present — app continues without sync.
pub fn try_setup_crsqlite(conn: &mut SqliteConnection, resource_dir: &Path) {
    let ext = crsqlite_path(resource_dir);
    if !ext.exists() {
        log::warn!(
            "crsqlite extension not found at {:?} — cloud sync disabled",
            ext
        );
        return;
    }
    if let Err(e) = load_and_init_crsqlite(conn, &ext) {
        log::warn!("crsqlite load failed: {e} — cloud sync disabled");
    }
}

fn crsqlite_path(resource_dir: &Path) -> PathBuf {
    #[cfg(target_os = "macos")]
    return resource_dir.join("crsqlite.dylib");
    #[cfg(target_os = "linux")]
    return resource_dir.join("crsqlite.so");
    #[cfg(target_os = "windows")]
    return resource_dir.join("crsqlite.dll");
    #[cfg(not(any(target_os = "macos", target_os = "linux", target_os = "windows")))]
    return resource_dir.join("crsqlite.so");
}

fn load_and_init_crsqlite(conn: &mut SqliteConnection, ext_path: &Path) -> Result<()> {
    use diesel::connection::SimpleConnection;

    let path_str = ext_path
        .to_str()
        .ok_or_else(|| Error::Logic("invalid extension path".into()))?;

    // Enable extension loading via SQLite pragma (requires SQLITE_ENABLE_LOAD_EXTENSION).
    // Using unsafe FFI because diesel does not expose sqlite3_enable_load_extension.
    unsafe {
        use libsqlite3_sys as ffi;
        // Obtain the raw *sqlite3 handle stored inside SqliteConnection.
        // This relies on the struct layout being a thin newtype over RawConnection,
        // which is stable across diesel 2.x patch releases.
        let raw: *mut ffi::sqlite3 = {
            let ptr = conn as *mut SqliteConnection as *mut *mut ffi::sqlite3;
            *ptr
        };
        ffi::sqlite3_enable_load_extension(raw, 1);
    }

    conn.batch_execute(&format!(
        "SELECT load_extension('{path_str}', 'sqlite3_crsqlite_init');"
    ))?;
    conn.batch_execute(
        "SELECT crsql_as_crr('work_items');
         SELECT crsql_as_crr('documents');",
    )?;
    log::info!("crsqlite loaded and CRRs registered");
    Ok(())
}
