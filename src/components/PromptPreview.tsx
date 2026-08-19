import { useMemo, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import {
  compilePrompt,
  renderPromptAsText,
  wrapPromptForCopy,
} from '#/lib/prompt/compile'
import { copyText } from '#/lib/clipboard'
import type { JsonObject } from '#/lib/json'
import type { ImageKind } from '#/lib/kinds'

/** Zeigt den fertig kompilierten Prompt (Stil + Motiv) live an und macht ihn
 *  kopierbar — z.B. zur externen Nutzung in aistudio.google.com. */
export function PromptPreview({
  styleJson,
  subject,
  hasReferences = false,
  kind,
  defaultOpen = false,
}: {
  styleJson: JsonObject
  subject: string
  hasReferences?: boolean
  kind?: ImageKind
  defaultOpen?: boolean
}) {
  const compiled = useMemo(
    () =>
      compilePrompt({
        styleJson,
        subject: subject.trim() || '<dein Motiv hier>',
        hasReferences,
        kind,
      }),
    [styleJson, subject, hasReferences, kind],
  )
  const [format, setFormat] = useState<'json' | 'text'>('json')
  const previewText =
    format === 'json'
      ? compiled.promptText
      : renderPromptAsText(compiled.promptObject)

  const [copied, setCopied] = useState(false)

  async function copy() {
    const textToCopy =
      format === 'json' ? wrapPromptForCopy(compiled.promptText) : previewText
    if (await copyText(textToCopy)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }

  return (
    <details
      open={defaultOpen}
      className="rounded-md border bg-muted/30 text-sm"
    >
      <summary className="flex cursor-pointer items-center justify-between gap-2 px-3 py-2 font-medium">
        <span>Fertiger Prompt</span>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            copy()
          }}
          className="inline-flex items-center gap-1 rounded border bg-background px-2 py-1 text-xs font-medium"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" /> Kopiert
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" /> Kopieren
            </>
          )}
        </button>
      </summary>
      <div className="px-3 pb-3">
        <div className="mb-2 inline-flex rounded border bg-background p-0.5 text-xs">
          <button
            type="button"
            aria-pressed={format === 'json'}
            onClick={() => setFormat('json')}
            className={`rounded px-2 py-1 font-medium ${format === 'json' ? 'bg-muted' : 'text-muted-foreground'}`}
          >
            JSON
          </button>
          <button
            type="button"
            aria-pressed={format === 'text'}
            onClick={() => setFormat('text')}
            className={`rounded px-2 py-1 font-medium ${format === 'text' ? 'bg-muted' : 'text-muted-foreground'}`}
          >
            Klartext
          </button>
        </div>
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-md border bg-background p-3 text-xs">
          {previewText}
        </pre>
        <p className="text-muted-foreground mt-2 text-xs">
          {format === 'json'
            ? 'Diesen JSON-Prompt z.B. direkt in aistudio.google.com (Gemini) einfügen.'
            : 'Dieser Klartext wird an Bildmodelle gesendet und kann direkt kopiert werden.'}
          {hasReferences
            ? ' Die Stil-Anker-Bilder dort separat als Referenz anhängen.'
            : ''}
        </p>
      </div>
    </details>
  )
}
