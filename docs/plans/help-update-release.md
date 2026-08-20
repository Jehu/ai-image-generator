---
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
execution: code
---

# Hilfe, Versionsanzeige und manuelle Updates

## Ziel
Eine Hilfe-Seite zeigt die installierte App-Version und erlaubt eine manuelle Update-Prüfung. Die bestehende Start-Prüfung bleibt erhalten. Anschließend entsteht Release 0.2.3.

## Anforderungen
- Navigation enthält „Hilfe“.
- Hilfe zeigt die aus dem Tauri-Backend gelesene Paketversion.
- „Nach Updates suchen“ verwendet den bestehenden signierten Tauri-Updater.
- Die Seite meldet eindeutig: Update verfügbar/installiert, bereits aktuell oder Prüfung fehlgeschlagen.
- Die Start-Prüfung fragt weiterhin nur bei verfügbarem Update nach.

## Technische Entscheidungen
1. `src/lib/updates.ts` bündelt die Updater-Interaktion. Das verhindert abweichendes Verhalten von Start- und manueller Prüfung.
2. Ein `app_version`-Tauri-Command liefert die Cargo-Paketversion über `src/ipc/app.ts`; Komponenten greifen nicht direkt auf `invoke` zu.
3. `src/routes/help.tsx` ist eine eigene Route, damit „Hilfe“ ein klarer, erreichbarer Bereich bleibt.

## Umsetzungseinheiten
### U1: Wiederverwendbare Update-Prüfung
- Dateien: `src/lib/updates.ts`, `src/lib/updates.test.ts`, `src/main.tsx`
- Testfälle: kein Update, Update ablehnen, Update installieren und Neustart, Fehlerstatus.

### U2: App-Version und Hilfe-Seite
- Dateien: `src-tauri/src/commands/misc.rs`, `src-tauri/src/lib.rs`, `src/ipc/app.ts`, `src/routes/help.tsx`, `src/routes/__root.tsx`
- Testfälle: IPC-Adapter ruft `app_version` mit korrektem Command auf; Hilfe zeigt Version und Zustände der manuellen Prüfung.

### U3: Patch-Release
- Dateien: `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`, `src-tauri/tauri.conf.json`
- Verifikation: Frontend-Tests, Rust-Tests, signierter Tauri-Build, installierte Bundle-Version.

## Definition of Done
Die Hilfe-Seite zeigt Version und einen funktionierenden Update-Button. Die Start-Prüfung bleibt aktiv. Das signierte 0.2.3-Bundle ist gebaut und lokal installiert.
