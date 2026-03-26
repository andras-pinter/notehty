mod commands;
mod db;
mod error;
mod models;
mod schema;

use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let data_dir = app
                .path()
                .app_data_dir()
                .expect("failed to resolve app data dir");
            let db_path = data_dir.join("notehty.db");

            let mut conn = db::establish(&db_path).expect("failed to open database");
            db::run_migrations(&mut conn).expect("failed to run migrations");

            let resource_dir = app
                .path()
                .resource_dir()
                .unwrap_or_else(|_| std::path::PathBuf::from("."));
            db::try_setup_crsqlite(&mut conn, &resource_dir);

            app.manage(Mutex::new(conn));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::notepad::get_document,
            commands::notepad::update_document,
            commands::work_items::list_work_items,
            commands::work_items::create_work_item,
            commands::work_items::update_work_item_title,
            commands::work_items::set_work_item_status,
            commands::work_items::set_focus,
            commands::work_items::delete_work_item,
            commands::promotion::promote_selection,
            commands::promotion::promote_block,
            commands::search::search,
            commands::sync::db_path,
            commands::sync::get_changes,
            commands::sync::apply_changes,
            commands::sync::get_db_version,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
