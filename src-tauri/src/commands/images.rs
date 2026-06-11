// Anker-Bild-Lifecycle — Port von src/server/images.ts.
use serde::Deserialize;
use tauri::State;

use crate::db::now_iso;
use crate::dto::{AddAnchorOut, AnchorImageDTO, DataUrlOut, RemoveAnchorOut};
use crate::error::{AppError, AppResult};
use crate::repo;
use crate::state::AppState;
use crate::storage::parse_data_url;

#[derive(Debug, Deserialize)]
pub struct ImageIdInput {
    pub id: String,
}

#[tauri::command]
pub async fn get_image_data_url(
    state: State<'_, AppState>,
    input: ImageIdInput,
) -> AppResult<Option<DataUrlOut>> {
    let conn = state.db.lock().unwrap();
    let Some(img) = repo::get_image(&conn, &input.id)? else {
        return Ok(None);
    };
    let (b64, mime) = state.storage().read_as_base64(&img.path)?;
    Ok(Some(DataUrlOut {
        data_url: format!("data:{mime};base64,{b64}"),
    }))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StyleIdInput {
    pub style_id: String,
}

#[tauri::command]
pub async fn get_style_anchors(
    state: State<'_, AppState>,
    input: StyleIdInput,
) -> AppResult<Vec<AnchorImageDTO>> {
    let conn = state.db.lock().unwrap();
    let Some(style) = repo::get_style(&conn, &input.style_id)? else {
        return Ok(Vec::new());
    };
    let ids = style.dto.anchor_image_ids;
    if ids.is_empty() {
        return Ok(Vec::new());
    }
    let imgs = repo::get_images_by_ids(&conn, &ids)?;
    let storage = state.storage();

    // Reihenfolge gemäß anchorImageIds beibehalten.
    let mut out = Vec::new();
    for id in &ids {
        let Some(img) = imgs.iter().find(|i| &i.id == id) else {
            continue;
        };
        let (b64, mime) = storage.read_as_base64(&img.path)?;
        out.push(AnchorImageDTO {
            id: id.clone(),
            data_url: format!("data:{mime};base64,{b64}"),
        });
    }
    Ok(out)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddAnchorInput {
    pub style_id: String,
    pub data_url: String,
}

#[tauri::command]
pub async fn add_anchor_image(
    state: State<'_, AppState>,
    input: AddAnchorInput,
) -> AppResult<AddAnchorOut> {
    if input.style_id.is_empty() {
        return Err(AppError::msg("styleId erforderlich."));
    }
    if input.data_url.is_empty() {
        return Err(AppError::msg("dataUrl erforderlich."));
    }

    let conn = state.db.lock().unwrap();
    let style = repo::get_style(&conn, &input.style_id)?
        .ok_or_else(|| AppError::msg("Stil nicht gefunden."))?;

    let (mime, b64) = parse_data_url(&input.data_url)?;
    let saved = state.storage().save_base64(&b64, &mime)?;

    let image_id = crate::ids::new_id();
    conn.execute(
        r#"INSERT INTO "Image" ("id", "kind", "path", "mime", "createdAt")
           VALUES (?1, 'anchor', ?2, ?3, ?4)"#,
        rusqlite::params![image_id, saved.path, saved.mime, now_iso()],
    )?;

    let mut next = style.dto.anchor_image_ids;
    next.push(image_id.clone());
    conn.execute(
        r#"UPDATE "Style" SET "anchorImageIds" = ?1, "updatedAt" = ?2 WHERE "id" = ?3"#,
        rusqlite::params![serde_json::to_string(&next)?, now_iso(), input.style_id],
    )?;

    Ok(AddAnchorOut {
        image_id,
        anchor_image_ids: next,
    })
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoveAnchorInput {
    pub style_id: String,
    pub image_id: String,
}

#[tauri::command]
pub async fn remove_anchor_image(
    state: State<'_, AppState>,
    input: RemoveAnchorInput,
) -> AppResult<RemoveAnchorOut> {
    let conn = state.db.lock().unwrap();
    let style = repo::get_style(&conn, &input.style_id)?
        .ok_or_else(|| AppError::msg("Stil nicht gefunden."))?;

    let next: Vec<String> = style
        .dto
        .anchor_image_ids
        .into_iter()
        .filter(|id| id != &input.image_id)
        .collect();
    conn.execute(
        r#"UPDATE "Style" SET "anchorImageIds" = ?1, "updatedAt" = ?2 WHERE "id" = ?3"#,
        rusqlite::params![serde_json::to_string(&next)?, now_iso(), input.style_id],
    )?;

    if let Some(img) = repo::get_image(&conn, &input.image_id)? {
        state.storage().remove(&img.path);
        let _ = conn.execute(r#"DELETE FROM "Image" WHERE "id" = ?1"#, [&input.image_id]);
    }

    Ok(RemoveAnchorOut {
        anchor_image_ids: next,
    })
}
