// Globaler App-State für alle Tauri-Commands.
use std::sync::Mutex;

use rusqlite::Connection;
use tokio::sync::Mutex as AsyncMutex;

use crate::config::{Config, Paths};
use crate::provider::PriceCache;
use crate::storage::LocalStorage;

pub struct AppState {
    pub config: Config,
    pub paths: Paths,
    /// rusqlite ist synchron — Guard nie über ein .await halten.
    pub db: Mutex<Connection>,
    pub http: reqwest::Client,
    pub price_cache: AsyncMutex<Option<PriceCache>>,
}

impl AppState {
    pub fn storage(&self) -> LocalStorage {
        LocalStorage::new(&self.paths.image_dir)
    }
}
