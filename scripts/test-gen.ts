// Einmaliger End-to-End-Test: Provider + Prompt-Kompilierung wie in der App.
// Aufruf: npm run test:gen   (generiert 1 Bild in 1K -> /tmp/iss-test.png)
import { writeFileSync } from 'node:fs'
import { geminiProvider } from '../src/lib/providers/gemini.ts'
import { compilePrompt } from '../src/lib/prompt/compile.ts'

const styleJson = {
  type: 'photographic',
  camera: { lens_mm: 35, aperture: 'f/2.0' },
  lighting: { setup: 'soft window light', color_temperature_k: 5200 },
  color: { film_emulation: 'Kodak Portra 400', grade: 'lifted shadows, muted saturation' },
  mood: 'calm, editorial, premium',
  negative: 'no HDR look, no oversaturation',
}

const { promptText } = compilePrompt({
  styleJson,
  subject: 'a ceramic coffee cup on a wooden desk next to a laptop',
})

console.log('Prompt:\n', promptText, '\n')
console.log('Generiere 1 Bild (1K) …')

const result = await geminiProvider.generate({
  modelId: 'gemini-3-pro-image',
  promptText,
  params: { aspectRatio: '4:5', imageSize: '1K', count: 1, thinkingLevel: 'high' },
})

const img = result.images[0]
const buf = Buffer.from(img.data, 'base64')
writeFileSync('/tmp/iss-test.png', buf)
console.log(
  `OK: ${result.images.length} Bild, ${buf.length} Bytes, mime=${img.mimeType}, ~$${result.costUsd.toFixed(3)} -> /tmp/iss-test.png`,
)
