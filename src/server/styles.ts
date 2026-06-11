import { createServerFn } from '@tanstack/react-start'
import type { Prisma } from '#/generated/prisma/client'
import type { JsonObject } from '#/lib/json'
import type { GenerateParams } from '#/lib/providers/types'
import { asImageKind } from '#/lib/kinds/types'
import type { ImageKind } from '#/lib/kinds/types'
import type { GenerationDTO, StyleDTO, StyleVersionDTO } from '#/lib/types'

const asJson = (v: unknown): Prisma.InputJsonValue => v as Prisma.InputJsonValue

// Prisma serverseitig laden — dynamischer Import hält den Client (Node-only,
// `fileURLToPath`) aus dem Browser-Bundle heraus.
const db = async () => (await import('#/db')).prisma

// Markdown-Style-Brief + Source-Hash synchron zum styleJson erzeugen.
// Best-effort: Bei API-/Key-Fehlern wird der Speichervorgang NICHT blockiert —
// dann fehlt der Brief (Hash bleibt ungesetzt, sodass beim nächsten Speichern
// erneut versucht wird).
async function generateBriefFields(
  styleJson: JsonObject,
  kind: ImageKind,
): Promise<{ styleBrief: string | null; briefSourceHash: string | null }> {
  try {
    const { buildStyleBrief, hashStyleJson } = await import('#/server/styleBrief')
    const [styleBrief, briefSourceHash] = await Promise.all([
      buildStyleBrief(styleJson, kind),
      hashStyleJson(styleJson),
    ])
    return { styleBrief: styleBrief || null, briefSourceHash }
  } catch (err) {
    console.error('Style-Brief-Generierung übersprungen:', err)
    return { styleBrief: null, briefSourceHash: null }
  }
}

// ---------- Mapper (Prisma-Row -> serialisierbares DTO) ----------

type StyleRow = {
  id: string
  name: string
  description: string | null
  kind: string
  tags: unknown
  styleJson: unknown
  styleBrief: string | null
  schemaVersion: number
  version: number
  provider: string
  modelId: string
  defaultParams: unknown
  anchorImageIds: unknown
  createdAt: Date
  updatedAt: Date
}

function toStyleDTO(s: StyleRow): StyleDTO {
  return {
    id: s.id,
    name: s.name,
    description: s.description,
    kind: asImageKind(s.kind),
    tags: (s.tags as Array<string>) ?? [],
    styleJson: (s.styleJson as JsonObject) ?? {},
    styleBrief: s.styleBrief ?? null,
    schemaVersion: s.schemaVersion,
    version: s.version,
    provider: s.provider,
    modelId: s.modelId,
    defaultParams: (s.defaultParams as GenerateParams) ?? {},
    anchorImageIds: (s.anchorImageIds as Array<string>) ?? [],
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }
}

// ---------- Inputs ----------

export interface CreateStyleInput {
  name: string
  description?: string
  kind?: ImageKind
  tags?: Array<string>
  styleJson: JsonObject
  defaultParams?: GenerateParams
  anchorImageIds?: Array<string>
  provider?: string
  modelId?: string
}

export interface UpdateStyleInput {
  id: string
  name?: string
  description?: string | null
  kind?: ImageKind
  tags?: Array<string>
  styleJson?: JsonObject
  defaultParams?: GenerateParams
  anchorImageIds?: Array<string>
  provider?: string
  modelId?: string
}

// ---------- Server Functions ----------

export const listStyles = createServerFn({ method: 'GET' })
  .validator((input?: { tag?: string; search?: string }) => input ?? {})
  .handler(async ({ data }): Promise<Array<StyleDTO>> => {
    const prisma = await db()
    const rows = await prisma.style.findMany({ orderBy: { updatedAt: 'desc' } })
    let styles = rows.map(toStyleDTO)

    if (data.tag) {
      styles = styles.filter((s) => s.tags.includes(data.tag as string))
    }
    if (data.search) {
      const q = data.search.toLowerCase()
      styles = styles.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.description ?? '').toLowerCase().includes(q),
      )
    }
    return styles
  })

export const getStyle = createServerFn({ method: 'GET' })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<StyleDTO | null> => {
    const prisma = await db()
    const row = await prisma.style.findUnique({ where: { id: data.id } })
    return row ? toStyleDTO(row) : null
  })

export const createStyle = createServerFn({ method: 'POST' })
  .validator((input: CreateStyleInput) => {
    if (!input?.name?.trim()) throw new Error('Name ist erforderlich.')
    if (typeof input.styleJson !== 'object' || input.styleJson === null) {
      throw new Error('styleJson muss ein Objekt sein.')
    }
    return input
  })
  .handler(async ({ data }): Promise<StyleDTO> => {
    const prisma = await db()
    const kind = asImageKind(data.kind)
    const brief = await generateBriefFields(data.styleJson, kind)
    const row = await prisma.style.create({
      data: {
        name: data.name.trim(),
        description: data.description ?? null,
        kind,
        tags: asJson(data.tags ?? []),
        styleJson: asJson(data.styleJson),
        styleBrief: brief.styleBrief,
        briefSourceHash: brief.briefSourceHash,
        defaultParams: asJson(data.defaultParams ?? {}),
        anchorImageIds: asJson(data.anchorImageIds ?? []),
        provider: data.provider ?? 'gemini',
        modelId: data.modelId ?? 'gemini-3-pro-image',
        version: 1,
        versions: {
          create: { version: 1, styleJson: asJson(data.styleJson) },
        },
      },
    })
    return toStyleDTO(row)
  })

