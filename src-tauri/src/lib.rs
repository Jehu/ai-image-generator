mod canonical;
mod commands;
mod config;
mod db;
mod dto;
mod error;
mod ids;
mod legacy_migrate;
mod llm;
mod prompt;
mod provider;
mod repo;
mod state;
mod storage;

use tauri::Manager;

use crate::config::{Config, Paths};
use crate::state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("App-Data-Verzeichnis nicht auflösbar");
            std::fs::create_dir_all(&app_data_dir)?;

            let config = Config::load(&app_data_dir);
            let paths = Paths::resolve(app_data_dir, &config);

            // Bestehende Web-App-Daten (dev.db + Bilder) einmalig übernehmen.
            legacy_migrate::run(&config, &paths);

            let conn = db::open(&paths.db_path)
                .map_err(|e| format!("Datenbank konnte nicht geöffnet werden: {e}"))?;

            app.manage(AppState::new(config, paths, conn, reqwest::Client::new()));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // styles
            commands::styles::list_styles,
            commands::styles::get_style,
            commands::styles::create_style,
            commands::styles::update_style,
            commands::styles::delete_style,
            commands::styles::duplicate_style,
            commands::styles::list_style_versions,
            commands::styles::list_generations,
            // generate
            commands::generate::generate_image,
            // images
            commands::images::get_image_data_url,
            commands::images::get_style_anchors,
            commands::images::add_anchor_image,
            commands::images::remove_anchor_image,
            // misc
            commands::misc::analyze_style_from_image,
            commands::misc::compile_style_brief,
            commands::misc::list_camera_bodies,
            commands::misc::add_camera_body,
            commands::misc::delete_camera_body,
            commands::misc::list_available_models,
            commands::misc::get_settings_info,
            commands::misc::save_settings,
        ])
        .run(tauri::generate_context!())
        .expect("Fehler beim Starten der Tauri-App");
}
