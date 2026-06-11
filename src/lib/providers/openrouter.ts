import type {
  GenerateRequest,
  GenerateResult,
  GeneratedImage,
  ImageProvider,
  ModelDescriptor,
} from './types'

// OpenRouter-Bildgenerierung über den OpenAI-kompatiblen Chat-Completions-
// Endpoint mit `modalities: ["image","text"]`. Bewusst raw `fetch` statt des
// `openai`-SDK: `modalities`, `image_config`, `message.images` und `usage.cost`
// sind nicht Teil der OpenAI-Typen.
//
// Modellliste ist kuratiert (sinnvolle Bild-Output-Modelle), Preise werden
// zusätzlich live aus `/models` gezogen — die tatsächlichen Kosten kommen aber
// bevorzugt aus `usage.cost` der Generierungs-Response.

const BASE_URL = 'https://openrouter.ai/api/v1'

const ALL_RATIOS = [
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
] as const

// Kuratierte Bild-Output-Modelle (verifiziert gegen GET /api/v1/models).
// `supportsImageConfig`: nur die Gemini-Familie akzeptiert `image_config`
// (aspect_ratio/image_size). Keines der Modelle exponiert Seeds.
interface OrModelMeta extends ModelDescriptor {
  supportsImageConfig: boolean
}

const OPENROUTER_MODELS: Array<OrModelMeta> = [
  {
    id: 'google/gemini-3-pro-image-preview',
    label: 'OpenRouter · Nano Banana Pro (Gemini 3 Pro Image)',
    maxReferenceImages: 11,
    supportsSeed: false,
    supportsReferences: true,
    supportsImageConfig: true,
    imageSizes: ['1K', '2K', '4K'],
    aspectRatios: [...ALL_RATIOS],
  },
  {
    id: 'google/gemini-3.1-flash-image-preview',
    label: 'OpenRouter · Nano Banana 2 (Gemini 3.1 Flash Image)',
    maxReferenceImages: 11,
    supportsSeed: false,
    supportsReferences: true,
    supportsImageConfig: true,
    imageSizes: ['1K', '2K', '4K'],
    aspectRatios: [...ALL_RATIOS],
  },
  {
    id: 'google/gemini-2.5-flash-image',
    label: 'OpenRouter · Nano Banana (Gemini 2.5 Flash Image)',
    maxReferenceImages: 11,
    supportsSeed: false,
    supportsReferences: true,
    supportsImageConfig: true,
    imageSizes: ['1K', '2K', '4K'],
    aspectRatios: [...ALL_RATIOS],
  },
  {
    id: 'openai/gpt-5-image',
    label: 'OpenRouter · GPT-5 Image',
    maxReferenceImages: 16,
    supportsSeed: false,
    supportsReferences: true,
    supportsImageConfig: false,
    imageSizes: ['1K', '2K', '4K'],
    aspectRatios: [...ALL_RATIOS],
  },
  {
    id: 'openai/gpt-5-image-mini',
    label: 'OpenRouter · GPT-5 Image Mini',
    maxReferenceImages: 16,
    supportsSeed: false,
    supportsReferences: true,
    supportsImageConfig: false,
    imageSizes: ['1K', '2K', '4K'],
    aspectRatios: [...ALL_RATIOS],
  },
]

function modelMeta(modelId: string): OrModelMeta | undefined {
  return OPENROUTER_MODELS.find((m) => m.id === modelId)
}

