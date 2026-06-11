// Konfiguration: Env-Variablen (höchste Priorität) + optionale config.json im
// App-Data-Verzeichnis. Deckt dieselben Variablen ab wie die Web-App
// (.env.example), plus OpenRouter-Modelle für Analyse/Brief.
use std::collections::HashMap;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone)]
pub struct Config {
    values: HashMap<String, String>,
}

impl Config {
    /// Lädt .env (Projekt-Root im Dev-Modus) und config.json aus dem
    /// App-Data-Verzeichnis. Env-Variablen überschreiben config.json.
    pub fn load(app_data_dir: &Path) -> Self {
        // Dev: .env aus cwd oder Parent (tauri dev läuft mit cwd=src-tauri).
        let _ = dotenvy::dotenv();
        let _ = dotenvy::from_path(Path::new("../.env"));

        let mut values: HashMap<String, String> = HashMap::new();

        // config.json: flaches String-Objekt { "OPENROUTER_API_KEY": "...", ... }
        let config_path = app_data_dir.join("config.json");
        if let Ok(raw) = std::fs::read_to_string(&config_path) {
            if let Ok(serde_json::Value::Object(map)) =
                serde_json::from_str::<serde_json::Value>(&raw)
            {
                for (k, v) in map {
                    if let Some(s) = v.as_str() {
                        values.insert(k, s.to_string());
                    }
                }
            }
        }

        // Env überschreibt config.json.
        for key in [
            "GEMINI_API_KEY",
            "OPENAI_API_KEY",
            "OPENROUTER_API_KEY",
            "OPENROUTER_HTTP_REFERER",
            "OPENROUTER_APP_TITLE",
            "OPENROUTER_ANALYSIS_MODEL",
            "OPENROUTER_BRIEF_MODEL",
            "IMAGE_DIR",
            "DATABASE_URL",
            "LEGACY_DATA_DIR",
        ] {
            if let Ok(v) = std::env::var(key) {
                if !v.trim().is_empty() {
                    values.insert(key.to_string(), v);
                }
            }
        }

        Config { values }
    }

    pub fn get(&self, key: &str) -> Option<&str> {
        self.values.get(key).map(|s| s.as_str())
    }

    pub fn openrouter_api_key(&self) -> Option<&str> {
        self.get("OPENROUTER_API_KEY").filter(|s| !s.trim().is_empty())
    }

    /// Vision-Modell für die Stil-Analyse (über OpenRouter).
    pub fn analysis_model(&self) -> &str {
        self.get("OPENROUTER_ANALYSIS_MODEL")
            .unwrap_or("google/gemini-2.5-flash")
    }

    /// Text-Modell für den Markdown-Style-Brief (über OpenRouter).
    pub fn brief_model(&self) -> &str {
        self.get("OPENROUTER_BRIEF_MODEL")
            .unwrap_or("google/gemini-2.5-flash")
    }
}

/// Aufgelöste Pfade der App (DB-Datei, Bilder-Verzeichnis).
#[derive(Debug, Clone)]
pub struct Paths {
    pub app_data_dir: PathBuf,
    pub db_path: PathBuf,
    pub image_dir: PathBuf,
}

impl Paths {
    pub fn resolve(app_data_dir: PathBuf, config: &Config) -> Self {
        // DATABASE_URL="file:./pfad/zur.db" (Web-App-Konvention) wird unterstützt.
        let db_path = match config.get("DATABASE_URL") {
            Some(url) => {
                let p = url.strip_prefix("file:").unwrap_or(url);
                PathBuf::from(p)
            }
            None => app_data_dir.join("data").join("app.db"),
        };
        let image_dir = match config.get("IMAGE_DIR") {
            Some(dir) => PathBuf::from(dir),
            None => app_data_dir.join("data").join("images"),
        };
        Paths {
            app_data_dir,
            db_path,
            image_dir,
        }
    }
}
