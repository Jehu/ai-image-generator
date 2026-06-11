// SQLite-Zugriff über rusqlite (bundled). Das Schema entspricht dem
// Prisma-Schema der Web-App (gleiche Tabellen-/Spaltennamen), sodass eine
// migrierte dev.db ohne Umbau weiterverwendet werden kann.
use std::path::Path;

use chrono::{DateTime, SecondsFormat, TimeZone, Utc};
use rusqlite::types::ValueRef;
use rusqlite::Connection;

use crate::error::AppResult;

pub fn open(db_path: &Path) -> AppResult<Connection> {
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let conn = Connection::open(db_path)?;
    conn.pragma_update(None, "foreign_keys", "ON")?;
    conn.pragma_update(None, "journal_mode", "WAL")?;
    migrate(&conn)?;
    Ok(conn)
}

/// Idempotente Migration: legt die Tabellen an, falls sie fehlen.
/// Spaltennamen/-typen wie von `prisma db push` erzeugt.
fn migrate(conn: &Connection) -> AppResult<()> {
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS "Style" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "name" TEXT NOT NULL,
            "description" TEXT,
            "kind" TEXT NOT NULL DEFAULT 'foto',
            "tags" JSONB NOT NULL,
            "styleJson" JSONB NOT NULL,
            "styleBrief" TEXT,
            "briefSourceHash" TEXT,
            "schemaVersion" INTEGER NOT NULL DEFAULT 1,
            "version" INTEGER NOT NULL DEFAULT 1,
            "provider" TEXT NOT NULL DEFAULT 'gemini',
            "modelId" TEXT NOT NULL DEFAULT 'gemini-3-pro-image',
            "defaultParams" JSONB NOT NULL,
            "anchorImageIds" JSONB NOT NULL,
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" DATETIME NOT NULL
        );

        CREATE TABLE IF NOT EXISTS "StyleVersion" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "styleId" TEXT NOT NULL,
            "version" INTEGER NOT NULL,
            "styleJson" JSONB NOT NULL,
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "StyleVersion_styleId_fkey" FOREIGN KEY ("styleId")
                REFERENCES "Style" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
        CREATE UNIQUE INDEX IF NOT EXISTS "StyleVersion_styleId_version_key"
            ON "StyleVersion"("styleId", "version");

        CREATE TABLE IF NOT EXISTS "Generation" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "styleId" TEXT,
            "subject" TEXT NOT NULL,
            "compiledPrompt" JSONB NOT NULL,
            "provider" TEXT NOT NULL DEFAULT 'gemini',
            "modelId" TEXT NOT NULL,
            "params" JSONB NOT NULL,
            "referenceImageIds" JSONB NOT NULL,
            "outputImageId" TEXT,
            "status" TEXT NOT NULL DEFAULT 'pending',
            "errorMessage" TEXT,
            "costUsd" REAL,
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "Generation_styleId_fkey" FOREIGN KEY ("styleId")
                REFERENCES "Style" ("id") ON DELETE SET NULL ON UPDATE CASCADE
        );

        CREATE TABLE IF NOT EXISTS "CameraBody" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "name" TEXT NOT NULL,
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE UNIQUE INDEX IF NOT EXISTS "CameraBody_name_key"
            ON "CameraBody"("name");

        CREATE TABLE IF NOT EXISTS "Image" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "kind" TEXT NOT NULL,
            "path" TEXT NOT NULL,
            "mime" TEXT NOT NULL DEFAULT 'image/png',
            "width" INTEGER,
            "height" INTEGER,
            "generationId" TEXT,
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "Image_generationId_fkey" FOREIGN KEY ("generationId")
                REFERENCES "Generation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
        );
        "#,
    )?;
    Ok(())
}

/// Aktueller Zeitstempel im Speicherformat (ISO-8601 UTC mit Millisekunden).
pub fn now_iso() -> String {
    Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true)
}

/// Liest einen DateTime-Wert tolerant: Prisma/better-sqlite3 speichert je nach
/// Version ISO-Strings oder Unix-Millisekunden — beides wird unterstützt.
pub fn read_datetime(value: ValueRef<'_>) -> DateTime<Utc> {
    match value {
        ValueRef::Integer(ms) => Utc
            .timestamp_millis_opt(ms)
            .single()
            .unwrap_or_else(Utc::now),
        ValueRef::Real(ms) => Utc
            .timestamp_millis_opt(ms as i64)
            .single()
            .unwrap_or_else(Utc::now),
        ValueRef::Text(bytes) => {
            let s = String::from_utf8_lossy(bytes);
            parse_datetime_str(&s).unwrap_or_else(Utc::now)
        }
        _ => Utc::now(),
    }
}

fn parse_datetime_str(s: &str) -> Option<DateTime<Utc>> {
    if let Ok(dt) = DateTime::parse_from_rfc3339(s) {
        return Some(dt.with_timezone(&Utc));
    }
    // Varianten wie "2026-06-11 12:00:00.000 +00:00" oder ohne Offset.
    for fmt in [
        "%Y-%m-%d %H:%M:%S%.f %z",
        "%Y-%m-%d %H:%M:%S%.f%z",
        "%Y-%m-%dT%H:%M:%S%.f%z",
    ] {
        if let Ok(dt) = DateTime::parse_from_str(s, fmt) {
            return Some(dt.with_timezone(&Utc));
        }
    }
    for fmt in ["%Y-%m-%d %H:%M:%S%.f", "%Y-%m-%dT%H:%M:%S%.f"] {
        if let Ok(naive) = chrono::NaiveDateTime::parse_from_str(s, fmt) {
            return Some(Utc.from_utc_datetime(&naive));
        }
    }
    None
}

/// DateTime als ISO-String für DTOs (entspricht Date.toISOString()).
pub fn to_iso_string(dt: DateTime<Utc>) -> String {
    dt.to_rfc3339_opts(SecondsFormat::Millis, true)
}

/// Json-Spalte tolerant lesen (TEXT mit JSON-String oder NULL).
pub fn read_json(value: ValueRef<'_>) -> serde_json::Value {
    match value {
        ValueRef::Text(bytes) => {
            serde_json::from_slice(bytes).unwrap_or(serde_json::Value::Null)
        }
        ValueRef::Blob(bytes) => {
            serde_json::from_slice(bytes).unwrap_or(serde_json::Value::Null)
        }
        _ => serde_json::Value::Null,
    }
}

/// String-Array aus einer Json-Spalte (z.B. tags, anchorImageIds).
pub fn json_string_array(value: &serde_json::Value) -> Vec<String> {
    value
        .as_array()
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_rfc3339_and_prisma_variants() {
        assert!(parse_datetime_str("2026-06-11T12:00:00.000Z").is_some());
        assert!(parse_datetime_str("2026-06-11 12:00:00.000 +00:00").is_some());
        assert!(parse_datetime_str("2026-06-11 12:00:00").is_some());
    }

    #[test]
    fn migration_is_idempotent() {
        let conn = Connection::open_in_memory().unwrap();
        migrate(&conn).unwrap();
        migrate(&conn).unwrap();
        let count: i64 = conn
            .query_row(
                "SELECT count(*) FROM sqlite_master WHERE type='table' AND name IN ('Style','StyleVersion','Generation','CameraBody','Image')",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(count, 5);
    }
}