function getApiKey(): string {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error(
      'OPENROUTER_API_KEY ist nicht gesetzt. Trage ihn in die .env-Datei ein (siehe .env.example).',
    )
  }
  return apiKey
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${getApiKey()}`,
    'Content-Type': 'application/json',
  }
  // Optionale Attribution-Header (OpenRouter-Empfehlung).
  const referer = process.env.OPENROUTER_HTTP_REFERER
  const title = process.env.OPENROUTER_APP_TITLE
  if (referer) headers['HTTP-Referer'] = referer
  if (title) headers['X-Title'] = title
  return headers
}

// ── Live-Preise (Hybrid: kuratierte Liste + Preise aus /models) ──────────────
// Pro-Bild-Preis als Fallback, falls `usage.cost` einer Generierung fehlt.
interface PriceCache {
  at: number
  byModel: Map<string, number>
}
let priceCache: PriceCache | null = null
const PRICE_TTL_MS = 6 * 60 * 60 * 1000 // 6 h

async function imagePriceFor(modelId: string, nowMs: number): Promise<number> {
  if (!priceCache || nowMs - priceCache.at > PRICE_TTL_MS) {
    try {
      const res = await fetch(`${BASE_URL}/models`, { headers: authHeaders() })
      const json = (await res.json()) as {
        data?: Array<{ id: string; pricing?: { image?: string } }>
      }
      const byModel = new Map<string, number>()
      for (const m of json.data ?? []) {
        const p = Number(m.pricing?.image)
        if (Number.isFinite(p) && p > 0) byModel.set(m.id, p)
      }
      priceCache = { at: nowMs, byModel }
    } catch {
      // Preisliste optional — bei Fehler leeren Cache setzen, nicht crashen.
      priceCache = { at: nowMs, byModel: new Map() }
    }
  }
  return priceCache.byModel.get(modelId) ?? 0
}

// ── Generierung ──────────────────────────────────────────────────────────────
interface OrImagePart {
  image_url?: { url?: string }
}
interface OrResponse {
  choices?: Array<{ message?: { images?: Array<OrImagePart> } }>
  usage?: { cost?: number }
  error?: { message?: string }
}

function parseDataUrl(url: string): GeneratedImage | null {
  const match = /^data:([^;]+);base64,(.+)$/s.exec(url)
  if (!match) return null
  return { mimeType: match[1], data: match[2] }
}

interface OnceResult {
  image: GeneratedImage | null
  cost: number
}

async function generateOnce(req: GenerateRequest): Promise<OnceResult> {
  const { modelId, promptText, references = [], params = {} } = req
  const meta = modelMeta(modelId)
  const useRefs = (meta?.supportsReferences ?? false) && references.length > 0

  const content: Array<Record<string, unknown>> = [
    { type: 'text', text: promptText },
  ]
  if (useRefs) {
    for (const ref of references) {
      content.push({
        type: 'image_url',
        image_url: { url: `data:${ref.mimeType};base64,${ref.data}` },
      })
    }
  }

  const body: Record<string, unknown> = {
    model: modelId,
    messages: [{ role: 'user', content }],
    modalities: ['image', 'text'],
    usage: { include: true },
  }
  if (meta?.supportsImageConfig) {
    body.image_config = {
      aspect_ratio: params.aspectRatio ?? '1:1',
      image_size: params.imageSize ?? '2K',
    }
  }

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  })

  let json: OrResponse
  try {
    json = (await res.json()) as OrResponse
  } catch {
    throw new Error(
      `OpenRouter-Antwort konnte nicht gelesen werden (HTTP ${res.status}).`,
    )
  }
  if (!res.ok) {
    const msg = json.error?.message ?? `HTTP ${res.status}`
    throw new Error(`OpenRouter-Bildgenerierung fehlgeschlagen: ${msg}`)
  }

  const url = json.choices?.[0]?.message?.images?.[0]?.image_url?.url
  const image = typeof url === 'string' ? parseDataUrl(url) : null
  const cost = typeof json.usage?.cost === 'number' ? json.usage.cost : 0
  return { image, cost }
}

export const openrouterProvider: ImageProvider = {
  id: 'openrouter',
  apiKeyEnv: 'OPENROUTER_API_KEY',
  models: OPENROUTER_MODELS,
  async generate(req: GenerateRequest): Promise<GenerateResult> {
    const count = Math.max(1, Math.min(req.params?.count ?? 1, 4))

    // N Varianten = N separate Calls (Image-Modality liefert 1 Bild pro Call).
    const results = await Promise.all(
      Array.from({ length: count }, () => generateOnce(req)),
    )

    const images = results
      .map((r) => r.image)
      .filter((x): x is GeneratedImage => x !== null)

    if (images.length === 0) {
      throw new Error(
        'OpenRouter hat kein Bild zurückgegeben (evtl. Safety-Filter, ungültiger Prompt oder das Modell liefert keinen Bild-Output).',
      )
    }

    // Kosten bevorzugt aus usage.cost (tatsächlich). Fallback: Live-Pro-Bild-
    // Preis aus /models × Anzahl Bilder, falls usage.cost gefehlt hat.
    const reportedCost = results.reduce((sum, r) => sum + r.cost, 0)
    let costUsd = reportedCost
    if (reportedCost === 0) {
      const now = Date.now()
      const unit = await imagePriceFor(req.modelId, now)
      costUsd = unit * images.length
    }

    return { images, costUsd }
  },
}
