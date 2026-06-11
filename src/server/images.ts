import { createServerFn } from '@tanstack/react-start'
import type { Prisma } from '#/generated/prisma/client'

const db = async () => (await import('#/db')).prisma
const storage = async () => (await import('#/lib/storage')).getStorage()
const asJson = (v: unknown): Prisma.InputJsonValue => v as Prisma.InputJsonValue

function parseDataUrl(dataUrl: string): { mime: string; base64: string } {
  const m = /^data:([^;]+);base64,(.*)$/s.exec(dataUrl)
  if (!m) throw new Error('Ungültige Data-URL.')
  return { mime: m[1], base64: m[2] }
}

export interface AnchorImageDTO {
  id: string
  dataUrl: string
}

/** Einzelnes Bild als Data-URL ausliefern (für <img src>). */
export const getImageDataUrl = createServerFn({ method: 'GET' })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<{ dataUrl: string } | null> => {
    const prisma = await db()
    const img = await prisma.image.findUnique({ where: { id: data.id } })
    if (!img) return null
    const s = await storage()
    const { data: b64, mime } = await s.readAsBase64(img.path)
    return { dataUrl: `data:${mime};base64,${b64}` }
  })

/** Alle Anker eines Stils als Data-URLs (für die Anker-Verwaltung). */
export const getStyleAnchors = createServerFn({ method: 'GET' })
  .validator((input: { styleId: string }) => input)
  .handler(async ({ data }): Promise<Array<AnchorImageDTO>> => {
    const prisma = await db()
    const style = await prisma.style.findUnique({ where: { id: data.styleId } })
    const ids = (style?.anchorImageIds as Array<string> | undefined) ?? []
    if (ids.length === 0) return []
    const s = await storage()
    const imgs = await prisma.image.findMany({ where: { id: { in: ids } } })
    // Reihenfolge gemäß anchorImageIds beibehalten
    const byId = new Map(imgs.map((i) => [i.id, i]))
    const out: Array<AnchorImageDTO> = []
    for (const id of ids) {
      const img = byId.get(id)
      if (!img) continue
      const { data: b64, mime } = await s.readAsBase64(img.path)
      out.push({ id, dataUrl: `data:${mime};base64,${b64}` })
    }
    return out
  })

/** Data-URL (generiertes Ergebnis oder Upload) als Anker an einen Stil pinnen. */
export const addAnchorImage = createServerFn({ method: 'POST' })
  .validator((input: { styleId: string; dataUrl: string }) => {
    if (!input?.styleId) throw new Error('styleId erforderlich.')
    if (!input?.dataUrl) throw new Error('dataUrl erforderlich.')
    return input
  })
  .handler(
    async ({ data }): Promise<{ imageId: string; anchorImageIds: Array<string> }> => {
      const prisma = await db()
      const style = await prisma.style.findUnique({ where: { id: data.styleId } })
      if (!style) throw new Error('Stil nicht gefunden.')

      const { mime, base64 } = parseDataUrl(data.dataUrl)
      const s = await storage()
      const saved = await s.saveBase64(base64, mime)
      const img = await prisma.image.create({
        data: { kind: 'anchor', path: saved.path, mime: saved.mime },
      })

      const ids = (style.anchorImageIds as Array<string> | undefined) ?? []
      const next = [...ids, img.id]
      await prisma.style.update({
        where: { id: data.styleId },
        data: { anchorImageIds: asJson(next) },
      })
      return { imageId: img.id, anchorImageIds: next }
    },
  )

/** Anker entfernen (aus Liste lösen, Image-Row + Datei löschen). */
export const removeAnchorImage = createServerFn({ method: 'POST' })
  .validator((input: { styleId: string; imageId: string }) => input)
  .handler(async ({ data }): Promise<{ anchorImageIds: Array<string> }> => {
    const prisma = await db()
    const style = await prisma.style.findUnique({ where: { id: data.styleId } })
    if (!style) throw new Error('Stil nicht gefunden.')

    const ids = (style.anchorImageIds as Array<string> | undefined) ?? []
    const next = ids.filter((id) => id !== data.imageId)
    await prisma.style.update({
      where: { id: data.styleId },
      data: { anchorImageIds: asJson(next) },
    })

    const img = await prisma.image.findUnique({ where: { id: data.imageId } })
    if (img) {
      const s = await storage()
      await s.remove(img.path)
      await prisma.image.delete({ where: { id: data.imageId } }).catch(() => {})
    }
    return { anchorImageIds: next }
  })
