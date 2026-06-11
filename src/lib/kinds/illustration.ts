// Bildart "Illustration" — Vektor, 3D-Render, Aquarell, Line-Art, Comic …
// Eigenes Schema + Formular-Gruppen, unabhängig vom Foto-Schema.
import { z } from 'zod'
import type { JsonObject } from '#/lib/json'
import type { GroupDef, FieldDef } from '#/lib/schema/fields'
import type { StylePreset } from '#/lib/presets'
import { makeValidator } from './types'
import type { KindDef, TopFieldDef } from './types'

// ---- Taxonomie (Vorschlagswerte für die Datalists) ----
const TECHNIQUES = [
  'flat vector',
  'line art',
  'watercolor',
  'gouache',
  '3D render',
  'isometric',
  'comic / cel',
  'claymation',
  'pixel art',
  'papercut / collage',
  'low-poly',
  'risograph',
] as const

const LINE_WEIGHTS = ['none', 'thin', 'medium', 'bold', 'variable'] as const
const SHADING = ['flat / none', 'cel / hard', 'soft gradient', 'cross-hatch'] as const
const OUTLINE = ['no outline', 'dark outline', 'colored outline', 'white outline'] as const
const DETAIL_LEVEL = ['minimal', 'moderate', 'highly detailed'] as const
const SATURATION = ['vibrant', 'balanced', 'muted', 'monochrome'] as const
const HARMONY = ['complementary', 'analogous', 'triadic', 'pastel', 'neon', 'earth tones'] as const
const BACKGROUND_TYPE = ['solid color', 'gradient', 'full scene', 'transparent', 'pattern'] as const
const SURFACE = ['clean / smooth', 'paper grain', 'canvas', 'halftone', 'grain / noise'] as const

// ---- Zod-Schema (looseObject = JSON-Escape-Hatch bleibt erhalten) ----
const style = z.looseObject({
  technique: z.string().optional(),
  line_weight: z.string().optional(),
  shading: z.string().optional(),
  outline: z.string().optional(),
  detail_level: z.string().optional(),
})

const color = z.looseObject({
  palette: z.array(z.string()).optional(),
  saturation: z.string().optional(),
  harmony: z.string().optional(),
})

const background = z.looseObject({
  type: z.string().optional(),
  description: z.string().optional(),
})

const texture = z.looseObject({
  surface: z.string().optional(),
})

export const illustrationSchema = z.looseObject({
  type: z.string().optional(),
  style: style.optional(),
  color: color.optional(),
  background: background.optional(),
  texture: texture.optional(),
  mood: z.string().optional(),
  negative: z.string().optional(),
})

// ---- Formular-Gruppen ----
const styleFields: Array<FieldDef> = [
  {
    key: 'technique',
    label: 'Technik',
    type: 'text',
    options: TECHNIQUES,
    placeholder: 'z.B. flat vector',
    help: 'Grundtechnik der Illustration — bestimmt den Gesamtcharakter (flach/vektoriell, 3D, aquarelliert, Comic …).',
  },
  {
    key: 'line_weight',
    label: 'Linienstärke',
    type: 'text',
    options: LINE_WEIGHTS,
    help: 'Stärke der Konturlinien: keine (rein flächig), dünn/fein bis kräftig oder variabel (handgezeichnet).',
  },
  {
    key: 'shading',
    label: 'Schattierung',
    type: 'text',
    options: SHADING,
    help: 'Wie Volumen entsteht: flach (keine), Cel/hart (klare Stufen, Comic), weicher Verlauf oder Schraffur.',
  },
  {
    key: 'outline',
    label: 'Kontur',
    type: 'text',
    options: OUTLINE,
    help: 'Umrandung der Formen — ohne, dunkle, farbige oder weiße Kontur. Prägt den Stil stark (z.B. Sticker-Look).',
  },
  {
    key: 'detail_level',
    label: 'Detailgrad',
    type: 'text',
    options: DETAIL_LEVEL,
    help: 'Wie fein ausgearbeitet — minimalistisch/ikonisch bis hochdetailliert.',
  },
]

const colorFields: Array<FieldDef> = [
  {
    key: 'palette',
    label: 'Palette',
    type: 'colorlist',
    help: 'Gezielte Farbpalette per Farbwähler — hält Illustrationen markenkonsistent.',
  },
  {
    key: 'saturation',
    label: 'Sättigung',
    type: 'text',
    options: SATURATION,
    help: 'Farbintensität: kräftig, ausgewogen, gedämpft oder monochrom.',
  },
  {
    key: 'harmony',
    label: 'Farbharmonie',
    type: 'text',
    options: HARMONY,
    help: 'Beziehung der Farben zueinander: komplementär (Kontrast), analog (verwandt), pastell, neon, Erdtöne …',
  },
]

const backgroundFields: Array<FieldDef> = [
  {
    key: 'type',
    label: 'Hintergrund',
    type: 'text',
    options: BACKGROUND_TYPE,
    help: 'Volltonfarbe, Verlauf, ganze Szene, transparent (freigestellt) oder Muster.',
  },
  {
    key: 'description',
    label: 'Hintergrund-Detail',
    type: 'text',
    placeholder: 'z.B. soft gradient pink to orange',
    help: 'Optionale Beschreibung des Hintergrunds (Farben, Szene, Muster).',
  },
]

