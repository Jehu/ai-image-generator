// Analyze, Style-Brief, Kamera-Bodys, Modelle, Settings — Ports von
// src/server/{analyze,styleBrief,cameras,models,settings}.ts.
use serde::Deserialize;
use tauri::State;

use crate::db::now_iso;
use crate::dto::{
    AnalyzeStyleInput, AnalyzeStyleOutput, AvailableModel, CompileStyleBriefInput,
    CompileStyleBriefResult, SettingsInfo,
};
use crate::error::{AppError, AppResult};
use crate::llm;
use crate::provider::OPENROUTER_MODELS;
use crate::state::AppState;

// ---------- Analyze ----------

#[tauri::command]
pub async fn analyze_style_from_image(
    state: State<'_, AppState>,
    input: AnalyzeStyleInput,
) -> AppResult<AnalyzeStyleOutput> {
    if input.image_base64.trim().is_empty() {
        return Err(AppError::msg("Bitte ein Bild (imageBase64) übergeben."));
    }
    if !input.mime_type.starts_with("image/") {
        return Err(AppError::msg(
            "mimeType muss ein Bild-MIME-Typ sein (image/...).",
        ));
    }
    let style_json = llm::analyze_style(
        &state.http,
        &state.config,
        &input.image_base64,
        &input.mime_type,
    )
    .await?;
    Ok(AnalyzeStyleOutput { style_json })
}

// ---------- Style-Brief (manuelle Neugenerierung) ----------

#[tauri::command]
pub async fn compile_style_brief(
    state: State<'_, AppState>,
    input: CompileStyleBriefInput,
) -> AppResult<CompileStyleBriefResult> {
    if !input.style_json.is_object() {
        return Err(AppError::msg("styleJson muss ein Objekt sein."));
    }
    let brief = llm::build_style_brief(
        &state.http,
        &state.config,
        &input.style_json,
        input.kind.as_deref(),
    )
    .await?;
    Ok(CompileStyleBriefResult { brief })
}

// ---------- Kamera-Bodys ----------

fn camera_list(conn: &rusqlite::Connection) -> AppResult<Vec<String>> {
    let mut stmt =
        conn.prepare(r#"SELECT "name" FROM "CameraBody" ORDER BY "name" ASC"#)?;
    let rows = stmt.query_map([], |r| r.get::<_, String>(0))?;
    Ok(rows.collect::<rusqlite::Result<Vec<_>>>()?)
}

#[tauri::command]
pub async fn list_camera_bodies(state: State<'_, AppState>) -> AppResult<Vec<String>> {
    let conn = state.db.lock().unwrap();
    camera_list(&conn)
}

#[derive(Debug, Deserialize)]
pub struct CameraNameInput {
    pub name: String,
}

#[tauri::command]
pub async fn add_camera_body(
    state: State<'_, AppState>,
    input: CameraNameInput,
) -> AppResult<Vec<String>> {
    let name = input.name.trim().to_string();
    if name.is_empty() {
        return Err(AppError::msg("Name erforderlich."));
    }
    let conn = state.db.lock().unwrap();
    conn.execute(
        r#"INSERT INTO "CameraBody" ("id", "name", "createdAt") VALUES (?1, ?2, ?3)
           ON CONFLICT("name") DO NOTHING"#,
        rusqlite::params![crate::ids::new_id(), name, now_iso()],
    )?;
    camera_list(&conn)
}

#[tauri::command]
pub async fn delete_camera_body(
    state: State<'_, AppState>,
    input: CameraNameInput,
) -> AppResult<Vec<String>> {
    let conn = state.db.lock().unwrap();
    conn.execute(
        r#"DELETE FROM "CameraBody" WHERE "name" = ?1"#,
        [&input.name],
    )?;
    camera_list(&conn)
}

// ---------- Modelle ----------

#[tauri::command]
pub async fn list_available_models(
    state: State<'_, AppState>,
) -> AppResult<Vec<AvailableModel>> {
    let mut out = Vec::new();
    if state.config.openrouter_api_key().is_some() {
        for m in OPENROUTER_MODELS {
            out.push(AvailableModel {
                provider_id: "openrouter".to_string(),
                model_id: m.id.to_string(),
                label: m.label.to_string(),
                supports_references: m.supports_references,
            });
        }
    }
    Ok(out)
}

// ---------- Settings ----------

fn mask_key(key: &str) -> Option<String> {
    if key.is_empty() {
        return None;
    }
    let chars: Vec<char> = key.chars().collect();
    let n = chars.len();
    let head: String = chars.iter().take(4).collect();
    let tail: String = chars.iter().skip(n.saturating_sub(4)).collect();
    Some(format!("{head}…{tail} ({n} Zeichen)"))
}

#[tauri::command]
pub async fn get_settings_info(state: State<'_, AppState>) -> AppResult<SettingsInfo> {
    let gemini = state.config.get("GEMINI_API_KEY").unwrap_or("");
    let openai = state.config.get("OPENAI_API_KEY").unwrap_or("");
    let openrouter = state.config.get("OPENROUTER_API_KEY").unwrap_or("");
    Ok(SettingsInfo {
        has_api_key: !gemini.trim().is_empty(),
        api_key_masked: mask_key(gemini),
        has_open_ai_key: !openai.trim().is_empty(),
        open_ai_key_masked: mask_key(openai),
        has_open_router_key: !openrouter.trim().is_empty(),
        open_router_key_masked: mask_key(openrouter),
        image_dir: state.paths.image_dir.display().to_string(),
        database_url: state.paths.db_path.display().to_string(),
    })
}
