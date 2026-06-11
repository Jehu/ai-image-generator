import { createServerFn } from '@tanstack/react-start'
import type { Prisma } from '#/generated/prisma/client'
import { getProvider } from '#/lib/providers'
import { compilePrompt } from '#/lib/prompt/compile'
import type { JsonObject } from '#/lib/json'
import type { GenerateParams, ReferenceImage } from '#/lib/providers/types'
import type { ImageKind } from '#/lib/kinds/types'

const asJson = (v: unknown): Prisma.InputJsonValue => v as Prisma.InputJsonValue

export interface GenerateInput {
  styleJson: JsonObject
  subject: string
  provider?: string
  modelId?: string
  params?: GenerateParams
  references?: Array<ReferenceImage>
  /** Bildart — steuert bildartspezifische Prompt-Hinweise (z.B. Text-Rendering). */
  kind?: ImageKind
  /** wenn gesetzt: Generierung wird in der Historie dieses Stils gespeichert */
  styleId?: string
}

export interface GenerateOutput {
  images: Array<{ dataUrl: string; mimeType: string }>
  compiledPrompt: JsonObject
  promptText: string
  costUsd: number
}

function validate(input: GenerateInput): GenerateInput {
  if (!input || typeof input !== 'object') {
    throw new Error('Ungültige Eingabe.')
  }
  if (typeof input.subject !== 'string' || input.subject.trim() === '') {
    throw new Error('Bitte ein Motiv (subject) angeben.')
  }
  if (typeof input.styleJson !== 'object' || input.styleJson === null) {
    throw new Error('styleJson muss ein Objekt sein.')
  }
  return input
}

export const generateImage = createServerFn({ method: 'POST' })
  .validator(validate)
  .handler(async ({ data }): Promise<GenerateOutput> => {
    const provider = getProvider(data.provider ?? 'gemini')
    const modelId = data.modelId ?? 'gemini-3-pro-image'

    // Anker-Bilder des Stils als Stil-Referenzen laden (stärkster
    // Konsistenz-Hebel bei Gemini, da keine Seeds). Anker zuerst, dann
    // ad-hoc vom Client mitgegebene Referenzen.
    const anchorRefs: Array<ReferenceImage> = []
    let usedAnchorIds: Array<string> = []
    if (data.styleId) {
      const { prisma } = await import('#/db')
      const style = await prisma.style.findUnique({
        where: { id: data.styleId },
      })
      const ids = (style?.anchorImageIds as Array<string> | undefined) ?? []
      usedAnchorIds = ids
      if (ids.length > 0) {
        const { getStorage } = await import('#/lib/storage')
        const storage = await getStorage()
        const imgs = await prisma.image.findMany({ where: { id: { in: ids } } })
        for (const img of imgs) {
          const { data: b64, mime } = await storage.readAsBase64(img.path)
          anchorRefs.push({ mimeType: mime, data: b64 })
        }
      }
    }
    const references = [...anchorRefs, ...(data.references ?? [])]

    const { promptObject, promptText } = compilePrompt({
      styleJson: data.styleJson,
      subject: data.subject,
      hasReferences: references.length > 0,
      kind: data.kind,
    })

    const params: GenerateParams = {
      aspectRatio: data.params?.aspectRatio ?? '1:1',
      imageSize: data.params?.imageSize ?? '2K',
      thinkingLevel: data.params?.thinkingLevel,
      count: data.params?.count ?? 1,
    }

    const result = await provider.generate({
      modelId,
      promptText,
      references,
      params,
    })

    // Produktions-Generierungen (mit styleId) in der Historie speichern.
    // Output-Bilder werden über den Storage-Adapter dauerhaft persistiert
    // (kind='output'), Playground-Generierungen (ohne styleId) bleiben ephemer.
    if (data.styleId) {
      const { prisma } = await import('#/db')
      const generation = await prisma.generation.create({
        data: {
          styleId: data.styleId,
          subject: data.subject,
          compiledPrompt: asJson(promptObject),
          provider: data.provider ?? 'gemini',
          modelId,
          params: asJson(params),
          referenceImageIds: asJson(usedAnchorIds),
          status: 'done',
          costUsd: result.costUsd,
        },
      })

      const { getStorage } = await import('#/lib/storage')
      const storage = await getStorage()
      let firstImageId: string | null = null
      for (const img of result.images) {
        const saved = await storage.saveBase64(img.data, img.mimeType)
        const row = await prisma.image.create({
          data: {
            kind: 'output',
            path: saved.path,
            mime: saved.mime,
            generationId: generation.id,
          },
        })
        if (firstImageId === null) firstImageId = row.id
      }
      if (firstImageId !== null) {
        await prisma.generation.update({
          where: { id: generation.id },
          data: { outputImageId: firstImageId },
        })
      }
    }

    return {
      images: result.images.map((img) => ({
        dataUrl: `data:${img.mimeType};base64,${img.data}`,
        mimeType: img.mimeType,
      })),
      compiledPrompt: promptObject,
      promptText,
      costUsd: result.costUsd,
    }
  })
