/** Liest eine Browser-File als Data-URL (base64). Client-only (FileReader). */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/** Zerlegt eine Data-URL in MIME-Typ und reinen base64-Teil. Wirft bei ungültiger Data-URL. */
export function parseDataUrl(dataUrl: string): { mimeType: string; base64: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.*)$/s)
  if (!match) throw new Error('Ungültige Data-URL.')
  return { mimeType: match[1], base64: match[2] }
}
