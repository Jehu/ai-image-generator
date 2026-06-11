// Storage-Adapter — Port von src/lib/storage/local.ts.
// Bilder liegen als Dateien im Bilder-Verzeichnis; in der DB steht der
// relative Pfad (Dateiname), wie bei der Web-App.
use std::path::{Path, PathBuf};

use base64::Engine;

use crate::error::{AppError, AppResult};

pub struct LocalStorage {
    base_dir: PathBuf,
}

pub struct SavedFile {
    pub path: String,
    pub mime: String,
}

fn ext_for_mime(mime: &str) -> &'static str {
    match mime {
        "image/jpeg" => "jpg",
        "image/webp" => "webp",
        _ => "png",
    }
}

fn mime_for_ext(path: &str) -> String {
    let lower = path.to_lowercase();
    if lower.ends_with(".jpg") || lower.ends_with(".jpeg") {
        "image/jpeg".to_string()
    } else if lower.ends_with(".webp") {
        "image/webp".to_string()
    } else {
        "image/png".to_string()
    }
}

impl LocalStorage {
    pub fn new(base_dir: &Path) -> Self {
        LocalStorage {
            base_dir: base_dir.to_path_buf(),
        }
    }

    /// Base64 (ohne data:-Präfix) als Datei speichern → relativer Pfad.
    pub fn save_base64(&self, b64: &str, mime: &str) -> AppResult<SavedFile> {
        std::fs::create_dir_all(&self.base_dir)?;
        let bytes = base64::engine::general_purpose::STANDARD
            .decode(b64.trim())
            .map_err(|e| AppError::msg(format!("Ungültige Base64-Daten: {e}")))?;
        let filename = format!("{}.{}", uuid::Uuid::new_v4(), ext_for_mime(mime));
        std::fs::write(self.base_dir.join(&filename), bytes)?;
        Ok(SavedFile {
            path: filename,
            mime: mime.to_string(),
        })
    }

    /// Datei als Base64 lesen (für Data-URLs).
    pub fn read_as_base64(&self, rel_path: &str) -> AppResult<(String, String)> {
        let full = self.base_dir.join(rel_path);
        let bytes = std::fs::read(&full).map_err(|e| {
            AppError::msg(format!(
                "Bilddatei konnte nicht gelesen werden ({}): {e}",
                full.display()
            ))
        })?;
        let b64 = base64::engine::general_purpose::STANDARD.encode(bytes);
        Ok((b64, mime_for_ext(rel_path)))
    }

    /// Datei löschen — fehlende Datei wird ignoriert (wie im TS-Original).
    pub fn remove(&self, rel_path: &str) {
        let _ = std::fs::remove_file(self.base_dir.join(rel_path));
    }
}

/// data:-URL in (mime, base64) zerlegen — Port von parseDataUrl().
pub fn parse_data_url(data_url: &str) -> AppResult<(String, String)> {
    let rest = data_url
        .strip_prefix("data:")
        .ok_or_else(|| AppError::msg("Ungültige Data-URL."))?;
    let (mime, b64) = rest
        .split_once(";base64,")
        .ok_or_else(|| AppError::msg("Ungültige Data-URL."))?;
    if mime.is_empty() {
        return Err(AppError::msg("Ungültige Data-URL."));
    }
    Ok((mime.to_string(), b64.to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_data_url() {
        let (mime, b64) = parse_data_url("data:image/png;base64,AAAA").unwrap();
        assert_eq!(mime, "image/png");
        assert_eq!(b64, "AAAA");
    }

    #[test]
    fn rejects_invalid_data_url() {
        assert!(parse_data_url("http://example.com/x.png").is_err());
    }

    #[test]
    fn roundtrip_save_and_read() {
        let dir = std::env::temp_dir().join(format!("iss-test-{}", uuid::Uuid::new_v4()));
        let storage = LocalStorage::new(&dir);
        let saved = storage.save_base64("aGVsbG8=", "image/png").unwrap();
        let (b64, mime) = storage.read_as_base64(&saved.path).unwrap();
        assert_eq!(b64, "aGVsbG8=");
        assert_eq!(mime, "image/png");
        storage.remove(&saved.path);
        let _ = std::fs::remove_dir_all(&dir);
    }
}
