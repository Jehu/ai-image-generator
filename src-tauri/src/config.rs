// Konfiguration: Env-Variablen (höchste Priorität) + config.json im
// App-Data-Verzeichnis (über die Einstellungen-UI editierbar). Die App
// liefert keine Keys mit — alles kommt zur Laufzeit aus diesen Quellen.
use std::collections::HashMap;
use std::path::{Path, PathBuf};

/// Schlüssel, die aus der Umgebung übernommen werden (Dev-Komfort; in der
/// installierten App kommt die Konfiguration normalerweise aus config.json).
const ENV_KEYS: &[&str] = &[
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
];

/// Herkunft eines Konfigurationswerts (für die Settings-UI).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ConfigSource {
    Env,
    ConfigFile,
}

#[derive(Debug, Clone)]
pub struct Config {
    file_values: HashMap<String, String>,
    env_values: HashMap<String, String>,
}

pub fn config_file_path(app_data_dir: &Path) -> PathBuf {
    app_data_dir.join("config.json")
}

impl Config {
    /// Lädt .env (Projekt-Root im Dev-Modus) und config.json aus dem
    /// App-Data-Verzeichnis. Env-Variablen überschreiben config.json.
    pub fn load(app_data_dir: &Path) -> Self {
        // Dev: .env aus cwd oder Parent (tauri dev läuft mit cwd=src-tauri).
        let _ = dotenvy::dotenv();
        let _ = dotenvy::from_path(Path::new("../.env"));

        let mut file_values: HashMap<String, String> = HashMap::new();
        if let Ok(raw) = std::fs::read_to_string(config_file_path(app_data_dir)) {
            if let Ok(serde_json::Value::Object(map)) =
                serde_json::from_str::<serde_json::Value>(&raw)
            {
                for (k, v) in map {
                    if let Some(s) = v.as_str() {
                        if !s.trim().is_empty() {
                            file_values.insert(k, s.to_string());
                        }
                    }
                }
            }
        }

        let mut env_values: HashMap<String, String> = HashMap::new();
        for key in ENV_KEYS {
            if let Ok(v) = std::env::var(key) {
                if !v.trim().is_empty() {
                    env_values.insert((*key).to_string(), v);
                }
            }
        }

        Config {
            file_values,
            env_values,
        }
    }

    pub fn get(&self, key: &str) -> Option<&str> {
        self.env_values
            .get(key)
            .or_else(|| self.file_values.get(key))
            .map(|s| s.as_str())
    }

    /// Woher der aktuell wirksame Wert stammt (Env hat Vorrang).
    pub fn source(&self, key: &str) -> Option<ConfigSource> {
        if self.env_values.contains_key(key) {
            Some(ConfigSource::Env)
        } else if self.file_values.contains_key(key) {
            Some(ConfigSource::ConfigFile)
        } else {
            None
        }
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

/// Werte in config.json setzen (`Some`) bzw. entfernen (`None`) und die Datei
/// mit restriktiven Rechten schreiben. Unbekannte vorhandene Schlüssel bleiben
/// erhalten.
pub fn update_config_file(
    app_data_dir: &Path,
    updates: &[(&str, Option<String>)],
) -> std::io::Result<()> {
    let path = config_file_path(app_data_dir);

    let mut map = match std::fs::read_to_string(&path)
        .ok()
        .and_then(|raw| serde_json::from_str::<serde_json::Value>(&raw).ok())
    {
        Some(serde_json::Value::Object(m)) => m,
        _ => serde_json::Map::new(),
    };

    for (key, value) in updates {
        match value {
            Some(v) if !v.trim().is_empty() => {
                map.insert(
                    (*key).to_string(),
                    serde_json::Value::String(v.trim().to_string()),
                );
            }
            _ => {
                map.remove(*key);
            }
        }
    }

    std::fs::create_dir_all(app_data_dir)?;
    let json = serde_json::to_string_pretty(&serde_json::Value::Object(map))
        .unwrap_or_else(|_| "{}".to_string());
    std::fs::write(&path, json)?;

    // Datei enthält Secrets — nur für den Benutzer lesbar (Unix).
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let _ = std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o600));
    }

    Ok(())
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

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_dir() -> PathBuf {
        let dir = std::env::temp_dir().join(format!("iss-config-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn update_sets_and_removes_values() {
        let dir = temp_dir();
        update_config_file(&dir, &[("OPENROUTER_API_KEY", Some("sk-test".into()))])
            .unwrap();
        let raw = std::fs::read_to_string(config_file_path(&dir)).unwrap();
        assert!(raw.contains("sk-test"));

        // Fremde Schlüssel überleben ein Update.
        update_config_file(&dir, &[("OTHER", Some("x".into()))]).unwrap();
        // Leerer Wert löscht den Schlüssel.
        update_config_file(&dir, &[("OPENROUTER_API_KEY", None)]).unwrap();
        let raw = std::fs::read_to_string(config_file_path(&dir)).unwrap();
        assert!(!raw.contains("sk-test"));
        assert!(raw.contains("OTHER"));
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn file_value_is_used_and_reported() {
        let dir = temp_dir();
        update_config_file(&dir, &[("OPENROUTER_APP_TITLE", Some("Mein Studio".into()))])
            .unwrap();
        let config = Config::load(&dir);
        assert_eq!(config.get("OPENROUTER_APP_TITLE"), Some("Mein Studio"));
        assert_eq!(
            config.source("OPENROUTER_APP_TITLE"),
            Some(ConfigSource::ConfigFile)
        );
        let _ = std::fs::remove_dir_all(&dir);
    }
}
