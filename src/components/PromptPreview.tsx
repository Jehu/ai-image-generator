import { useMemo, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { compilePrompt, wrapPromptForCopy } from '#/lib/prompt/compile'
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
  const promptText = useMemo(
    () =>
      compilePrompt({
        styleJson,
        subject: subject.trim() || '<dein Motiv hier>',
        hasReferences,
        kind,
      }).promptText,
    [styleJson, subject, hasReferences, kind],
  )

  const [copied, setCopied] = useState(false)

  async function copy() {
    if (await copyText(wrapPromptForCopy(promptText))) {
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
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-md border bg-background p-3 text-xs">
          {promptText}
        </pre>
        <p className="text-muted-foreground mt-2 text-xs">
          Diesen Text z.B. direkt in aistudio.google.com (Gemini) einfügen.
          {hasReferences
            ? ' Die Stil-Anker-Bilder dort separat als Referenz anhängen.'
            : ''}
        </p>
      </div>
    </details>
  )
}
