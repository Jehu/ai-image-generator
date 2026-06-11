import { createFileRoute } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { generateImage } from '#/ipc/generate'
import { analyzeStyleFromImage } from '#/ipc/analyze'
import { fileToDataUrl, parseDataUrl } from '#/lib/fileToDataUrl'
import { StyleEditor } from '#/components/StyleEditor'
import { ResultGrid } from '#/components/ResultGrid'
import { PromptPreview } from '#/components/PromptPreview'
import { PresetPicker } from '#/components/PresetPicker'
import { SaveStyleDialog } from '#/components/SaveStyleDialog'
import { ModelPicker } from '#/components/ModelPicker'
import { getKind, KIND_LIST } from '#/lib/kinds'
import type { ImageKind } from '#/lib/kinds'
import type { JsonObject } from '#/lib/json'
import type {
  AspectRatio,
  ImageSize,
  ThinkingLevelOpt,
} from '#/lib/providers/types'

export const Route = createFileRoute('/')({ component: Playground })

const ASPECT_RATIOS: Array<AspectRatio> = [
  '1:1',
  '4:5',
  '3:4',
  '2:3',
  '3:2',
  '4:3',
  '16:9',
  '9:16',
  '21:9',
]
const IMAGE_SIZES: Array<ImageSize> = ['1K', '2K', '4K']
const THINKING_LEVELS: Array<ThinkingLevelOpt> = ['minimal', 'low', 'medium', 'high']

