// Style-CRUD, Versionierung, Historie — Port von src/server/styles.ts.
use serde::Deserialize;
use serde_json::Value;
use tauri::State;

use crate::canonical::hash_style_json;
use crate::db::now_iso;
use crate::dto::{
    as_image_kind, CreateStyleInput, GenerationDTO, StyleDTO, StyleVersionDTO,
    UpdateStyleInput,
};
use crate::error::{AppError, AppResult};
use crate::llm::build_style_brief;
use crate::repo;
use crate::state::AppState;

// Style-Brief + Hash best-effort erzeugen — blockiert das Speichern nie.
async fn generate_brief_fields(
    state: &AppState,
    style_json: &Value,
    kind: &str,
) -> (Option<String>, Option<String>) {
    let config = state.config();
    match build_style_brief(&state.http, &config, style_json, Some(kind)).await {
        Ok(brief) => {
            let hash = hash_style_json(style_json);
            (
                if brief.is_empty() { None } else { Some(brief) },
                Some(hash),
            )
        }
        Err(err) => {
            eprintln!("Style-Brief-Generierung übersprungen: {err}");
            (None, None)
        }
    }
}

#[derive(Debug, Default, Deserialize)]
pub struct ListStylesInput {
    pub tag: Option<String>,
    pub search: Option<String>,
}

#[tauri::command]
pub async fn list_styles(
    state: State<'_, AppState>,
    input: Option<ListStylesInput>,
) -> AppResult<Vec<StyleDTO>> {
    let input = input.unwrap_or_default();
    let conn = state.db.lock().unwrap();
    let mut styles: Vec<StyleDTO> =
        repo::list_styles(&conn)?.into_iter().map(|r| r.dto).collect();

    if let Some(tag) = &input.tag {
        styles.retain(|s| s.tags.iter().any(|t| t == tag));
    }
    if let Some(search) = &input.search {
        let q = search.to_lowercase();
        styles.retain(|s| {
            s.name.to_lowercase().contains(&q)
                || s.description
                    .as_deref()
                    .unwrap_or("")
                    .to_lowercase()
                    .contains(&q)
        });
    }
    Ok(styles)
}

#[derive(Debug, Deserialize)]
pub struct IdInput {
    pub id: String,
}

#[tauri::command]
pub async fn get_style(
    state: State<'_, AppState>,
    input: IdInput,
) -> AppResult<Option<StyleDTO>> {
    let conn = state.db.lock().unwrap();
    Ok(repo::get_style(&conn, &input.id)?.map(|r| r.dto))
}

#[tauri::command]
pub async fn create_style(
    state: State<'_, AppState>,
    input: CreateStyleInput,
) -> AppResult<StyleDTO> {
    let name = input.name.trim().to_string();
    if name.is_empty() {
        return Err(AppError::msg("Name ist erforderlich."));
    }
    if !input.style_json.is_object() {
        return Err(AppError::msg("styleJson muss ein Objekt sein."));
    }

    let kind = as_image_kind(input.kind.as_deref());
    let (style_brief, brief_source_hash) =
        generate_brief_fields(&state, &input.style_json, &kind).await;

    let id = crate::ids::new_id();
    let version_id = crate::ids::new_id();
    let now = now_iso();
    let tags = serde_json::to_string(&input.tags.unwrap_or_default())?;
    let style_json = serde_json::to_string(&input.style_json)?;
    let default_params =
        serde_json::to_string(&input.default_params.unwrap_or_else(|| Value::Object(Default::default())))?;
    let anchor_ids = serde_json::to_string(&input.anchor_image_ids.unwrap_or_default())?;
    let provider = input.provider.unwrap_or_else(|| "openrouter".to_string());
    let model_id = input
        .model_id
        .unwrap_or_else(|| "google/gemini-3-pro-image-preview".to_string());

    let conn = state.db.lock().unwrap();
    conn.execute(
        r#"INSERT INTO "Style" ("id", "name", "description", "kind", "tags", "styleJson", "styleBrief", "briefSourceHash", "schemaVersion", "version", "provider", "modelId", "defaultParams", "anchorImageIds", "createdAt", "updatedAt")
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 1, 1, ?9, ?10, ?11, ?12, ?13, ?13)"#,
        rusqlite::params![
            id,
            name,
            input.description,
            kind,
            tags,
            style_json,
            style_brief,
            brief_source_hash,
            provider,
            model_id,
            default_params,
            anchor_ids,
            now,
        ],
    )?;
    conn.execute(
        r#"INSERT INTO "StyleVersion" ("id", "styleId", "version", "styleJson", "createdAt")
           VALUES (?1, ?2, 1, ?3, ?4)"#,
        rusqlite::params![version_id, id, style_json, now],
    )?;

    repo::get_style(&conn, &id)?
        .map(|r| r.dto)
        .ok_or_else(|| AppError::msg("Stil konnte nicht angelegt werden."))
}

