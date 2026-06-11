// App-weiter Fehlertyp. Tauri serialisiert den Fehler als String an das
// Frontend — die deutschen Fehlermeldungen entsprechen exakt denen der
// früheren Server Functions, damit die UI-Fehleranzeigen unverändert passen.
use serde::Serializer;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("{0}")]
    Msg(String),

    #[error("Datenbankfehler: {0}")]
    Db(#[from] rusqlite::Error),

    #[error("Netzwerkfehler: {0}")]
    Http(#[from] reqwest::Error),

    #[error("Dateisystemfehler: {0}")]
    Io(#[from] std::io::Error),

    #[error("JSON-Fehler: {0}")]
    Json(#[from] serde_json::Error),
}

impl AppError {
    pub fn msg(s: impl Into<String>) -> Self {
        AppError::Msg(s.into())
    }
}

impl serde::Serialize for AppError {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.to_string())
    }
}

pub type AppResult<T> = Result<T, AppError>;