function Playground() {
  const [kind, setKind] = useState<ImageKind>('foto')
  const [style, setStyle] = useState<JsonObject>(
    () => getKind('foto').defaultStyle,
  )
  const [subject, setSubject] = useState(() => getKind('foto').exampleSubject)
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('4:5')
  const [imageSize, setImageSize] = useState<ImageSize>('2K')
  const [count, setCount] = useState(2)
  const [thinkingLevel, setThinkingLevel] = useState<ThinkingLevelOpt>('high')
  const [provider, setProvider] = useState('openrouter')
  const [modelId, setModelId] = useState('google/gemini-3-pro-image-preview')
  const [saveOpen, setSaveOpen] = useState(false)
  const analyzeFileRef = useRef<HTMLInputElement>(null)
  // Feedback nach "Stil aus Bild ableiten": Ring-Flash am Editor + Banner.
  const [flashing, setFlashing] = useState(false)
  const [analysisDone, setAnalysisDone] = useState<{ fields: number } | null>(null)
  const doneTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const mutation = useMutation({
    mutationFn: (vars: Parameters<typeof generateImage>[0]['data']) =>
      generateImage({ data: vars }),
  })

  const analyze = useMutation({
    mutationFn: async (file: File) => {
      const dataUrl = await fileToDataUrl(file)
      const { mimeType, base64 } = parseDataUrl(dataUrl)
      return analyzeStyleFromImage({ data: { imageBase64: base64, mimeType } })
    },
    onSuccess: (res) => {
      setStyle(res.styleJson)
      // Editor-Flash neu auslösen (false→true, Reset via onAnimationEnd).
      setFlashing(false)
      requestAnimationFrame(() => setFlashing(true))
      // Erfolgs-Banner zeigen und nach kurzer Zeit automatisch ausblenden.
      setAnalysisDone({ fields: Object.keys(res.styleJson).length })
      if (doneTimer.current) clearTimeout(doneTimer.current)
      doneTimer.current = setTimeout(() => setAnalysisDone(null), 5000)
    },
  })

  // Bildart wechseln: Default-Stil + passendes Beispiel-Motiv der neuen Bildart
  // laden (überschreibt den Editor-Inhalt — die Schemata sind nicht kompatibel).
  function handleKindChange(next: ImageKind) {
    if (next === kind) return
    const def = getKind(next)
    setKind(next)
    setStyle(def.defaultStyle)
    setSubject(def.exampleSubject)
  }

  function handleGenerate() {
    mutation.mutate({
      styleJson: style,
      subject,
      provider,
      modelId,
      kind,
      params: { aspectRatio, imageSize, count, thinkingLevel },
    })
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Image Style Studio</h1>
        <p className="text-muted-foreground text-sm">
          Playground — Stil + Motiv testen (Gemini 3 Pro Image)
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Linke Spalte: Editor */}
        <div className="flex min-w-0 flex-col gap-4">
          {/* Bildart-Auswahl */}
          <div>
            <label className="mb-1 block text-sm font-medium">Bildart</label>
            <div className="flex gap-1 rounded-md border bg-muted/40 p-1">
              {KIND_LIST.map((k) => (
                <button
                  key={k.kind}
                  type="button"
                  onClick={() => handleKindChange(k.kind)}
                  title={k.description}
                  className={`flex-1 rounded px-3 py-1.5 text-sm font-medium ${
                    kind === k.kind
                      ? 'bg-background shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {k.label}
                </button>
              ))}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              {getKind(kind).description}
            </p>
          </div>

          <PresetPicker
            kind={kind}
            onApply={(preset) => {
              setStyle(preset.styleJson)
              if (preset.params?.aspectRatio) setAspectRatio(preset.params.aspectRatio)
              if (preset.params?.imageSize) setImageSize(preset.params.imageSize)
              if (preset.params?.thinkingLevel)
                setThinkingLevel(preset.params.thinkingLevel)
            }}
          />

          {/* Stil aus Bild ableiten — nur Foto (Analyse liefert ein Foto-Schema). */}
          {kind === 'foto' && (
          <>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <input
                ref={analyzeFileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) analyze.mutate(file)
                  e.target.value = ''
                }}
              />
              <button
                onClick={() => analyzeFileRef.current?.click()}
                disabled={analyze.isPending}
                className="rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-50"
                title="Fotografischen Stil aus einem Bild ableiten"
              >
                {analyze.isPending ? 'Analysiere Bild…' : 'Stil aus Bild ableiten'}
              </button>
            </div>
            <p className="text-muted-foreground text-xs">
              Analyse kostet Tokens (Bild-Input + JSON-Output) — grob wenige Cents
              pro Analyse.
            </p>
            {analyze.isError && (
              <p className="text-sm text-red-600">
                Fehler: {(analyze.error).message}
              </p>
            )}
            {analyze.data && analyze.data.warnings.length > 0 && (
              <p className="text-xs text-amber-600">
                {analyze.data.warnings.length} Feld(er) evtl. nachzubessern.
              </p>
            )}
          </div>

          {analysisDone && (
            <div
              role="status"
              className="rise-in flex items-center gap-2 rounded-md border border-green-600/30 bg-green-600/10 px-3 py-2 text-sm text-green-700 dark:text-green-400"
            >
              <span aria-hidden className="text-base leading-none">
                ✓
              </span>
              <span>
                Stil aus Bild übernommen — {analysisDone.fields} Stil-Bereich(e)
                ins Formular geladen.
              </span>
            </div>
          )}
          </>
          )}

          <div
            className={flashing ? 'style-flash' : undefined}
            onAnimationEnd={() => setFlashing(false)}
          >
            <StyleEditor value={style} onChange={setStyle} kind={kind} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Motiv (subject)</label>
            <textarea
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="h-20 w-full resize-y rounded-md border bg-background p-3 text-sm"
            />
          </div>

          <ModelPicker
            provider={provider}
            modelId={modelId}
            onChange={(p, m) => {
              setProvider(p)
              setModelId(m)
            }}
          />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field label="Format">
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                className="w-full rounded-md border bg-background p-2 text-sm"
              >
                {ASPECT_RATIOS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Größe">
              <select
                value={imageSize}
                onChange={(e) => setImageSize(e.target.value as ImageSize)}
                className="w-full rounded-md border bg-background p-2 text-sm"
              >
                {IMAGE_SIZES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Varianten">
              <select
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-full rounded-md border bg-background p-2 text-sm"
              >
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Thinking">
              <select
                value={thinkingLevel}
                onChange={(e) => setThinkingLevel(e.target.value as ThinkingLevelOpt)}
                className="w-full rounded-md border bg-background p-2 text-sm"
              >
                {THINKING_LEVELS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <PromptPreview styleJson={style} subject={subject} kind={kind} />

          <div className="flex gap-2">
            <button
              onClick={handleGenerate}
              disabled={mutation.isPending || subject.trim() === ''}
              className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {mutation.isPending ? 'Generiere…' : 'Bilder generieren'}
            </button>
            <button
              onClick={() => setSaveOpen(true)}
              className="rounded-md border px-4 py-2 text-sm font-medium"
              title="Aktuellen Stil in die Bibliothek speichern"
            >
              Als Stil speichern
            </button>
          </div>

          {mutation.isError && (
            <p className="text-sm text-red-600">
              Fehler: {(mutation.error).message}
            </p>
          )}
        </div>

        {/* Rechte Spalte: Ergebnisse */}
        <div className="flex min-w-0 flex-col gap-4">
          {mutation.isPending && (
            <div className="text-muted-foreground text-sm">
              Generiere {count} {count === 1 ? 'Bild' : 'Bilder'}…
            </div>
          )}

          {mutation.data && (
            <ResultGrid
              images={mutation.data.images}
              promptText={mutation.data.promptText}
              costUsd={mutation.data.costUsd}
            />
          )}

          {!mutation.isPending && !mutation.data && (
            <div className="text-muted-foreground rounded-md border border-dashed p-8 text-center text-sm">
              Noch keine Bilder. Stil + Motiv eingeben und generieren.
            </div>
          )}
        </div>
      </div>

      <SaveStyleDialog
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        styleJson={style}
        defaultParams={{ aspectRatio, imageSize, count, thinkingLevel }}
        provider={provider}
        modelId={modelId}
        kind={kind}
      />
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium">{label}</label>
      {children}
    </div>
  )
}
