import { useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addAnchorImage, getStyleAnchors, removeAnchorImage } from '#/ipc/images'
import { fileToDataUrl } from '#/lib/fileToDataUrl'

export function AnchorManager({ styleId }: { styleId: string }) {
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const { data: anchors = [] } = useQuery({
    queryKey: ['anchors', styleId],
    queryFn: () => getStyleAnchors({ data: { styleId } }),
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['anchors', styleId] })
    queryClient.invalidateQueries({ queryKey: ['style', styleId] })
    queryClient.invalidateQueries({ queryKey: ['styles'] })
  }

  const add = useMutation({
    mutationFn: (dataUrl: string) => addAnchorImage({ data: { styleId, dataUrl } }),
    onSuccess: invalidate,
  })
  const remove = useMutation({
    mutationFn: (imageId: string) =>
      removeAnchorImage({ data: { styleId, imageId } }),
    onSuccess: invalidate,
  })

  async function handleUpload(files: FileList | null) {
    if (!files) return
    for (const file of Array.from(files)) {
      const dataUrl = await fileToDataUrl(file)
      await add.mutateAsync(dataUrl)
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="rounded-md border p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          Stil-Anker{' '}
          <span className="text-muted-foreground font-normal">
            (Referenzbilder für Konsistenz)
          </span>
        </h3>
        <button
          onClick={() => fileRef.current?.click()}
          className="rounded border px-2 py-1 text-xs"
        >
          Bild hochladen
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => handleUpload(e.target.files)}
        />
      </div>

      {anchors.length === 0 ? (
        <p className="text-muted-foreground text-xs">
          Noch keine Anker. Ein generiertes Bild als Anker setzen oder ein eigenes Foto
          hochladen — bei der Produktion wird es als Stil-Referenz mitgeschickt
          (~60 % → ~90 % Konsistenz).
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {anchors.map((a) => (
            <div key={a.id} className="group relative">
              <img
                src={a.dataUrl}
                alt="Anker"
                className="h-20 w-20 rounded border object-cover"
              />
              <button
                onClick={() => remove.mutate(a.id)}
                title="Anker entfernen"
                className="absolute -right-1 -top-1 hidden h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs text-white group-hover:flex"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      {add.isPending && (
        <p className="text-muted-foreground mt-2 text-xs">Speichere Anker…</p>
      )}
    </div>
  )
}
