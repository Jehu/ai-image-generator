// Storage-Adapter-Interface. Lokaler Filesystem-Adapter jetzt; S3/Objekt-
// Storage später ohne Aufrufer-Umbau einsteckbar.
//
// WICHTIG: Nur serverseitig verwenden und stets DYNAMISCH importieren
// (`await import('#/lib/storage')`), da der lokale Adapter `node:fs` nutzt und
// sonst ins Client-Bundle leakt.

export interface SavedImage {
  /** relativer Pfad, in Image.path gespeichert */
  path: string
  mime: string
}

export interface StorageAdapter {
  saveBase64: (base64: string, mime: string) => Promise<SavedImage>
  readAsBase64: (path: string) => Promise<{ data: string; mime: string }>
  remove: (path: string) => Promise<void>
}

let cached: StorageAdapter | null = null

export async function getStorage(): Promise<StorageAdapter> {
  if (!cached) {
    const { LocalStorageAdapter } = await import('./local')
    cached = new LocalStorageAdapter()
  }
  return cached
}
