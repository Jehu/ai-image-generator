import { useEffect, useRef, useState } from 'react'
import { Info } from 'lucide-react'

/** Kleines, klickbares ℹ-Icon, das einen Hilfetext als Popover zeigt.
 *  Zusätzlich als nativer Hover-Tooltip (title). */
export function InfoHint({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    function onDocPointer(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDocPointer)
    return () => document.removeEventListener('pointerdown', onDocPointer)
  }, [open])

  return (
    <span ref={ref} className="relative inline-flex align-middle">
      <button
        type="button"
        aria-label="Hilfe anzeigen"
        title={text}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen((o) => !o)
        }}
        className="text-muted-foreground hover:text-foreground"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute left-0 top-6 z-30 w-64 rounded-md border bg-background p-2 text-xs font-normal normal-case leading-snug text-foreground shadow-md"
        >
          {text}
        </span>
      )}
    </span>
  )
}
