// Kompiliert den fixierten Stil-Block (styleJson) + variables Motiv (subject)
// zu genau dem Prompt-Text, der an die Bild-API geht. Bei vorhandenen
// Referenzbildern wird eine Stil-Transfer-Anweisung vorangestellt.

import type { JsonObject } from '#/lib/json'
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
  /** serialisierter Prompt-Text (geht als text-Part an die API) */
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

/** Einleitende Anweisung, die dem kopierten JSON-Prompt vorangestellt wird. */
export const COPY_PROMPT_INSTRUCTION =
  'generate an image based on the following configuration'

/** Bringt einen kompilierten `promptText` in das Format zum Kopieren:
 *  einleitende Anweisung + Leerzeile + JSON in Markdown-Code-Fences. */
export function wrapPromptForCopy(promptText: string): string {
  return `${COPY_PROMPT_INSTRUCTION}\n\n\`\`\`json\n${promptText}\n\`\`\``
}
