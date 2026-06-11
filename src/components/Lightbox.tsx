import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, Download, X } from 'lucide-react'
import { downloadDataUrl } from '#/lib/export'
import type { ResultImage } from './ResultGrid'

const MIME_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}

/** Kompakter, lesbarer Zeitstempel YYYYMMDD-HHMMSS (lokale Zeit). */
function timestamp(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return (
    `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}` +
    `-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
  )
}

/**
 * Vollbild-Lightbox für generierte Bilder. Mehrere Bilder sind per Pfeil-Buttons
 * und Pfeiltasten durchklickbar; ein Download-Icon unten rechts lädt das
 * aktuell gezeigte Originalbild herunter. Rendert per Portal an `document.body`
 * und wird nur client-seitig gemountet (kein SSR, da nur per Klick geöffnet).
 */
export function Lightbox({
  images,
  index,
  onIndexChange,
  onClose,
}: {
  images: Array<ResultImage>
  index: number
  onIndexChange: (i: number) => void
  onClose: () => void
}) {
  const count = images.length

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft' && count > 1)
        onIndexChange((index - 1 + count) % count)
      else if (e.key === 'ArrowRight' && count > 1)
        onIndexChange((index + 1) % count)
    }
    window.addEventListener('keydown', onKey)
    // Hintergrund-Scroll sperren, solange die Lightbox offen ist.
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [index, count, onClose, onIndexChange])

  // Defensiv: index out-of-bounds, falls sich `images` ändert, während offen.
  if (index < 0 || index >= count) return null
  const current = images[index]

  function download() {
    // Eindeutiger Dateiname pro Download (Zeitstempel + Bildindex), damit sich
    // Downloads aus verschiedenen Generierungen nicht überschreiben.
    downloadDataUrl(
      current.dataUrl,
      `image-${timestamp()}-${index + 1}.${MIME_EXT[current.mimeType] ?? 'png'}`,
    )
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Bildansicht"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Schließen"
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
      >
        <X className="h-5 w-5" />
      </button>

      {count > 1 && (
        <button
          type="button"
          aria-label="Vorheriges Bild"
          onClick={(e) => {
            e.stopPropagation()
            onIndexChange((index - 1 + count) % count)
          }}
          className="absolute left-2 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 sm:left-4"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}

      <div className="relative max-h-full" onClick={(e) => e.stopPropagation()}>
        <img
          src={current.dataUrl}
          alt={`Variante ${index + 1}`}
          className="max-h-[85vh] w-auto rounded-md object-contain"
        />

        {count > 1 && (
          <span className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
            {index + 1} / {count}
          </span>
        )}

        <button
          type="button"
          onClick={download}
          aria-label="Originalbild herunterladen"
          title="Originalbild herunterladen"
          className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-2 text-sm font-medium text-white transition hover:bg-black/80"
        >
          <Download className="h-4 w-4" />
          Original
        </button>
      </div>

      {count > 1 && (
        <button
          type="button"
          aria-label="Nächstes Bild"
          onClick={(e) => {
            e.stopPropagation()
            onIndexChange((index + 1) % count)
          }}
          className="absolute right-2 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 sm:right-4"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}
    </div>,
    document.body,
  )
}
