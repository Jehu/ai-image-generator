import { createFileRoute, Link, useParams } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { Download } from 'lucide-react'
import { generateImage } from '#/ipc/generate'
import {
  getStyle,
  listGenerations,
  listStyleVersions,
  updateStyle,
} from '#/ipc/styles'
import { addAnchorImage, getImageDataUrl } from '#/ipc/images'
import {
  downloadImagesAsZip,
  downloadStyleAsJson,
  downloadStyleBriefAsMarkdown,
  slugify,
} from '#/lib/export'
import type { ExportImage } from '#/lib/export'
import { StyleEditor } from '#/components/StyleEditor'
import { AnchorManager } from '#/components/AnchorManager'
import type { ResultImage } from '#/components/ResultGrid'
import { ResultGrid } from '#/components/ResultGrid'
import { Lightbox } from '#/components/Lightbox'
import { ModelPicker } from '#/components/ModelPicker'
import { PromptPreview } from '#/components/PromptPreview'
import { parseList } from '#/lib/styleObject'
import { parseDataUrl } from '#/lib/fileToDataUrl'
import { getKind } from '#/lib/kinds'
import type { JsonObject } from '#/lib/json'
import type {
  AspectRatio,
  ImageSize,
  ThinkingLevelOpt,
} from '#/lib/providers/types'

export const Route = createFileRoute('/styles/$id')({ component: StyleDetail })

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
const THINKING_LEVELS: Array<ThinkingLevelOpt> = [
  'minimal',
  'low',
  'medium',
  'high',
]

interface MotifResult {
  subject: string
  images: Array<ResultImage>
  costUsd: number
}

