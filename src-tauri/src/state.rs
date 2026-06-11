// Globaler App-State für alle Tauri-Commands.
use std::sync::{Mutex, RwLock};

use rusqlite::Connection;
use tokio::sync::Mutex as AsyncMutex;

use crate::config::{Config, Paths};
use crate::provider::PriceCache;
use crate::storage::LocalStorage;

pub struct AppState {
    /// Zur Laufzeit austauschbar (Settings-UI schreibt config.json und lädt neu).
    config: RwLock<Config>,
    pub paths: Paths,
    /// rusqlite ist synchron — Guard nie über ein .await halten.
    pub db: Mutex<Connection>,
    pub http: reqwest::Client,
    pub price_cache: AsyncMutex<Option<PriceCache>>,
}

impl AppState {
    pub fn new(
        config: Config,
        paths: Paths,
        db: Connection,
        http: reqwest::Client,
    ) -> Self {
        AppState {
            config: RwLock::new(config),
            paths,
            db: Mutex::new(db),
            http,
            price_cache: AsyncMutex::new(None),
        }
    }

    /// Snapshot der aktuellen Konfiguration (Config ist klein, Clone ist billig).
    /// Commands arbeiten mit dem Snapshot, damit kein Lock über `.await` lebt.
    pub fn config(&self) -> Config {
        self.config.read().unwrap().clone()
    }

    /// Konfiguration neu laden (nach Änderungen an config.json).
    pub fn reload_config(&self) {
        let fresh = Config::load(&self.paths.app_data_dir);
        *self.config.write().unwrap() = fresh;
    }

    pub fn storage(&self) -> LocalStorage {
        LocalStorage::new(&self.paths.image_dir)
    }
}
