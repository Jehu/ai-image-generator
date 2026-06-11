import { GoogleGenAI, Modality, ThinkingLevel } from '@google/genai'
import type {
  GenerateRequest,
  GenerateResult,
  GeneratedImage,
  ImageProvider,
  ImageSize,
  ModelDescriptor,
  ThinkingLevelOpt,
} from './types'

// Preise pro generiertem Bild (USD), Stand Juni 2026 (Standard-Tier).
// Quelle: ai.google.dev/gemini-api/docs/pricing
const PRICE_PER_IMAGE: Record<string, Record<ImageSize, number>> = {
  'gemini-3-pro-image': { '1K': 0.134, '2K': 0.134, '4K': 0.24 },
  'gemini-3-pro-image-preview': { '1K': 0.134, '2K': 0.134, '4K': 0.24 },
}

const GEMINI_MODELS: Array<ModelDescriptor> = [
  {
    id: 'gemini-3-pro-image',
    label: 'Gemini 3 Pro Image (Nano Banana Pro)',
    maxReferenceImages: 11,
    supportsSeed: false,
    supportsReferences: true,
    imageSizes: ['1K', '2K', '4K'],
    aspectRatios: [
      '1:1',
      '2:3',
      '3:2',
      '3:4',
      '4:3',
      '4:5',
      '5:4',
      '9:16',
      '16:9',
      '21:9',
    ],
  },
]

const THINKING_MAP: Record<ThinkingLevelOpt, ThinkingLevel> = {
  minimal: ThinkingLevel.MINIMAL,
  low: ThinkingLevel.LOW,
  medium: ThinkingLevel.MEDIUM,
  high: ThinkingLevel.HIGH,
}

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY ist nicht gesetzt. Trage ihn in die .env-Datei ein (siehe .env.example).',
    )
  }
  return new GoogleGenAI({ apiKey })
}

function priceFor(modelId: string, size: ImageSize): number {
  return PRICE_PER_IMAGE[modelId]?.[size] ?? 0
}

async function generateOnce(
  ai: GoogleGenAI,
  req: GenerateRequest,
): Promise<GeneratedImage | null> {
  const { modelId, promptText, references = [], params = {} } = req

  const parts: Array<Record<string, unknown>> = []
  for (const ref of references) {
    parts.push({ inlineData: { mimeType: ref.mimeType, data: ref.data } })
  }
  parts.push({ text: promptText })

  const response = await ai.models.generateContent({
    model: modelId,
    contents: [{ role: 'user', parts: parts }],
    config: {
      responseModalities: [Modality.TEXT, Modality.IMAGE],
      imageConfig: {
        aspectRatio: params.aspectRatio ?? '1:1',
        imageSize: params.imageSize ?? '2K',
      },
      ...(params.thinkingLevel
        ? {
            thinkingConfig: {
              thinkingLevel: THINKING_MAP[params.thinkingLevel],
            },
          }
        : {}),
    },
  })

  const candidateParts = response.candidates?.[0]?.content?.parts ?? []
  for (const part of candidateParts) {
    if (part.inlineData?.data) {
      return {
        data: part.inlineData.data,
        mimeType: part.inlineData.mimeType ?? 'image/png',
      }
    }
  }
  return null
}

export const geminiProvider: ImageProvider = {
  id: 'gemini',
  apiKeyEnv: 'GEMINI_API_KEY',
  models: GEMINI_MODELS,
  async generate(req: GenerateRequest): Promise<GenerateResult> {
    const ai = getClient()
    const count = Math.max(1, Math.min(req.params?.count ?? 1, 4))
    const size = req.params?.imageSize ?? '2K'

    // N Varianten = N separate Calls (Gemini 3 Image liefert pro Call 1 Bild).
    const results = await Promise.all(
      Array.from({ length: count }, () => generateOnce(ai, req)),
    )
    const images = results.filter((x): x is GeneratedImage => x !== null)

    if (images.length === 0) {
      throw new Error(
        'Gemini hat kein Bild zurückgegeben (evtl. durch Safety-Filter blockiert oder ungültiger Prompt).',
      )
    }

    return {
      images,
      costUsd: priceFor(req.modelId, size) * images.length,
    }
  },
}
