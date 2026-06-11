// First-run-Migration: übernimmt eine bestehende Web-App-Datenbank (dev.db)
// und das Bilder-Verzeichnis in das App-Data-Verzeichnis. Idempotent: läuft
// nur, wenn die Ziel-DB noch nicht existiert; eine Marker-Datei verhindert
// Wiederholungen.
use std::path::{Path, PathBuf};

use crate::config::{Config, Paths};

/// Kandidaten für eine Legacy-Datenquelle (Web-App-Layout).
fn legacy_candidates(config: &Config) -> Vec<PathBuf> {
    let mut out = Vec::new();
    if let Some(dir) = config.get("LEGACY_DATA_DIR") {
        out.push(PathBuf::from(dir));
    }
    // tauri dev läuft mit cwd=src-tauri, das Bundle mit beliebigem cwd —
    // beide Projektlayout-Varianten prüfen.
    out.push(PathBuf::from("."));
    out.push(PathBuf::from(".."));
    out
}

fn copy_dir_recursive(src: &Path, dst: &Path) -> std::io::Result<u64> {
    std::fs::create_dir_all(dst)?;
    let mut copied = 0;
    for entry in std::fs::read_dir(src)? {
        let entry = entry?;
        let target = dst.join(entry.file_name());
        if entry.file_type()?.is_dir() {
            copied += copy_dir_recursive(&entry.path(), &target)?;
        } else if !target.exists() {
            std::fs::copy(entry.path(), &target)?;
            copied += 1;
        }
    }
    Ok(copied)
}

/// Führt die Migration aus (best-effort, blockiert den App-Start nie).
pub fn run(config: &Config, paths: &Paths) {
    let marker = paths.app_data_dir.join(".legacy-migration-done");
    if marker.exists() || paths.db_path.exists() {
        return;
    }

    for base in legacy_candidates(config) {
        let legacy_db = base.join("prisma").join("data").join("dev.db");
        if !legacy_db.exists() {
            continue;
        }

        // DB kopieren (inkl. WAL/SHM, falls vorhanden).
        if let Some(parent) = paths.db_path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }
        match std::fs::copy(&legacy_db, &paths.db_path) {
            Ok(_) => eprintln!(
                "Legacy-DB übernommen: {} → {}",
                legacy_db.display(),
                paths.db_path.display()
            ),
            Err(e) => {
                eprintln!("Legacy-DB-Migration fehlgeschlagen: {e}");
                continue;
            }
        }

        // Bilder kopieren (Web-App-Default: data/images).
        let legacy_images = base.join("data").join("images");
        if legacy_images.is_dir() {
            match copy_dir_recursive(&legacy_images, &paths.image_dir) {
                Ok(n) => eprintln!("{n} Bilddatei(en) übernommen."),
                Err(e) => eprintln!("Bilder-Migration unvollständig: {e}"),
            }
        }
        break;
    }

    let _ = std::fs::create_dir_all(&paths.app_data_dir);
    let _ = std::fs::write(&marker, "done");
}