export const updateStyle = createServerFn({ method: 'POST' })
  .validator((input: UpdateStyleInput) => {
    if (!input?.id) throw new Error('id ist erforderlich.')
    return input
  })
  .handler(async ({ data }): Promise<StyleDTO> => {
    const prisma = await db()
    const current = await prisma.style.findUnique({ where: { id: data.id } })
    if (!current) throw new Error('Stil nicht gefunden.')

    const styleChanged =
      data.styleJson !== undefined &&
      JSON.stringify(data.styleJson) !== JSON.stringify(current.styleJson)
    const nextVersion = styleChanged ? current.version + 1 : current.version

    // Style-Brief nur dann neu generieren, wenn sich das styleJson wirklich
    // geändert hat (oder noch kein Brief existiert) — spart API-Calls bei reinen
    // Namens-/Tag-Änderungen.
    let briefFields: {
      styleBrief: string | null
      briefSourceHash: string | null
    } | null = null
    if (data.styleJson !== undefined) {
      const { hashStyleJson } = await import('#/server/styleBrief')
      const nextHash = await hashStyleJson(data.styleJson)
      if (nextHash !== current.briefSourceHash || current.styleBrief === null) {
        const kind = data.kind !== undefined ? asImageKind(data.kind) : asImageKind(current.kind)
        briefFields = await generateBriefFields(data.styleJson, kind)
      }
    }

    const row = await prisma.style.update({
      where: { id: data.id },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.kind !== undefined ? { kind: asImageKind(data.kind) } : {}),
        ...(data.tags !== undefined ? { tags: asJson(data.tags) } : {}),
        ...(data.styleJson !== undefined ? { styleJson: asJson(data.styleJson) } : {}),
        ...(briefFields !== null
          ? {
              styleBrief: briefFields.styleBrief,
              briefSourceHash: briefFields.briefSourceHash,
            }
          : {}),
        ...(data.defaultParams !== undefined
          ? { defaultParams: asJson(data.defaultParams) }
          : {}),
        ...(data.anchorImageIds !== undefined
          ? { anchorImageIds: asJson(data.anchorImageIds) }
          : {}),
        ...(data.provider !== undefined ? { provider: data.provider } : {}),
        ...(data.modelId !== undefined ? { modelId: data.modelId } : {}),
        version: nextVersion,
        ...(styleChanged
          ? {
              versions: {
                create: { version: nextVersion, styleJson: asJson(data.styleJson) },
              },
            }
          : {}),
      },
    })
    return toStyleDTO(row)
  })

export const deleteStyle = createServerFn({ method: 'POST' })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<{ id: string }> => {
    const prisma = await db()
    await prisma.style.delete({ where: { id: data.id } })
    return { id: data.id }
  })

export const duplicateStyle = createServerFn({ method: 'POST' })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<StyleDTO> => {
    const prisma = await db()
    const src = await prisma.style.findUnique({ where: { id: data.id } })
    if (!src) throw new Error('Stil nicht gefunden.')
    const row = await prisma.style.create({
      data: {
        name: `${src.name} (Kopie)`,
        description: src.description,
        kind: asImageKind(src.kind),
        tags: asJson(src.tags ?? []),
        styleJson: asJson(src.styleJson ?? {}),
        styleBrief: src.styleBrief, // Brief gilt fürs identische styleJson weiter
        briefSourceHash: src.briefSourceHash,
        defaultParams: asJson(src.defaultParams ?? {}),
        anchorImageIds: asJson([]), // Anker werden nicht mitkopiert
        provider: src.provider,
        modelId: src.modelId,
        version: 1,
        versions: { create: { version: 1, styleJson: asJson(src.styleJson ?? {}) } },
      },
    })
    return toStyleDTO(row)
  })

export const listStyleVersions = createServerFn({ method: 'GET' })
  .validator((input: { styleId: string }) => input)
  .handler(async ({ data }): Promise<Array<StyleVersionDTO>> => {
    const prisma = await db()
    const rows = await prisma.styleVersion.findMany({
      where: { styleId: data.styleId },
      orderBy: { version: 'desc' },
    })
    return rows.map((v) => ({
      version: v.version,
      styleJson: (v.styleJson as JsonObject) ?? {},
      createdAt: v.createdAt.toISOString(),
    }))
  })

export const listGenerations = createServerFn({ method: 'GET' })
  .validator((input?: { styleId?: string; limit?: number }) => input ?? {})
  .handler(async ({ data }): Promise<Array<GenerationDTO>> => {
    const prisma = await db()
    const rows = await prisma.generation.findMany({
      where: data.styleId ? { styleId: data.styleId } : undefined,
      orderBy: { createdAt: 'desc' },
      take: data.limit ?? 50,
      include: { images: { select: { id: true } } },
    })
    return rows.map((g) => ({
      id: g.id,
      styleId: g.styleId,
      subject: g.subject,
      promptText: JSON.stringify(g.compiledPrompt, null, 2),
      provider: g.provider,
      modelId: g.modelId,
      params: (g.params as GenerateParams) ?? {},
      status: g.status,
      errorMessage: g.errorMessage,
      costUsd: g.costUsd,
      outputImageIds: g.images.map((i) => i.id),
      createdAt: g.createdAt.toISOString(),
    }))
  })