function StyleDetail() {
  const { id } = useParams({ from: '/styles/$id' })
  const queryClient = useQueryClient()

  const { data: style, isLoading } = useQuery({
    queryKey: ['style', id],
    queryFn: () => getStyle({ data: { id } }),
  })

  const { data: history = [] } = useQuery({
    queryKey: ['generations', id],
    queryFn: () => listGenerations({ data: { styleId: id } }),
  })

  const { data: versions = [] } = useQuery({
    queryKey: ['versions', id],
    queryFn: () => listStyleVersions({ data: { styleId: id } }),
  })

  // Editierbarer lokaler Zustand, einmalig aus dem geladenen Stil initialisiert.
  const [name, setName] = useState('')
  const [tags, setTags] = useState('')
  const [styleJson, setStyleJson] = useState<JsonObject>({})
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('4:5')
  const [imageSize, setImageSize] = useState<ImageSize>('2K')
  const [count, setCount] = useState(1)
  const [thinkingLevel, setThinkingLevel] = useState<ThinkingLevelOpt>('high')
  const [provider, setProvider] = useState('openrouter')
  const [modelId, setModelId] = useState('google/gemini-3-pro-image-preview')
  const initialized = useRef<string | null>(null)

  useEffect(() => {
    if (style && initialized.current !== style.id) {
      initialized.current = style.id
      setName(style.name)
      setTags(style.tags.join(', '))
      setStyleJson(style.styleJson)
      setProvider(style.provider)
      setModelId(style.modelId)
      const p = style.defaultParams
      setAspectRatio((p.aspectRatio as AspectRatio) ?? '4:5')
      setImageSize((p.imageSize as ImageSize) ?? '2K')
      setCount(p.count ?? 1)
      setThinkingLevel((p.thinkingLevel as ThinkingLevelOpt) ?? 'high')
    }
  }, [style])

  const [subjects, setSubjects] = useState('')
  const [results, setResults] = useState<Array<MotifResult>>([])
  // Lightbox für Historie-Bilder (alle Output-Bilder einer Generierung).
  const [lightboxImages, setLightboxImages] =
    useState<Array<ResultImage> | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  async function openHistoryLightbox(imageIds: Array<string>) {
    const loaded = await Promise.all(
      imageIds.map((imgId) =>
        queryClient.fetchQuery({
          queryKey: ['image', imgId],
          queryFn: () => getImageDataUrl({ data: { id: imgId } }),
        }),
      ),
    )
    const images = loaded
      .filter((r): r is { dataUrl: string } => !!r)
      .map((r) => ({
        dataUrl: r.dataUrl,
        mimeType: parseDataUrl(r.dataUrl).mimeType,
      }))
    if (images.length > 0) {
      setLightboxIndex(0)
      setLightboxImages(images)
    }
  }

  const save = useMutation({
    mutationFn: () =>
      updateStyle({
        data: {
          id,
          name,
          kind: style?.kind,
          tags: parseList(tags),
          styleJson,
          defaultParams: { aspectRatio, imageSize, count, thinkingLevel },
          provider,
          modelId,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['style', id] })
      queryClient.invalidateQueries({ queryKey: ['styles'] })
      queryClient.invalidateQueries({ queryKey: ['versions', id] })
    },
  })

  const setAnchor = useMutation({
    mutationFn: (dataUrl: string) =>
      addAnchorImage({ data: { styleId: id, dataUrl } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anchors', id] })
      queryClient.invalidateQueries({ queryKey: ['styles'] })
    },
  })

  const generate = useMutation({
    mutationFn: async () => {
      const motifs = subjects
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
      const out: Array<MotifResult> = []
      for (const subject of motifs) {
        const res = await generateImage({
          data: {
            styleJson,
            subject,
            styleId: id,
            provider,
            modelId,
            kind: style?.kind,
            params: { aspectRatio, imageSize, count, thinkingLevel },
          },
        })
        out.push({ subject, images: res.images, costUsd: res.costUsd })
      }
      return out
    },
    onSuccess: (out) => {
      setResults(out)
      queryClient.invalidateQueries({ queryKey: ['generations', id] })
    },
  })

  // Alle Output-Bilder der Historie als ZIP exportieren.
  const exportZip = useMutation({
    mutationFn: async () => {
      if (!style) return
      const images: Array<ExportImage> = []
      for (const h of history) {
        images.push(
          ...(await loadSetImages(style.name, h.subject, h.outputImageIds)),
        )
      }
      await downloadImagesAsZip(images, style.name)
    },
    onError: (err) => {
      alert(err.message)
    },
  })

  const totalOutputImages = history.reduce(
    (sum, h) => sum + h.outputImageIds.length,
    0,
  )

  // Aktuell editierten Stil-Zustand als JSON exportieren.
  function handleExportStyle() {
    downloadStyleAsJson({
      name,
      tags: parseList(tags),
      styleJson,
      defaultParams: { aspectRatio, imageSize, count, thinkingLevel },
      kind: style?.kind,
    })
  }

  if (isLoading)
    return <p className="p-6 text-sm text-muted-foreground">Lade…</p>
  if (!style)
    return (
      <div className="p-6">
        <p className="text-sm">Stil nicht gefunden.</p>
        <Link to="/styles" className="text-sm underline">
          Zurück zur Bibliothek
        </Link>
      </div>
    )

  const motifLines = subjects
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
  const motifCount = motifLines.length
  const firstMotif = motifLines[0] ?? ''
  const hasAnchors = style.anchorImageIds.length > 0

  return (
    <div className="mx-auto max-w-7xl p-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <Link
            to="/styles"
            className="text-muted-foreground text-sm hover:underline"
          >
            ← Bibliothek
          </Link>
          <h1 className="text-2xl font-bold">{style.name}</h1>
          <p className="text-muted-foreground text-xs">
            {getKind(style.kind).label} · Version {style.version} · {style.modelId}
          </p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Stil bearbeiten */}
        <div className="flex min-w-0 flex-col gap-4">
          <h2 className="text-sm font-semibold">Stil (fixiert, editierbar)</h2>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-medium">Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border bg-background p-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-medium">Tags</span>
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full rounded-md border bg-background p-2 text-sm"
              />
            </label>
          </div>

          <StyleEditor value={styleJson} onChange={setStyleJson} kind={style.kind} />

          <AnchorManager styleId={id} />

          <ModelPicker
            provider={provider}
            modelId={modelId}
            onChange={(p, m) => {
              setProvider(p)
              setModelId(m)
            }}
          />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <ParamSelect
              label="Format"
              value={aspectRatio}
              options={ASPECT_RATIOS}
              onChange={(v) => setAspectRatio(v as AspectRatio)}
            />
            <ParamSelect
              label="Größe"
              value={imageSize}
              options={IMAGE_SIZES}
              onChange={(v) => setImageSize(v as ImageSize)}
            />
            <ParamSelect
              label="Varianten"
              value={String(count)}
              options={['1', '2', '3', '4']}
              onChange={(v) => setCount(Number(v))}
            />
            <ParamSelect
              label="Thinking"
              value={thinkingLevel}
              options={THINKING_LEVELS}
              onChange={(v) => setThinkingLevel(v as ThinkingLevelOpt)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => save.mutate()}
              disabled={save.isPending}
              className="rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {save.isPending
                ? 'Speichere…'
                : 'Stil-Änderungen speichern (neue Version)'}
            </button>
            <button
              onClick={handleExportStyle}
              className="rounded-md border px-3 py-1 text-xs font-medium"
            >
              Stil als JSON exportieren
            </button>
            <button
              onClick={() =>
                style.styleBrief &&
                downloadStyleBriefAsMarkdown(name, style.styleBrief)
              }
              disabled={!style.styleBrief}
              className="rounded-md border px-3 py-1 text-xs font-medium disabled:opacity-50"
              title={
                style.styleBrief
                  ? 'Style-Brief als Markdown herunterladen'
                  : 'Noch kein Style-Brief — Stil speichern, um einen zu erzeugen'
              }
            >
              Style-Brief (.md)
            </button>
          </div>
          {save.isSuccess && (
            <p className="text-xs text-green-600">Gespeichert.</p>
          )}

          {style.styleBrief && (
            <details className="rounded-md border p-3 text-sm">
              <summary className="cursor-pointer font-semibold">
                Style-Brief (Markdown)
              </summary>
              <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">
                {style.styleBrief}
              </pre>
            </details>
          )}

          {versions.length > 1 && (
            <details className="rounded-md border p-3 text-sm">
              <summary className="cursor-pointer font-semibold">
                Versionen ({versions.length})
              </summary>
              <ul className="mt-2 flex flex-col gap-1">
                {versions.map((v) => (
                  <li
                    key={v.version}
                    className="flex items-center justify-between gap-2 rounded border px-2 py-1 text-xs"
                  >
                    <span>
                      v{v.version} ·{' '}
                      {new Date(v.createdAt).toLocaleString('de-DE')}
                    </span>
                    <button
                      onClick={() => setStyleJson(v.styleJson)}
                      className="rounded border px-2 py-0.5"
                      title="Diese Version in den Editor laden (Speichern erzeugt neue Version)"
                    >
                      In Editor laden
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>

        {/* Produce */}
        <div className="flex min-w-0 flex-col gap-4">
          <h2 className="text-sm font-semibold">
            Produktion — nur Motiv beschreiben
          </h2>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium">
              Motive (eine pro Zeile für Batch)
            </span>
            <textarea
              value={subjects}
              onChange={(e) => setSubjects(e.target.value)}
              placeholder={
                'a barista pouring latte art\na laptop on a marble desk\nfresh croissants on a plate'
              }
              className="h-28 w-full resize-y rounded-md border bg-background p-3 text-sm"
            />
          </label>
          <PromptPreview
            styleJson={styleJson}
            subject={firstMotif}
            hasReferences={hasAnchors}
            kind={style.kind}
          />
          {motifCount > 1 && (
            <p className="text-muted-foreground -mt-2 text-xs">
              Vorschau zeigt das erste Motiv; pro Zeile wird ein eigener Prompt
              erzeugt.
            </p>
          )}

          <button
            onClick={() => generate.mutate()}
            disabled={generate.isPending || motifCount === 0}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {generate.isPending
              ? 'Generiere…'
              : `Generieren (${motifCount} ${motifCount === 1 ? 'Motiv' : 'Motive'})`}
          </button>
          {generate.isError && (
            <p className="text-sm text-red-600">
              Fehler: {generate.error.message}
            </p>
          )}

          {results.map((r, i) => (
            <div key={i} className="rounded-md border p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                {r.subject}
              </p>
              <ResultGrid
                images={r.images}
                costUsd={r.costUsd}
                onSetAnchor={(dataUrl) => setAnchor.mutate(dataUrl)}
              />
            </div>
          ))}
          {setAnchor.isSuccess && (
            <p className="text-xs text-green-600">Anker gesetzt.</p>
          )}

          {/* Historie */}
          <div className="mt-2">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Historie</h3>
              <div className="flex items-center gap-3">
                {history.length > 0 && (
                  <span className="text-muted-foreground text-xs">
                    {history.length} Generierungen · Σ $
                    {history
                      .reduce((sum, h) => sum + (h.costUsd ?? 0), 0)
                      .toFixed(3)}
                  </span>
                )}
                <button
                  onClick={() => exportZip.mutate()}
                  disabled={totalOutputImages === 0 || exportZip.isPending}
                  className="rounded-md border px-3 py-1 text-xs font-medium disabled:opacity-50"
                >
                  {exportZip.isPending
                    ? 'Exportiere…'
                    : 'Alle Bilder herunterladen'}
                </button>
              </div>
            </div>
            {history.length === 0 ? (
              <p className="text-muted-foreground text-xs">
                Noch keine Generierungen.
              </p>
            ) : (
              <ul className="flex flex-col gap-1 text-xs">
                {history.map((h) => (
                  <li
                    key={h.id}
                    className="flex items-center gap-2 rounded border px-2 py-1"
                  >
                    {h.outputImageIds[0] && (
                      <HistoryThumb
                        imageId={h.outputImageIds[0]}
                        count={h.outputImageIds.length}
                        onOpen={() => openHistoryLightbox(h.outputImageIds)}
                      />
                    )}
                    <span className="min-w-0 flex-1 truncate">{h.subject}</span>
                    <span className="text-muted-foreground shrink-0">
                      {new Date(h.createdAt).toLocaleString('de-DE')} ·{' '}
                      {h.costUsd != null ? `$${h.costUsd.toFixed(3)}` : '—'}
                    </span>
                    {style && h.outputImageIds.length > 0 && (
                      <HistorySetDownloadButton
                        styleName={style.name}
                        subject={h.subject}
                        imageIds={h.outputImageIds}
                      />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
      {lightboxImages && (
        <Lightbox
          images={lightboxImages}
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxImages(null)}
        />
      )}
    </div>
  )
}

// Kleines Thumbnail des ersten Output-Bilds einer Generierung.
// Bei mehreren Bildern zeigt ein Badge die Anzahl im Set.
function HistoryThumb({
  imageId,
  count,
  onOpen,
}: {
  imageId: string
  count: number
  onOpen: () => void
}) {
  const { data } = useQuery({
    queryKey: ['image', imageId],
    queryFn: () => getImageDataUrl({ data: { id: imageId } }),
  })
  if (!data) return null
  return (
    <button
      type="button"
      onClick={onOpen}
      title={count > 1 ? `${count} Bilder · vergrößern` : 'Vergrößern'}
      className="relative shrink-0 cursor-pointer"
    >
      <img
        src={data.dataUrl}
        alt=""
        className="h-10 w-10 rounded object-cover shrink-0"
      />
      {count > 1 && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-medium leading-none text-background">
          {count}
        </span>
      )}
    </button>
  )
}

// Lädt alle Output-Bilder einer Generierung als ExportImage[] (für ZIP-Export).
// Dateinamen: <stil>-<motiv>-<n>.png. Geteilt von „Alle Bilder" und Set-Download.
async function loadSetImages(
  styleName: string,
  subject: string,
  imageIds: Array<string>,
): Promise<Array<ExportImage>> {
  const styleSlug = slugify(styleName)
  const subjectSlug = slugify(subject)
  const images: Array<ExportImage> = []
  let n = 1
  for (const imageId of imageIds) {
    const res = await getImageDataUrl({ data: { id: imageId } })
    if (res) {
      images.push({
        dataUrl: res.dataUrl,
        filename: `${styleSlug}-${subjectSlug}-${n}.png`,
      })
      n++
    }
  }
  return images
}

// Lädt genau dieses eine Set (eine Generierung) als ZIP herunter.
function HistorySetDownloadButton({
  styleName,
  subject,
  imageIds,
}: {
  styleName: string
  subject: string
  imageIds: Array<string>
}) {
  const download = useMutation({
    mutationFn: async () => {
      const images = await loadSetImages(styleName, subject, imageIds)
      await downloadImagesAsZip(images, `${styleName}-${subject}`)
    },
    onError: (err) => {
      alert((err).message)
    },
  })
  return (
    <button
      type="button"
      onClick={() => download.mutate()}
      disabled={download.isPending}
      title="Dieses Set als ZIP herunterladen"
      className="text-muted-foreground hover:text-foreground shrink-0 rounded p-1 disabled:opacity-50"
    >
      <Download className="h-3.5 w-3.5" />
    </button>
  )
}

function ParamSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: ReadonlyArray<string>
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border bg-background p-2 text-sm"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  )
}
