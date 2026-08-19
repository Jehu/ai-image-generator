// Kompiliert den fixierten Stil-Block (styleJson) + variables Motiv (subject)
// zu genau dem Prompt-Text, der an die Bild-API geht. Bei vorhandenen
// Referenzbildern wird eine Stil-Transfer-Anweisung vorangestellt.

import type { JsonObject, JsonValue } from '#/lib/json'
import type { ImageKind } from '#/lib/kinds/types'

export interface CompileInput {
  /** fixierter Parameter-Block ohne subject */
  styleJson: JsonObject
  /** das variable Motiv */
  subject: string
  /** ob Referenzbilder mitgeschickt werden */
  hasReferences?: boolean
  /** Bildart — steuert bildartspezifische Prompt-Hinweise (z.B. Text-Rendering). */
  kind?: ImageKind
}

export interface CompileOutput {
  /** strukturiertes Prompt-Objekt (für Speicherung/Reproduzierbarkeit) */
  promptObject: JsonObject
  /** serialisierter Prompt für Anzeige, Kopieren und reproduzierbare Historie */
  promptText: string
}

const STYLE_REFERENCE_INSTRUCTION =
  'Use the photographic style, lighting, color grading, and overall look from the provided reference image(s). Keep the visual style perfectly consistent; only change the subject as described below.'

// Infografiken leben von scharfem, korrekt geschriebenem Text — Nano Banana Pro
// rendert Text gut, profitiert aber von einem expliziten Hinweis.
const INFOGRAPHIC_TEXT_INSTRUCTION =
  'Render all text, labels, numbers and typographic elements crisply and legibly with correct spelling. Maintain a clear visual hierarchy and a clean, aligned layout.'

export function compilePrompt(input: CompileInput): CompileOutput {
  const { styleJson, subject, hasReferences = false, kind } = input

  const promptObject: JsonObject = {
    ...(hasReferences ? { style_reference: STYLE_REFERENCE_INSTRUCTION } : {}),
    ...(kind === 'infografik'
      ? { text_rendering: INFOGRAPHIC_TEXT_INSTRUCTION }
      : {}),
    ...styleJson,
    subject,
  }

  return {
    promptObject,
    promptText: JSON.stringify(promptObject, null, 2),
  }
}

/** Rendert den kanonischen Prompt für Bildmodelle ohne zuverlässige JSON-Prompt-Unterstützung. */
export function renderPromptAsText(promptObject: JsonObject): string {
  const subject =
    typeof promptObject.subject === 'string' ? promptObject.subject : 'the requested subject'
  const requirements = Object.entries(promptObject).filter(
    ([key, value]) => key !== 'subject' && value !== null,
  )
  let text = `Create an image of ${subject}.`

  if (requirements.length > 0) {
    text += '\n\nStyle requirements:\n'
    for (const [key, value] of requirements) {
      text = renderRequirement(text, key, value, 0)
    }
    text = text.trimEnd()
  }

  return text
}

function renderRequirement(text: string, key: string, value: JsonValue, indent: number): string {
  const prefix = `${' '.repeat(indent)}- ${humanLabel(key)}`
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return `${text}${prefix}: ${value}\n`
  }
  if (Array.isArray(value)) {
    text += `${prefix}:\n`
    for (const item of value) {
      if (item === null) continue
      if (typeof item === 'object' && !Array.isArray(item)) {
        text += `${' '.repeat(indent + 2)}-\n`
        for (const [nestedKey, nestedValue] of Object.entries(item)) {
          if (nestedValue !== null) {
            text = renderRequirement(text, nestedKey, nestedValue, indent + 4)
          }
        }
      } else if (Array.isArray(item)) {
        text = renderRequirement(text, 'item', item, indent + 2)
      } else {
        text += `${' '.repeat(indent + 2)}- ${item}\n`
      }
    }
    return text
  }
  if (value === null) return text

  text += `${prefix}:\n`
  for (const [nestedKey, nestedValue] of Object.entries(value)) {
    if (nestedValue !== null) {
      text = renderRequirement(text, nestedKey, nestedValue, indent + 2)
    }
  }
  return text
}

function humanLabel(key: string): string {
  const label = key.replaceAll('_', ' ')
  return label === '' ? label : `${label[0].toUpperCase()}${label.slice(1)}`
}

/** Einleitende Anweisung, die dem kopierten JSON-Prompt vorangestellt wird. */
export const COPY_PROMPT_INSTRUCTION =
  'generate an image based on the following configuration'

/** Bringt einen kompilierten `promptText` in das Format zum Kopieren:
 *  einleitende Anweisung + Leerzeile + JSON in Markdown-Code-Fences. */
export function wrapPromptForCopy(promptText: string): string {
  return `${COPY_PROMPT_INSTRUCTION}\n\n\`\`\`json\n${promptText}\n\`\`\``
}
