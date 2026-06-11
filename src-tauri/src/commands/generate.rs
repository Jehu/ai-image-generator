// Bildgenerierung — Port von src/server/generate.ts.
use tauri::State;

use crate::db::now_iso;
use crate::dto::{
    GenerateInput, GenerateOutput, GenerateParams, GeneratedImageOut, ReferenceImage,
};
use crate::error::{AppError, AppResult};
use crate::prompt::compile_prompt;
use crate::provider;
use crate::repo;
use crate::state::AppState;

#[tauri::command]
pub async fn generate_image(
    state: State<'_, AppState>,
    input: GenerateInput,
) -> AppResult<GenerateOutput> {
    if input.subject.trim().is_empty() {
        return Err(AppError::msg("Bitte ein Motiv (subject) angeben."));
    }
    if !input.style_json.is_object() {
        return Err(AppError::msg("styleJson muss ein Objekt sein."));
    }

    let model_id = provider::resolve_model(input.provider.as_deref(), input.model_id.as_deref())?;

    // Anker-Bilder des Stils als Stil-Referenzen laden (stärkster Konsistenz-
    // Hebel, da keine Seeds). Anker zuerst, dann ad-hoc-Referenzen vom Client.
    let mut anchor_refs: Vec<ReferenceImage> = Vec::new();
    let mut used_anchor_ids: Vec<String> = Vec::new();
    if let Some(style_id) = &input.style_id {
        let conn = state.db.lock().unwrap();
        if let Some(style) = repo::get_style(&conn, style_id)? {
            used_anchor_ids = style.dto.anchor_image_ids.clone();
            if !used_anchor_ids.is_empty() {
                let imgs = repo::get_images_by_ids(&conn, &used_anchor_ids)?;
                let storage = state.storage();
                for img in &imgs {
                    let (b64, mime) = storage.read_as_base64(&img.path)?;
                    anchor_refs.push(ReferenceImage {
                        mime_type: mime,
                        data: b64,
                    });
                }
            }
        }
    }
    let mut references = anchor_refs;
    references.extend(input.references.unwrap_or_default());

    let compiled = compile_prompt(
        &input.style_json,
        &input.subject,
        !references.is_empty(),
        input.kind.as_deref(),
    );

    let params = GenerateParams {
        aspect_ratio: Some(
            input
                .params
                .as_ref()
                .and_then(|p| p.aspect_ratio.clone())
                .unwrap_or_else(|| "1:1".to_string()),
        ),
        image_size: Some(
            input
                .params
                .as_ref()
                .and_then(|p| p.image_size.clone())
                .unwrap_or_else(|| "2K".to_string()),
        ),
        thinking_level: input.params.as_ref().and_then(|p| p.thinking_level.clone()),
        count: Some(input.params.as_ref().and_then(|p| p.count).unwrap_or(1)),
    };

    let result = provider::generate(
        &state.http,
        &state.config,
        &state.price_cache,
        &model_id,
        &compiled.prompt_text,
        &references,
        &params,
    )
    .await?;

    // Produktions-Generierungen (mit styleId) in der Historie speichern;
    // Playground-Generierungen bleiben ephemer.
    if let Some(style_id) = &input.style_id {
        let conn = state.db.lock().unwrap();
        let generation_id = crate::ids::new_id();
        let now = now_iso();
        conn.execute(
            r#"INSERT INTO "Generation" ("id", "styleId", "subject", "compiledPrompt", "provider", "modelId", "params", "referenceImageIds", "status", "costUsd", "createdAt")
               VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'done', ?9, ?10)"#,
            rusqlite::params![
                generation_id,
                style_id,
                input.subject,
                serde_json::to_string(&compiled.prompt_object)?,
                input.provider.as_deref().unwrap_or("openrouter"),
                model_id,
                serde_json::to_string(&params)?,
                serde_json::to_string(&used_anchor_ids)?,
                result.cost_usd,
                now,
            ],
        )?;

        let storage = state.storage();
        let mut first_image_id: Option<String> = None;
        for img in &result.images {
            let saved = storage.save_base64(&img.data, &img.mime_type)?;
            let image_id = crate::ids::new_id();
            conn.execute(
                r#"INSERT INTO "Image" ("id", "kind", "path", "mime", "generationId", "createdAt")
                   VALUES (?1, 'output', ?2, ?3, ?4, ?5)"#,
                rusqlite::params![image_id, saved.path, saved.mime, generation_id, now_iso()],
            )?;
            if first_image_id.is_none() {
                first_image_id = Some(image_id);
            }
        }
        if let Some(first) = first_image_id {
            conn.execute(
                r#"UPDATE "Generation" SET "outputImageId" = ?1 WHERE "id" = ?2"#,
                rusqlite::params![first, generation_id],
            )?;
        }
    }

    Ok(GenerateOutput {
        images: result
            .images
            .iter()
            .map(|img| GeneratedImageOut {
                data_url: format!("data:{};base64,{}", img.mime_type, img.data),
                mime_type: img.mime_type.clone(),
            })
            .collect(),
        compiled_prompt: compiled.prompt_object,
        prompt_text: compiled.prompt_text,
        cost_usd: result.cost_usd,
    })
}
