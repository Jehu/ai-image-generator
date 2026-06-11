import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { copyText } from '#/lib/clipboard'
import { wrapPromptForCopy } from '#/lib/prompt/compile'
import { Lightbox } from './Lightbox'

export interface ResultImage {
  dataUrl: string
  mimeType: string
}

function CopyPromptButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        copyText(wrapPromptForCopy(text)).then((ok) => {
          if (ok) {
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          }
        })
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
  )
}

export function ResultGrid({
  images,
  promptText,
  costUsd,
  onSetAnchor,
}: {
  images: Array<ResultImage>
  promptText?: string
  costUsd?: number
  /** wenn gesetzt: Button „Als Anker" pro Bild */
  onSetAnchor?: (dataUrl: string) => void
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">Ergebnisse</h2>
        {costUsd !== undefined && (
          <span className="text-muted-foreground text-xs">~${costUsd.toFixed(3)}</span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {images.map((img, i) => (
          <div key={i} className="group relative overflow-hidden rounded-md border">
            <button
              type="button"
              onClick={() => setLightboxIndex(i)}
              className="block w-full cursor-pointer transition hover:opacity-90"
              title="Klicken zum Vergrößern"
            >
              <img
                src={img.dataUrl}
                alt={`Variante ${i + 1}`}
                className="h-full w-full object-cover"
              />
            </button>
            {onSetAnchor && (
              <button
                onClick={() => onSetAnchor(img.dataUrl)}
                className="absolute bottom-2 right-2 hidden rounded bg-black/70 px-2 py-1 text-xs font-medium text-white group-hover:block"
                title="Dieses Bild als Stil-Anker setzen"
              >
                Als Anker
              </button>
            )}
          </div>
        ))}
      </div>
      {promptText && (
        <details className="text-xs">
          <summary className="text-muted-foreground flex cursor-pointer items-center justify-between gap-2">
            <span>Gesendeter Prompt</span>
            <CopyPromptButton text={promptText} />
          </summary>
          <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-md border bg-muted p-3">
            {promptText}
          </pre>
        </details>
      )}
      {lightboxIndex !== null && (
        <Lightbox
          images={images}
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  )
}
