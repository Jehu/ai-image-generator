import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { openrouterProvider } from './openrouter'
import type { GenerateRequest } from './types'

// 1×1 transparentes PNG (base64, ohne data:-Präfix).
const PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

function okResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  } as unknown as Response
}

function imageBody(cost?: number) {
  return {
    choices: [
      {
        message: {
          images: [
            { image_url: { url: `data:image/png;base64,${PNG_B64}` } },
          ],
        },
      },
    ],
    ...(cost !== undefined ? { usage: { cost } } : {}),
  }
}

function baseReq(over: Partial<GenerateRequest> = {}): GenerateRequest {
  return {
    modelId: 'google/gemini-3-pro-image-preview',
    promptText: '{"subject":"cat"}',
    params: { count: 1, aspectRatio: '16:9', imageSize: '2K' },
    ...over,
  }
}

describe('openrouterProvider', () => {
  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = 'test-key'
  })
  afterEach(() => {
    vi.restoreAllMocks()
    delete process.env.OPENROUTER_API_KEY
  })

  it('parst das Bild aus message.images[].image_url.url', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(okResponse(imageBody(0.012)))

    const res = await openrouterProvider.generate(baseReq())

    expect(res.images).toHaveLength(1)
    expect(res.images[0]).toEqual({ data: PNG_B64, mimeType: 'image/png' })
    expect(res.costUsd).toBeCloseTo(0.012)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('schickt image_config nur an Gemini-Modelle und Referenzen als image_url-Parts', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(okResponse(imageBody(0.01)))

    await openrouterProvider.generate(
      baseReq({
        references: [{ mimeType: 'image/png', data: PNG_B64 }],
      }),
    )

    const init = fetchMock.mock.calls[0][1] as RequestInit
    const sent = JSON.parse(init.body as string)
    expect(sent.modalities).toEqual(['image', 'text'])
    expect(sent.image_config).toEqual({ aspect_ratio: '16:9', image_size: '2K' })
    expect(sent.usage).toEqual({ include: true })
    const parts = sent.messages[0].content
    expect(parts[0]).toEqual({ type: 'text', text: '{"subject":"cat"}' })
    expect(parts[1].type).toBe('image_url')
    expect(parts[1].image_url.url).toBe(`data:image/png;base64,${PNG_B64}`)
  })

  it('sendet kein image_config an OpenAI-Modelle', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(okResponse(imageBody(0.02)))

    await openrouterProvider.generate(
      baseReq({ modelId: 'openai/gpt-5-image' }),
    )

    const sent = JSON.parse(
      (fetchMock.mock.calls[0][1] as RequestInit).body as string,
    )
    expect(sent.image_config).toBeUndefined()
  })

  it('macht N Calls für N Varianten und summiert die Kosten', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(okResponse(imageBody(0.01)))

    const res = await openrouterProvider.generate(
      baseReq({ params: { count: 3 } }),
    )

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(res.images).toHaveLength(3)
    expect(res.costUsd).toBeCloseTo(0.03)
  })

  it('fällt auf den Live-Pro-Bild-Preis zurück, wenn usage.cost fehlt', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.endsWith('/models')) {
          return okResponse({
            data: [
              {
                id: 'google/gemini-2.5-flash-image',
                pricing: { image: '0.04' },
              },
            ],
          })
        }
        return okResponse(imageBody()) // ohne usage.cost
      },
    )

    const res = await openrouterProvider.generate(
      baseReq({ modelId: 'google/gemini-2.5-flash-image' }),
    )
    expect(res.costUsd).toBeCloseTo(0.04)
  })

  it('wirft, wenn kein Bild zurückkommt', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      okResponse({ choices: [{ message: { images: [] } }] }),
    )
    await expect(openrouterProvider.generate(baseReq())).rejects.toThrow(
      /kein Bild/,
    )
  })

  it('wirft mit OpenRouter-Fehlermeldung bei HTTP-Fehler', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: { message: 'No auth credentials found' } }),
    } as unknown as Response)

    await expect(openrouterProvider.generate(baseReq())).rejects.toThrow(
      /No auth credentials found/,
    )
  })

  it('wirft ohne API-Key', async () => {
    delete process.env.OPENROUTER_API_KEY
    await expect(openrouterProvider.generate(baseReq())).rejects.toThrow(
      /OPENROUTER_API_KEY/,
    )
  })
})