const textureFields: Array<FieldDef> = [
  {
    key: 'surface',
    label: 'Oberfläche',
    type: 'text',
    options: SURFACE,
    help: 'Oberflächentextur: clean/glatt (digital), Papier-/Leinwandkorn, Halftone-Raster oder Rauschen.',
  },
]

const groups: Array<GroupDef> = [
  { key: 'style', label: 'Stil', fields: styleFields },
  { key: 'color', label: 'Farbe', fields: colorFields },
  { key: 'background', label: 'Hintergrund', fields: backgroundFields },
  { key: 'texture', label: 'Textur', fields: textureFields },
]

const topFields: Array<TopFieldDef> = [
  {
    key: 'mood',
    label: 'Stimmung / Mood',
    options: ['friendly, modern, clean', 'playful, bold', 'elegant, minimal', 'dreamy, soft', 'retro, nostalgic'],
    help: 'Gesamtstimmung in Worten — fasst den emotionalen Look zusammen.',
  },
  {
    key: 'negative',
    label: 'Negative (Stil-Guards)',
    placeholder: 'z.B. no photorealism, no messy lines',
    help: 'Was vermieden werden soll — hält den Illustrationsstil sauber (z.B. „no photorealism").',
  },
]

const defaultStyle: JsonObject = {
  type: 'illustration',
  style: {
    technique: 'flat vector',
    line_weight: 'medium',
    shading: 'cel / hard',
    detail_level: 'moderate',
  },
  color: { saturation: 'vibrant', harmony: 'complementary' },
  background: { type: 'solid color' },
  mood: 'friendly, modern, clean',
  negative: 'no photorealism, no 3D unless specified, no messy lines',
}

const presets: Array<StylePreset> = [
  {
    id: 'flat-vector-brand',
    name: 'Flat Vector Brand',
    category: 'Vektor',
    description: 'Flache Vektorflächen, klare Konturen, kräftige Markenfarben — modern & sauber.',
    styleJson: {
      type: 'illustration',
      style: { technique: 'flat vector', line_weight: 'medium', shading: 'flat / none', outline: 'dark outline', detail_level: 'moderate' },
      color: { saturation: 'vibrant', harmony: 'complementary' },
      background: { type: 'solid color' },
      texture: { surface: 'clean / smooth' },
      mood: 'friendly, modern, clean, corporate',
      negative: 'no photorealism, no gradients unless specified, no clutter',
    },
  },
  {
    id: 'watercolor-storybook',
    name: 'Watercolor Storybook',
    category: 'Traditionell',
    description: 'Weiche Aquarellverläufe, Papierkorn, zarte Farben — wie ein Kinderbuch.',
    styleJson: {
      type: 'illustration',
      style: { technique: 'watercolor', line_weight: 'thin', shading: 'soft gradient', outline: 'no outline', detail_level: 'moderate' },
      color: { saturation: 'muted', harmony: 'pastel' },
      background: { type: 'full scene', description: 'soft washed paper background' },
      texture: { surface: 'paper grain' },
      mood: 'dreamy, soft, gentle, storybook',
      negative: 'no hard digital edges, no neon colors',
    },
  },
  {
    id: 'isometric-3d',
    name: 'Isometric 3D',
    category: '3D',
    description: 'Isometrische 3D-Render, weiche Schatten, sauberes Studio — Tech & SaaS.',
    styleJson: {
      type: 'illustration',
      style: { technique: 'isometric', line_weight: 'none', shading: 'soft gradient', outline: 'no outline', detail_level: 'highly detailed' },
      color: { saturation: 'balanced', harmony: 'analogous' },
      background: { type: 'gradient', description: 'subtle soft gradient' },
      texture: { surface: 'clean / smooth' },
      mood: 'modern, technical, premium',
      negative: 'no flat 2D look, no harsh shadows',
    },
  },
  {
    id: 'bold-comic-cel',
    name: 'Bold Comic / Cel',
    category: 'Comic',
    description: 'Kräftige Konturen, Cel-Shading, Halftone-Punkte — energiegeladen wie ein Comic.',
    styleJson: {
      type: 'illustration',
      style: { technique: 'comic / cel', line_weight: 'bold', shading: 'cel / hard', outline: 'dark outline', detail_level: 'moderate' },
      color: { saturation: 'vibrant', harmony: 'complementary' },
      background: { type: 'pattern', description: 'halftone dots' },
      texture: { surface: 'halftone' },
      mood: 'playful, bold, energetic, pop',
      negative: 'no soft gradients, no muted colors',
    },
  },
]

const presetCategories: Array<string> = ['Vektor', 'Traditionell', '3D', 'Comic']

export const illustrationKind: KindDef = {
  kind: 'illustration',
  label: 'Illustration',
  description:
    'Gezeichnet/gerendert — Technik, Linien, Schattierung, Farbharmonie, Textur.',
  groups,
  topFields,
  defaultStyle,
  exampleSubject:
    'a cheerful fox riding a bicycle through a sunny park, balloons tied to the basket',
  presets,
  presetCategories,
  dynamicOptionKeys: [],
  validate: makeValidator(illustrationSchema),
}
