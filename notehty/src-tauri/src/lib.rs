mod commands;
mod db;
mod error;
mod models;
mod schema;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let data_dir = app.path().app_data_dir()?;
            let db_path = data_dir.join("notehty.db");
            let state = db::open(&db_path)?;
            app.manage(state);
            app.manage(db::DbPath(db_path));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // sync
            commands::sync::db_path,
            commands::sync::get_db_version,
            commands::sync::get_changes,
            commands::sync::apply_changes,
            // notepad / documents
            commands::notepad::get_document,
            commands::notepad::update_document,
            commands::notepad::promote_selection,
            // work items
            commands::work_items::list_work_items,
            commands::work_items::create_work_item,
            commands::work_items::update_work_item_title,
            commands::work_items::set_work_item_status,
            commands::work_items::set_focus,
            commands::work_items::park_work_item,
            commands::work_items::delete_work_item,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
