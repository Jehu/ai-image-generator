// Client/Browser-Only Export-Utilities: ZIP-Download von Bildern und
// JSON-Im-/Export von Stilen. Nutzt window/document/Blob/URL/File — KEINE
// Node-Module. Nur in React-Komponenten verwenden.
import JSZip from 'jszip'

import { parseDataUrl } from '#/lib/fileToDataUrl'
import type { JsonObject } from '#/lib/json'

/** "Mein Cooler Stil!" -> "mein-cooler-stil". Leerstring-fallback "export". */
export function slugify(input: string): string {
  const slug = input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // Diakritika entfernen
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // alles außer [a-z0-9] -> '-'
    .replace(/-+/g, '-') // mehrfach-'-' zusammenfassen
    .replace(/^-+|-+$/g, '') // führende/abschließende '-' trimmen
  return slug || 'export'
}

export interface ExportImage {
  dataUrl: string // "data:image/png;base64,...."
  filename: string // z.B. "barista-1.png" (inkl. Endung)
}

/** Erzeugt ObjectURL, klickt unsichtbaren <a download>, gibt URL danach frei. */
function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  // Aufräumen erst im nächsten Tick: ein synchrones revokeObjectURL kann den
  // gerade gestarteten Download großer Blobs abbrechen.
  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 0)
}

/**
 * Lädt eine (ggf. mehrere MB große) Data-URL zuverlässig herunter, indem sie
 * in einen Blob umgewandelt wird. Der native `download` auf
 * `<a href="data:...">` ist bei großen Bildern (2K/4K) unzuverlässig — Browser
 * ignorieren oder blockieren übergroße data:-URLs teilweise.
 */
export function downloadDataUrl(dataUrl: string, filename: string): void {
  const { mimeType, base64 } = parseDataUrl(dataUrl)
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  triggerDownload(new Blob([bytes], { type: mimeType }), filename)
}

/** Packt die Bilder als ZIP und triggert den Browser-Download (<zipBasename>.zip). */
export async function downloadImagesAsZip(
  images: Array<ExportImage>,
  zipBasename: string,
): Promise<void> {
  if (images.length === 0) return // leeres Array: nichts tun

  const zip = new JSZip()
  const used = new Set<string>()

  for (const image of images) {
    // base64-Teil nach dem Komma extrahieren
    const commaIndex = image.dataUrl.indexOf(',')
    const base64 = commaIndex >= 0 ? image.dataUrl.slice(commaIndex + 1) : image.dataUrl

    // Bei doppelten filenames Zähler-Suffix anhängen
    let filename = image.filename
    if (used.has(filename)) {
      const dotIndex = filename.lastIndexOf('.')
      const base = dotIndex >= 0 ? filename.slice(0, dotIndex) : filename
      const ext = dotIndex >= 0 ? filename.slice(dotIndex) : ''
      let counter = 1
      do {
        filename = `${base}-${counter}${ext}`
        counter += 1
      } while (used.has(filename))
    }
    used.add(filename)

    zip.file(filename, base64, { base64: true })
  }

  const blob = await zip.generateAsync({ type: 'blob' })
  triggerDownload(blob, slugify(zipBasename) + '.zip')
}

export interface StyleExport {
  name: string
  tags: Array<string>
  styleJson: JsonObject
  defaultParams: JsonObject
  kind?: string
}

/** Lädt den Stil als <slug>.json herunter. */
export function downloadStyleAsJson(style: StyleExport): void {
  const blob = new Blob([JSON.stringify(style, null, 2)], {
    type: 'application/json',
  })
  triggerDownload(blob, slugify(style.name) + '.json')
}

/** Lädt den Style-Brief als <slug>.md herunter. */
export function downloadStyleBriefAsMarkdown(
  name: string,
  brief: string,
): void {
  const blob = new Blob([brief], { type: 'text/markdown;charset=utf-8' })
  triggerDownload(blob, slugify(name) + '.md')
}

/** Liest eine importierte .json-Datei und validiert die Grundstruktur. Wirft bei Fehlern. */
export async function readStyleImport(file: File): Promise<StyleExport> {
  let parsed: unknown
  try {
    parsed = JSON.parse(await file.text())
  } catch {
    throw new Error('Ungültige Stil-Datei: kein gültiges JSON')
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Ungültige Stil-Datei: erwartet wird ein Objekt')
  }

  const obj = parsed as Record<string, unknown>

  if (typeof obj.name !== 'string' || obj.name.length === 0) {
    throw new Error('Ungültige Stil-Datei: name fehlt oder ist leer')
  }

  if (typeof obj.styleJson !== 'object' || obj.styleJson === null) {
    throw new Error('Ungültige Stil-Datei: styleJson fehlt oder ist kein Objekt')
  }

  const tags =
    obj.tags === undefined ? [] : (obj.tags as Array<string>)
  const defaultParams =
    obj.defaultParams === undefined ? {} : (obj.defaultParams as JsonObject)

  const result: StyleExport = {
    name: obj.name,
    tags,
    styleJson: obj.styleJson as JsonObject,
    defaultParams,
  }

  if (typeof obj.kind === 'string') {
    result.kind = obj.kind
  }

  return result
}
