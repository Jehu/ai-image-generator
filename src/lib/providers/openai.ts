import OpenAI, { toFile } from 'openai'
import type {
  AspectRatio,
  GenerateRequest,
  GenerateResult,
  GeneratedImage,
  ImageProvider,
  ImageSize,
  ModelDescriptor,
} from './types'

// OpenAI Bildgenerierung (gpt-image-*). Liefert immer base64 (b64_json).
// gpt-image-1: feste Pro-Bild-Preise + Referenzbilder via images.edit.
// gpt-image-2: höhere Qualität, aber token-basiert (Kosten geschätzt) und ohne
// edit-/Referenz-Support.

type OpenAiSize = '1024x1024' | '1536x1024' | '1024x1536'
type OpenAiQuality = 'low' | 'medium' | 'high'

const GPT_IMAGE_1 = 'gpt-image-1'
const GPT_IMAGE_2 = 'gpt-image-2'

const OPENAI_MODELS: Array<ModelDescriptor> = [
  {
    id: GPT_IMAGE_1,
    label: 'OpenAI GPT Image 1',
    maxReferenceImages: 16,
    supportsSeed: false,
    supportsReferences: true,
    imageSizes: ['1K', '2K', '4K'],
    aspectRatios: ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'],
  },
  {
    id: GPT_IMAGE_2,
    label: 'OpenAI GPT Image 2',
    maxReferenceImages: 0,
    supportsSeed: false,
    supportsReferences: false,
    imageSizes: ['1K', '2K', '4K'],
    aspectRatios: ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'],
  },
]

// aspectRatio -> nächstliegende OpenAI-Größe (quadratisch/Landscape/Portrait).
const PORTRAIT: ReadonlySet<AspectRatio> = new Set(['2:3', '3:4', '4:5', '9:16'])
function sizeFor(aspectRatio: AspectRatio | undefined): OpenAiSize {
  if (!aspectRatio || aspectRatio === '1:1') return '1024x1024'
  return PORTRAIT.has(aspectRatio) ? '1024x1536' : '1536x1024'
}

// imageSize (Gemini-Begriff) grob auf OpenAI-quality abbilden.
function qualityFor(imageSize: ImageSize | undefined): OpenAiQuality {
  return imageSize === '1K' ? 'medium' : 'high'
}

// gpt-image-1: feste Pro-Bild-Preise (USD, Stand Mitte 2026).
const PRICE_GPT_IMAGE_1: Record<OpenAiQuality, Record<OpenAiSize, number>> = {
  low: { '1024x1024': 0.011, '1536x1024': 0.016, '1024x1536': 0.016 },
  medium: { '1024x1024': 0.042, '1536x1024': 0.063, '1024x1536': 0.063 },
  high: { '1024x1024': 0.166, '1536x1024': 0.249, '1024x1536': 0.249 },
}
// gpt-image-2: token-basiert — grobe Schätzung pro Bild je quality.
const PRICE_GPT_IMAGE_2: Record<OpenAiQuality, number> = {
  low: 0.02,
  medium: 0.05,
  high: 0.1,
}

function priceFor(modelId: string, size: OpenAiSize, quality: OpenAiQuality): number {
  if (modelId === GPT_IMAGE_2) return PRICE_GPT_IMAGE_2[quality]
  return PRICE_GPT_IMAGE_1[quality][size]
}

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error(
      'OPENAI_API_KEY ist nicht gesetzt. Trage ihn in die .env-Datei ein (siehe .env.example).',
    )
  }
  return new OpenAI({ apiKey })
}

export const openaiProvider: ImageProvider = {
  id: 'openai',
  apiKeyEnv: 'OPENAI_API_KEY',
  models: OPENAI_MODELS,
  async generate(req: GenerateRequest): Promise<GenerateResult> {
    const { modelId, promptText, references = [], params = {} } = req
    const client = getClient()
    const size = sizeFor(params.aspectRatio)
    const quality = qualityFor(params.imageSize)
    const n = Math.max(1, Math.min(params.count ?? 1, 4))

    const supportsRefs =
      OPENAI_MODELS.find((m) => m.id === modelId)?.supportsReferences ?? false
    const useEdit = supportsRefs && references.length > 0

    let data: Array<{ b64_json?: string }>
    try {
      if (useEdit) {
        // Anker-Bilder als Referenz für Stil-Konsistenz mitschicken.
        const images = await Promise.all(
          references.map((ref, i) =>
            toFile(Buffer.from(ref.data, 'base64'), `ref-${i}.png`, {
              type: ref.mimeType,
            }),
          ),
        )
        const res = await client.images.edit({
          model: modelId,
          image: images,
          prompt: promptText,
          size,
          quality,
          n,
          input_fidelity: 'high',
        })
        data = res.data ?? []
      } else {
        const res = await client.images.generate({
          model: modelId,
          prompt: promptText,
          size,
          quality,
          n,
          output_format: 'png',
        })
        data = res.data ?? []
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      throw new Error(`OpenAI-Bildgenerierung fehlgeschlagen: ${msg}`)
    }

    const images: Array<GeneratedImage> = data
      .filter((d): d is { b64_json: string } => typeof d.b64_json === 'string')
      .map((d) => ({ data: d.b64_json, mimeType: 'image/png' }))

    if (images.length === 0) {
      throw new Error('OpenAI hat kein Bild zurückgegeben.')
    }

    return {
      images,
      costUsd: priceFor(modelId, size, quality) * images.length,
    }
  },
}
