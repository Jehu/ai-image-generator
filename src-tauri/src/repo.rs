// Datenbank-Zugriffsschicht: Row-Strukturen + Mapper auf DTOs.
// Entspricht den Prisma-Queries und toStyleDTO()-Mappern aus src/server/styles.ts.
use rusqlite::{Connection, Row};
use serde_json::Value;

use crate::db::{json_string_array, read_datetime, read_json, to_iso_string};
use crate::dto::{as_image_kind, GenerationDTO, StyleDTO, StyleVersionDTO};
use crate::error::AppResult;

pub const STYLE_COLUMNS: &str = r#""id", "name", "description", "kind", "tags", "styleJson", "styleBrief", "briefSourceHash", "schemaVersion", "version", "provider", "modelId", "defaultParams", "anchorImageIds", "createdAt", "updatedAt""#;

/// Vollständige Style-Zeile (inkl. briefSourceHash, der nicht ins DTO geht).
pub struct StyleRow {
    pub dto: StyleDTO,
    pub brief_source_hash: Option<String>,
}

pub fn map_style_row(row: &Row<'_>) -> rusqlite::Result<StyleRow> {
    let tags = read_json(row.get_ref(4)?);
    let anchor_ids = read_json(row.get_ref(13)?);
    let style_json = read_json(row.get_ref(5)?);
    let default_params = read_json(row.get_ref(12)?);
    let kind: String = row.get(3)?;
    Ok(StyleRow {
        brief_source_hash: row.get(7)?,
        dto: StyleDTO {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            kind: as_image_kind(Some(&kind)),
            tags: json_string_array(&tags),
            style_json: if style_json.is_null() {
                Value::Object(Default::default())
            } else {
                style_json
            },
            style_brief: row.get(6)?,
            schema_version: row.get(8)?,
            version: row.get(9)?,
            provider: row.get(10)?,
            model_id: row.get(11)?,
            default_params: if default_params.is_null() {
                Value::Object(Default::default())
            } else {
                default_params
            },
            anchor_image_ids: json_string_array(&anchor_ids),
            created_at: to_iso_string(read_datetime(row.get_ref(14)?)),
            updated_at: to_iso_string(read_datetime(row.get_ref(15)?)),
        },
    })
}

pub fn get_style(conn: &Connection, id: &str) -> AppResult<Option<StyleRow>> {
    let sql = format!(r#"SELECT {STYLE_COLUMNS} FROM "Style" WHERE "id" = ?1"#);
    let mut stmt = conn.prepare(&sql)?;
    let mut rows = stmt.query_map([id], map_style_row)?;
    Ok(rows.next().transpose()?)
}

pub fn list_styles(conn: &Connection) -> AppResult<Vec<StyleRow>> {
    let sql =
        format!(r#"SELECT {STYLE_COLUMNS} FROM "Style" ORDER BY "updatedAt" DESC"#);
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map([], map_style_row)?;
    Ok(rows.collect::<rusqlite::Result<Vec<_>>>()?)
}

pub fn list_style_versions(
    conn: &Connection,
    style_id: &str,
) -> AppResult<Vec<StyleVersionDTO>> {
    let mut stmt = conn.prepare(
        r#"SELECT "version", "styleJson", "createdAt" FROM "StyleVersion"
           WHERE "styleId" = ?1 ORDER BY "version" DESC"#,
    )?;
    let rows = stmt.query_map([style_id], |row| {
        Ok(StyleVersionDTO {
            version: row.get(0)?,
            style_json: {
                let v = read_json(row.get_ref(1)?);
                if v.is_null() {
                    Value::Object(Default::default())
                } else {
                    v
                }
            },
            created_at: to_iso_string(read_datetime(row.get_ref(2)?)),
        })
    })?;
    Ok(rows.collect::<rusqlite::Result<Vec<_>>>()?)
}

pub fn list_generations(
    conn: &Connection,
    style_id: Option<&str>,
    limit: i64,
) -> AppResult<Vec<GenerationDTO>> {
    let base = r#"SELECT "id", "styleId", "subject", "compiledPrompt", "provider", "modelId", "params", "status", "errorMessage", "costUsd", "createdAt" FROM "Generation""#;
    let sql = match style_id {
        Some(_) => format!(
            r#"{base} WHERE "styleId" = ?1 ORDER BY "createdAt" DESC LIMIT ?2"#
        ),
        None => format!(r#"{base} ORDER BY "createdAt" DESC LIMIT ?1"#),
    };
    let mut stmt = conn.prepare(&sql)?;

    let map = |row: &Row<'_>| -> rusqlite::Result<GenerationDTO> {
        let compiled = read_json(row.get_ref(3)?);
        let params = read_json(row.get_ref(6)?);
        Ok(GenerationDTO {
            id: row.get(0)?,
            style_id: row.get(1)?,
            subject: row.get(2)?,
            prompt_text: serde_json::to_string_pretty(&compiled)
                .unwrap_or_else(|_| "{}".to_string()),
            provider: row.get(4)?,
            model_id: row.get(5)?,
            params: if params.is_null() {
                Value::Object(Default::default())
            } else {
                params
            },
            status: row.get(7)?,
            error_message: row.get(8)?,
            cost_usd: row.get(9)?,
            output_image_ids: Vec::new(), // wird unten nachgeladen
            created_at: to_iso_string(read_datetime(row.get_ref(10)?)),
        })
    };

    let mut gens: Vec<GenerationDTO> = match style_id {
        Some(id) => stmt
            .query_map(rusqlite::params![id, limit], map)?
            .collect::<rusqlite::Result<Vec<_>>>()?,
        None => stmt
            .query_map(rusqlite::params![limit], map)?
            .collect::<rusqlite::Result<Vec<_>>>()?,
    };

    // Output-Image-IDs je Generation (entspricht include: { images: ... }).
    let mut img_stmt = conn.prepare(
        r#"SELECT "id" FROM "Image" WHERE "generationId" = ?1 ORDER BY "createdAt" ASC"#,
    )?;
    for gen in &mut gens {
        let ids = img_stmt
            .query_map([gen.id.as_str()], |r| r.get::<_, String>(0))?
            .collect::<rusqlite::Result<Vec<_>>>()?;
        gen.output_image_ids = ids;
    }

    Ok(gens)
}

/// Bild-Metadaten einer Zeile aus "Image".
pub struct ImageRow {
    pub id: String,
    pub path: String,
}

pub fn get_image(conn: &Connection, id: &str) -> AppResult<Option<ImageRow>> {
    let mut stmt = conn.prepare(r#"SELECT "id", "path" FROM "Image" WHERE "id" = ?1"#)?;
    let mut rows = stmt.query_map([id], |row| {
        Ok(ImageRow {
            id: row.get(0)?,
            path: row.get(1)?,
        })
    })?;
    Ok(rows.next().transpose()?)
}

pub fn get_images_by_ids(conn: &Connection, ids: &[String]) -> AppResult<Vec<ImageRow>> {
    if ids.is_empty() {
        return Ok(Vec::new());
    }
    let placeholders = ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
    let sql =
        format!(r#"SELECT "id", "path" FROM "Image" WHERE "id" IN ({placeholders})"#);
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map(rusqlite::params_from_iter(ids.iter()), |row| {
        Ok(ImageRow {
            id: row.get(0)?,
            path: row.get(1)?,
        })
    })?;
    Ok(rows.collect::<rusqlite::Result<Vec<_>>>()?)
}