#[tauri::command]
pub async fn update_style(
    state: State<'_, AppState>,
    input: UpdateStyleInput,
) -> AppResult<StyleDTO> {
    if input.id.trim().is_empty() {
        return Err(AppError::msg("id ist erforderlich."));
    }

    // Aktuellen Stand lesen (Lock sofort wieder freigeben — Brief-Call ist async).
    let current = {
        let conn = state.db.lock().unwrap();
        repo::get_style(&conn, &input.id)?
    }
    .ok_or_else(|| AppError::msg("Stil nicht gefunden."))?;

    let style_changed = input
        .style_json
        .as_ref()
        .map(|next| {
            serde_json::to_string(next).unwrap_or_default()
                != serde_json::to_string(&current.dto.style_json).unwrap_or_default()
        })
        .unwrap_or(false);
    let next_version = if style_changed {
        current.dto.version + 1
    } else {
        current.dto.version
    };

    // Brief nur neu generieren, wenn sich das styleJson wirklich geändert hat
    // (oder noch kein Brief existiert) — spart API-Calls.
    let mut brief_fields: Option<(Option<String>, Option<String>)> = None;
    if let Some(next_json) = &input.style_json {
        let next_hash = hash_style_json(next_json);
        if Some(next_hash.as_str()) != current.brief_source_hash.as_deref()
            || current.dto.style_brief.is_none()
        {
            let kind = match &input.kind {
                Some(k) => as_image_kind(Some(k)),
                None => current.dto.kind.clone(),
            };
            brief_fields = Some(generate_brief_fields(&state, next_json, &kind).await);
        }
    }

    let now = now_iso();
    let conn = state.db.lock().unwrap();

    // Dynamisches UPDATE — nur übergebene Felder ändern (Prisma-Verhalten).
    let mut sets: Vec<String> = vec![
        r#""version" = ?"#.to_string(),
        r#""updatedAt" = ?"#.to_string(),
    ];
    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> =
        vec![Box::new(next_version), Box::new(now.clone())];

    if let Some(name) = &input.name {
        sets.push(r#""name" = ?"#.to_string());
        params.push(Box::new(name.trim().to_string()));
    }
    if let Some(desc) = &input.description {
        sets.push(r#""description" = ?"#.to_string());
        params.push(Box::new(desc.clone()));
    }
    if let Some(kind) = &input.kind {
        sets.push(r#""kind" = ?"#.to_string());
        params.push(Box::new(as_image_kind(Some(kind))));
    }
    if let Some(tags) = &input.tags {
        sets.push(r#""tags" = ?"#.to_string());
        params.push(Box::new(serde_json::to_string(tags)?));
    }
    if let Some(style_json) = &input.style_json {
        sets.push(r#""styleJson" = ?"#.to_string());
        params.push(Box::new(serde_json::to_string(style_json)?));
    }
    if let Some((brief, hash)) = &brief_fields {
        sets.push(r#""styleBrief" = ?"#.to_string());
        params.push(Box::new(brief.clone()));
        sets.push(r#""briefSourceHash" = ?"#.to_string());
        params.push(Box::new(hash.clone()));
    }
    if let Some(dp) = &input.default_params {
        sets.push(r#""defaultParams" = ?"#.to_string());
        params.push(Box::new(serde_json::to_string(dp)?));
    }
    if let Some(ids) = &input.anchor_image_ids {
        sets.push(r#""anchorImageIds" = ?"#.to_string());
        params.push(Box::new(serde_json::to_string(ids)?));
    }
    if let Some(p) = &input.provider {
        sets.push(r#""provider" = ?"#.to_string());
        params.push(Box::new(p.clone()));
    }
    if let Some(m) = &input.model_id {
        sets.push(r#""modelId" = ?"#.to_string());
        params.push(Box::new(m.clone()));
    }

    params.push(Box::new(input.id.clone()));
    let sql = format!(
        r#"UPDATE "Style" SET {} WHERE "id" = ?"#,
        sets.join(", ")
    );
    conn.execute(
        &sql,
        rusqlite::params_from_iter(params.iter().map(|p| p.as_ref())),
    )?;

    if style_changed {
        if let Some(style_json) = &input.style_json {
            conn.execute(
                r#"INSERT INTO "StyleVersion" ("id", "styleId", "version", "styleJson", "createdAt")
                   VALUES (?1, ?2, ?3, ?4, ?5)"#,
                rusqlite::params![
                    crate::ids::new_id(),
                    input.id,
                    next_version,
                    serde_json::to_string(style_json)?,
                    now,
                ],
            )?;
        }
    }

    repo::get_style(&conn, &input.id)?
        .map(|r| r.dto)
        .ok_or_else(|| AppError::msg("Stil nicht gefunden."))
}

#[tauri::command]
pub async fn delete_style(
    state: State<'_, AppState>,
    input: IdInput,
) -> AppResult<serde_json::Value> {
    let conn = state.db.lock().unwrap();
    let n = conn.execute(r#"DELETE FROM "Style" WHERE "id" = ?1"#, [&input.id])?;
    if n == 0 {
        return Err(AppError::msg("Stil nicht gefunden."));
    }
    Ok(serde_json::json!({ "id": input.id }))
}

#[tauri::command]
pub async fn duplicate_style(
    state: State<'_, AppState>,
    input: IdInput,
) -> AppResult<StyleDTO> {
    let conn = state.db.lock().unwrap();
    let src = repo::get_style(&conn, &input.id)?
        .ok_or_else(|| AppError::msg("Stil nicht gefunden."))?;

    let id = crate::ids::new_id();
    let now = now_iso();
    let style_json = serde_json::to_string(&src.dto.style_json)?;
    conn.execute(
        r#"INSERT INTO "Style" ("id", "name", "description", "kind", "tags", "styleJson", "styleBrief", "briefSourceHash", "schemaVersion", "version", "provider", "modelId", "defaultParams", "anchorImageIds", "createdAt", "updatedAt")
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 1, 1, ?9, ?10, ?11, '[]', ?12, ?12)"#,
        rusqlite::params![
            id,
            format!("{} (Kopie)", src.dto.name),
            src.dto.description,
            src.dto.kind,
            serde_json::to_string(&src.dto.tags)?,
            style_json,
            src.dto.style_brief, // Brief gilt fürs identische styleJson weiter
            src.brief_source_hash,
            src.dto.provider,
            src.dto.model_id,
            serde_json::to_string(&src.dto.default_params)?,
            now,
        ],
    )?;
    conn.execute(
        r#"INSERT INTO "StyleVersion" ("id", "styleId", "version", "styleJson", "createdAt")
           VALUES (?1, ?2, 1, ?3, ?4)"#,
        rusqlite::params![crate::ids::new_id(), id, style_json, now],
    )?;

    repo::get_style(&conn, &id)?
        .map(|r| r.dto)
        .ok_or_else(|| AppError::msg("Stil konnte nicht dupliziert werden."))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StyleIdInput {
    pub style_id: String,
}

#[tauri::command]
pub async fn list_style_versions(
    state: State<'_, AppState>,
    input: StyleIdInput,
) -> AppResult<Vec<StyleVersionDTO>> {
    let conn = state.db.lock().unwrap();
    repo::list_style_versions(&conn, &input.style_id)
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListGenerationsInput {
    pub style_id: Option<String>,
    pub limit: Option<i64>,
}

#[tauri::command]
pub async fn list_generations(
    state: State<'_, AppState>,
    input: Option<ListGenerationsInput>,
) -> AppResult<Vec<GenerationDTO>> {
    let input = input.unwrap_or_default();
    let conn = state.db.lock().unwrap();
    repo::list_generations(&conn, input.style_id.as_deref(), input.limit.unwrap_or(50))
}
