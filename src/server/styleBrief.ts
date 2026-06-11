import { createServerFn } from '@tanstack/react-start'
import { GoogleGenAI } from '@google/genai'
import { canonicalStringify } from '#/lib/canonicalJson'
import type { JsonObject, JsonValue } from '#/lib/json'
import type { ImageKind } from '#/lib/kinds/types'

// Text-Modell für die Style-Brief-Prosa (NICHT das Bildgenerierungsmodell).
// Default: gemini-2.5-flash — günstig, schnell, gut für freie Textumformung.
// Für höhere Qualität via env auf z.B. gemini-2.5-pro setzen.
const MODEL = process.env.GEMINI_BRIEF_MODEL ?? 'gemini-2.5-flash'

// Erzeugt aus dem strukturierten Stil-JSON einen menschenlesbaren Markdown-Brief
// in englischer Prosa. Abschnitte (## …) orientieren sich an den Stil-Gruppen
// (siehe src/lib/schema/fields.ts) plus Visual Style/Mood. Schlüsselbegriffe
// (Taxonomie-Werte) werden **fett** hervorgehoben; leere Felder ausgelassen.
const INSTRUCTION = `You are a photography/art director writing a concise STYLE BRIEF.

Rewrite the following structured style JSON into a human-readable Markdown brief in flowing English prose — a briefing document a client or editor could read.

Rules:
- Write in English, in connected sentences (no bullet lists, no JSON, no key:value dumps).
- Use level-2 Markdown headings (## ) for the sections that have content, in this order when present:
  ## Visual Style (overall look / mood / negative guards), ## Camera, ## Optics, ## Lighting, ## Colors, ## Post-Processing, ## Composition.
- OMIT any section whose underlying fields are empty or not set — no empty sections, no "N/A".
- Bold the key style terms taken from the JSON values (camera bodies, lenses, light qualities, color grades, framing, etc.) using **double asterisks**.
- Describe ONLY the style/aesthetic. Never invent or describe a subject/motif.
- Output ONLY the Markdown brief — no preamble, no explanation, no code fences.`

// SHA-256 über das kanonische styleJson. node:crypto dynamisch laden, damit der
// Server-only-Build nicht ins Client-Bundle leakt.
export async function hashStyleJson(styleJson: JsonObject): Promise<string> {
  const { createHash } = await import('node:crypto')
  return createHash('sha256').update(canonicalStringify(styleJson)).digest('hex')
}

// True, wenn das styleJson keinerlei nutzbaren Inhalt hat (leeres Objekt, nur
// leere Blöcke/Strings/Arrays) — dann lohnt kein LLM-Call.
function isEmptyStyle(value: JsonValue): boolean {
  if (value === null) return true
  if (typeof value === 'string') return value.trim() === ''
  if (typeof value === 'number' || typeof value === 'boolean') return false
  if (Array.isArray(value)) return value.every(isEmptyStyle)
  return Object.values(value).every(isEmptyStyle)
}

/**
 * Kern-Generator: erzeugt den Markdown-Style-Brief aus dem Stil-JSON.
 * Leerer Stil → leerer Brief (kein API-Call). Wirft bei API-/Key-Fehlern.
 */
export async function buildStyleBrief(
  styleJson: JsonObject,
  kind?: ImageKind,
): Promise<string> {
  if (isEmptyStyle(styleJson)) return ''

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY ist nicht gesetzt. Trage ihn in die .env-Datei ein (siehe .env.example).',
    )
  }
  const ai = new GoogleGenAI({ apiKey })

  const kindHint = kind ? `Image kind: ${kind}.\n\n` : ''
  const prompt = `${INSTRUCTION}\n\n${kindHint}STYLE JSON:\n${JSON.stringify(
    styleJson,
    null,
    2,
  )}`

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: 'user', parts: [{ text: prompt }] as never }],
    })
    return (response.text ?? '').trim()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(
      `Style-Brief-Generierung fehlgeschlagen: ${msg}. Bei Modell-Problemen prüfe die env-Variable GEMINI_BRIEF_MODEL (aktuell: ${MODEL}).`,
    )
  }
}

export interface CompileStyleBriefInput {
  styleJson: JsonObject
  kind?: ImageKind
}

export interface CompileStyleBriefResult {
  brief: string
}

// Client-aufrufbare Server Function (z.B. für manuelle Neugenerierung). Die
// Brief-Generierung beim Speichern läuft direkt über buildStyleBrief in styles.ts.
export const compileStyleBrief = createServerFn({ method: 'POST' })
  .validator((input: CompileStyleBriefInput) => {
    if (typeof input?.styleJson !== 'object' || input.styleJson === null) {
      throw new Error('styleJson muss ein Objekt sein.')
    }
    return input
  })
  .handler(async ({ data }): Promise<CompileStyleBriefResult> => {
    return { brief: await buildStyleBrief(data.styleJson, data.kind) }
  })
