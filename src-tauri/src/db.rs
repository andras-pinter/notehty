use diesel::{r2d2, SqliteConnection};
use diesel_migrations::{embed_migrations, EmbeddedMigrations, MigrationHarness};

pub type DbPool = r2d2::Pool<r2d2::ConnectionManager<SqliteConnection>>;

const MIGRATIONS: EmbeddedMigrations = embed_migrations!("migrations");

pub fn init_db(url: &str) -> crate::Result<DbPool> {
    let manager = r2d2::ConnectionManager::<SqliteConnection>::new(url);
    let pool = r2d2::Pool::builder().max_size(4).build(manager)?;

    pool.get()?
        .run_pending_migrations(MIGRATIONS)
        .expect("failed to run DB migrations");

    Ok(pool)
}
