# AGENTS.md — src/lib/storage/

## Purpose

StorageAdapter-Interface und Implementierungen für Bild-Persistenz. Derzeit lokaler Filesystem-Adapter; S3/Cloud-Storage als Drop-in ohne Aufrufer-Anpassungen.

## Ownership

`index.ts` (Interface + Factory), `local.ts` (Filesystem-Adapter).

## Local Contracts

### Interface (`index.ts`)

```ts
interface StorageAdapter {
  saveBase64(base64: string, mime: string): Promise<SavedImage>
  readAsBase64(path: string): Promise<{ data: string; mime: string }>
  remove(path: string): Promise<void>
}
```

`SavedImage.path` ist immer ein **relativer Pfad** (relativ zum Projekt-Root / `cwd`). Dieser Pfad wird in `Image.path` in der Datenbank gespeichert.

- `getStorage()` gibt eine gecachte Instanz zurück — nie direkt instanziieren.
- **Zwingend dynamisch importieren**: `const { getStorage } = await import('#/lib/storage')` — nur innerhalb von Server-Function-Handlern. `node:fs` darf nie ins Client-Bundle.

### LocalStorageAdapter (`local.ts`)

- Speichert unter `data/images/<uuid>.<ext>` (konfigurierbar via `IMAGE_DIR` Env-Variable).
- Pfad ist relativ zu `process.cwd()` — im Dev-Server ist das der Projekt-Root.

## Work Guidance

Neuen Storage-Adapter anlegen:
1. Datei `src/lib/storage/<name>.ts` mit `StorageAdapter`-Implementierung erstellen.
2. In `getStorage()` in `index.ts` anhand einer Env-Variable auswählen.
3. Aufrufer (`src/server/generate.ts`, `src/server/images.ts`) bleiben unverändert.
