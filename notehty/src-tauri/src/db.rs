use diesel::prelude::*;
use diesel_migrations::{embed_migrations, EmbeddedMigrations, MigrationHarness};
use std::path::{Path, PathBuf};
use std::sync::Mutex;

pub const MIGRATIONS: EmbeddedMigrations = embed_migrations!("migrations");

pub struct DbState(pub Mutex<SqliteConnection>);

pub struct DbPath(pub PathBuf);

pub fn open(db_path: &Path) -> crate::error::Result<DbState> {
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent)?;
    }

    let url = db_path.to_string_lossy();
    let mut conn = SqliteConnection::establish(&url)?;

    conn.run_pending_migrations(MIGRATIONS)
        .map_err(crate::error::Error::DieselMigration)?;

    // Enable WAL mode for better concurrent read performance
    diesel::sql_query("PRAGMA journal_mode=WAL")
        .execute(&mut conn)?;

    Ok(DbState(Mutex::new(conn)))
}
