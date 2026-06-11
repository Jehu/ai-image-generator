import { createServerFn } from '@tanstack/react-start'
import { GoogleGenAI } from '@google/genai'
import { validatePhotoStyle } from '#/lib/schema/photoStyle'
import type { JsonObject } from '#/lib/json'

// Vision-/Text-Modell für die Stil-Analyse (NICHT das Bildgenerierungsmodell).
// Default: gemini-2.5-flash — stabil verfügbar, multimodal, günstig und mit
// JSON-Output. Für höhere Qualität via env auf z.B. gemini-2.5-pro setzen.
const MODEL = process.env.GEMINI_ANALYSIS_MODEL ?? 'gemini-2.5-flash'

// Anweisung an das Modell: nur fotografischen STIL extrahieren, kein Motiv.
// Das Schema (Felder + verschachtelte Keys) kompakt mitgeben, damit das
// Modell exakt die erwarteten Keys nutzt.
const INSTRUCTION = `Analysiere AUSSCHLIESSLICH den fotografischen STIL dieses Bildes — nicht das Motiv, nicht den Bildinhalt.

Beurteile die Anmutung von Kamera/Optik, Licht, Farbe/Color-Grade/Film-Emulation, Post-Processing, Komposition und Stimmung.

Gib NUR ein JSON-Objekt nach folgendem Schema zurück (keine Erklärung, kein Markdown). Setze NUR Felder, die im Bild klar erkennbar sind; lass unklare Felder weg.

{
  "type": string,
  "camera": { "body": string, "lens_mm": number, "aperture": string, "iso": number, "shutter_speed": string, "format": string },
  "optics": { "depth_of_field": string, "bokeh": string, "vignette": string, "lens_flare": boolean, "chromatic_aberration": boolean },
  "lighting": { "setup": string, "primary_source": string, "direction": string, "quality": string, "color_temperature_k": number, "fill_ratio": string },
  "color": { "palette": string[], "temperature": string, "saturation": string, "grade": string, "film_emulation": string, "contrast": string },
  "post_processing": { "grain": string, "halation": boolean, "clarity": string, "sharpening": string, "finish": string },
  "composition": { "framing": string, "angle": string, "rule_of_thirds": boolean, "negative_space": string },
  "mood": string,
  "negative": string
}

WICHTIG:
- Fülle KEIN "subject"-Feld und beschreibe NICHT das abgebildete Motiv. Nur Stil.
- Befülle "negative" mit sinnvollen Guards (z.B. unerwünschte Artefakte/Looks, die diesem Stil widersprechen).`

export interface AnalyzeStyleInput {
  imageBase64: string
  mimeType: string
}

export interface AnalyzeStyleResult {
  styleJson: JsonObject
  warnings: Array<string>
}

function validate(input: unknown): AnalyzeStyleInput {
  if (!input || typeof input !== 'object') {
    throw new Error('Ungültige Eingabe.')
  }
  const o = input as AnalyzeStyleInput
  if (typeof o.imageBase64 !== 'string' || o.imageBase64.trim() === '') {
    throw new Error('Bitte ein Bild (imageBase64) übergeben.')
  }
  if (typeof o.mimeType !== 'string' || !o.mimeType.startsWith('image/')) {
    throw new Error('mimeType muss ein Bild-MIME-Typ sein (image/...).')
  }
  return o
}

export const analyzeStyleFromImage = createServerFn({ method: 'POST' })
  .validator(validate)
  .handler(async ({ data }): Promise<AnalyzeStyleResult> => {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error(
        'GEMINI_API_KEY ist nicht gesetzt. Trage ihn in die .env-Datei ein (siehe .env.example).',
      )
    }
    const ai = new GoogleGenAI({ apiKey })

    let text: string
    try {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType: data.mimeType, data: data.imageBase64 } },
              { text: INSTRUCTION },
            ] as never,
          },
        ],
        config: { responseMimeType: 'application/json' },
      })
      text = response.text ?? ''
    } catch (err) {
      // SDK-Fehler (z.B. unbekanntes Modell, ungültiger Key) verständlich mappen.
      const msg = err instanceof Error ? err.message : String(err)
      throw new Error(
        `Stil-Analyse fehlgeschlagen: ${msg}. Bei Modell-Problemen prüfe die env-Variable GEMINI_ANALYSIS_MODEL (aktuell: ${MODEL}).`,
      )
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      throw new Error('Antwort des Modells war kein gültiges JSON.')
    }

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('Antwort des Modells war kein JSON-Objekt.')
    }

    // Nur Stil zurückgeben: ein versehentlich gesetztes "subject" entfernen.
    const obj = parsed as Record<string, unknown>
    if ('subject' in obj) {
      delete obj.subject
    }

    // Tolerant validieren: bei Problemen nicht abbrechen, sondern als
    // warnings zurückgeben (looseObject-Schema, Nutzer kann nachbessern).
    const validation = validatePhotoStyle(obj)

    return {
      styleJson: obj as JsonObject,
      warnings: validation.ok ? [] : validation.issues,
    }
  })
