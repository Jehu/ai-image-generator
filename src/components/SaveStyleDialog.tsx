import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createStyle } from '#/server/styles'
import { parseList } from '#/lib/styleObject'
import type { JsonObject } from '#/lib/json'
import type { GenerateParams } from '#/lib/providers/types'
import type { ImageKind } from '#/lib/kinds'
import type { StyleDTO } from '#/lib/types'

export function SaveStyleDialog({
  styleJson,
  defaultParams,
  provider,
  modelId,
  kind,
  open,
  onClose,
  onSaved,
}: {
  styleJson: JsonObject
  defaultParams: GenerateParams
  provider?: string
  modelId?: string
  kind?: ImageKind
  open: boolean
  onClose: () => void
  onSaved?: (style: StyleDTO) => void
}) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [tags, setTags] = useState('')
  const [description, setDescription] = useState('')

  const mutation = useMutation({
    mutationFn: () =>
      createStyle({
        data: {
          name,
          description: description || undefined,
          kind,
          tags: parseList(tags),
          styleJson,
          defaultParams,
          provider,
          modelId,
        },
      }),
    onSuccess: (style) => {
      queryClient.invalidateQueries({ queryKey: ['styles'] })
      onSaved?.(style)
      onClose()
    },
  })

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg border bg-background p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-lg font-semibold">Als Stil speichern</h3>
        <div className="flex flex-col gap-3">
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium">Name *</span>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Blog Featured – Editorial Warm"
              className="w-full rounded-md border bg-background p-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium">
              Tags (kommagetrennt)
            </span>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="featured, blog, warm"
              className="w-full rounded-md border bg-background p-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium">Beschreibung</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-20 w-full resize-y rounded-md border bg-background p-2 text-sm"
            />
          </label>

          {mutation.isError && (
            <p className="text-sm text-red-600">{mutation.error.message}</p>
          )}

          <div className="mt-2 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="rounded-md border px-4 py-2 text-sm font-medium"
            >
              Abbrechen
            </button>
            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || name.trim() === ''}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {mutation.isPending ? 'Speichere…' : 'Speichern'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
