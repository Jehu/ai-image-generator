# AGENTS.md — src/routes/

## Purpose

Dateibasiertes Routing via TanStack Router. Jede Datei hier entspricht einer Route. Die Route-Komponenten halten den UI-State und orchestrieren IPC-Adapter (`#/ipc/`) via TanStack Query.

## Ownership

Alle Routen-Dateien in diesem Verzeichnis. `src/routeTree.gen.ts` (eine Ebene höher) gehört dem Router-Codegenerator.

## Local Contracts

- **`routeTree.gen.ts` nie anfassen** — wird von `npm run generate-routes` (bzw. automatisch im Dev-Server) neu erzeugt. Manuelle Änderungen werden überschrieben.
- Namenskonvention: `segment.index.tsx` für Index-Routes, `segment.$param.tsx` für parametrisierte Routes.
- Routen-Komponenten importieren IPC-Adapter aus `#/ipc/` und rufen sie ausschließlich über TanStack Query (`useQuery` / `useMutation`) auf — kein direkter `await` auf Top-Level.
- Kein direkter `invoke`-Aufruf in Routen-Dateien; Backend-Zugriff bleibt in `src/ipc/`.

## Routen-Übersicht

| Datei | Route | Funktion |
|---|---|---|
| `__root.tsx` | Layout-Wrapper | Globales Shell-Layout, TanStack Devtools |
| `index.tsx` | `/` | Playground — freies Experimentieren mit Stil + Motiv |
| `styles.index.tsx` | `/styles` | Stil-Bibliothek — Liste gespeicherter Stile |
| `styles.$id.tsx` | `/styles/:id` | Stil-Detail — Bearbeiten, Anker verwalten, Produktion |
| `settings.tsx` | `/settings` | Einstellungen — Kamera-Bodies verwalten |

## Work Guidance

- Neue Route = neue Datei; danach `npm run generate-routes` oder Dev-Server neu starten.
- Geteilter UI-State (z. B. aktiver Stil-Filter) über TanStack Router Search Params, nicht über globalen Zustand.
