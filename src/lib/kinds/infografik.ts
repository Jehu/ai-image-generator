// Bildart "Infografik" — Layout, Icon-/Visual-System, Farb-System, Typografie.
// Inhalt/Daten kommen über das Motiv (subject); der Stil definiert das visuelle
// System. Nano Banana Pro rendert Text gut — die Typografie-Hints zählen.
import { z } from 'zod'
import type { JsonObject } from '#/lib/json'
import type { GroupDef, FieldDef } from '#/lib/schema/fields'
import type { StylePreset } from '#/lib/presets'
import { makeValidator } from './types'
import type { KindDef, TopFieldDef } from './types'

// ---- Taxonomie ----
const STRUCTURE = [
  'grid',
  'flow / process',
  'timeline',
  'comparison',
  'hierarchy / tree',
  'dashboard',
  'cycle',
] as const

const DATA_DENSITY = ['sparse', 'balanced', 'dense'] as const
const ALIGNMENT = ['centered', 'left-aligned', 'modular grid'] as const
const ICON_STYLE = ['line', 'filled', 'duotone', 'flat', '3D'] as const
const SHAPES = ['rounded', 'sharp', 'mixed'] as const
const CONNECTORS = ['arrows', 'lines', 'none'] as const
const ACCENT = ['single accent', 'dual accent', 'multi-color'] as const
const BACKGROUND_TONE = ['light', 'dark', 'neutral'] as const
const FONT_FAMILY = ['geometric sans-serif', 'humanist sans-serif', 'serif', 'monospace'] as const
const FONT_WEIGHT = ['light', 'regular', 'bold'] as const
const HIERARCHY = ['clear title + labels', 'numbered steps', 'minimal text'] as const

// ---- Zod-Schema ----
const layout = z.looseObject({
  structure: z.string().optional(),
  data_density: z.string().optional(),
  alignment: z.string().optional(),
})

const visual_system = z.looseObject({
  icon_style: z.string().optional(),
  shapes: z.string().optional(),
  connectors: z.string().optional(),
})

const color_system = z.looseObject({
  palette: z.array(z.string()).optional(),
  accent: z.string().optional(),
  background_tone: z.string().optional(),
})

const typography = z.looseObject({
  family: z.string().optional(),
  weight: z.string().optional(),
  hierarchy: z.string().optional(),
})

const elements = z.looseObject({
  labels: z.boolean().optional(),
  legend: z.boolean().optional(),
  callouts: z.boolean().optional(),
})

export const infografikSchema = z.looseObject({
  type: z.string().optional(),
  layout: layout.optional(),
  visual_system: visual_system.optional(),
  color_system: color_system.optional(),
  typography: typography.optional(),
  elements: elements.optional(),
  mood: z.string().optional(),
  negative: z.string().optional(),
})

// ---- Formular-Gruppen ----
const layoutFields: Array<FieldDef> = [
  {
    key: 'structure',
    label: 'Struktur',
    type: 'text',
    options: STRUCTURE,
    help: 'Grundanordnung: Raster, Prozess/Flow, Timeline, Vergleich, Hierarchie/Baum, Dashboard oder Kreislauf.',
  },
  {
    key: 'data_density',
    label: 'Datendichte',
    type: 'text',
    options: DATA_DENSITY,
    help: 'Wie viel Information pro Fläche: luftig (sparse), ausgewogen oder dicht.',
  },
  {
    key: 'alignment',
    label: 'Ausrichtung',
    type: 'text',
    options: ALIGNMENT,
    help: 'Zentriert, linksbündig oder modulares Raster.',
  },
]

const visualFields: Array<FieldDef> = [
  {
    key: 'icon_style',
    label: 'Icon-Stil',
    type: 'text',
    options: ICON_STYLE,
    help: 'Linien-Icons (leicht), gefüllt (kräftig), duotone, flat oder 3D.',
  },
  {
    key: 'shapes',
    label: 'Formen',
    type: 'text',
    options: SHAPES,
    help: 'Ecken/Kanten: abgerundet (freundlich), scharf (technisch) oder gemischt.',
  },
  {
    key: 'connectors',
    label: 'Verbindungen',
    type: 'text',
    options: CONNECTORS,
    help: 'Wie Elemente verbunden werden: Pfeile, Linien oder keine.',
  },
]

const colorFields: Array<FieldDef> = [
  {
    key: 'palette',
    label: 'Palette',
    type: 'colorlist',
    help: 'Markenfarben per Farbwähler — hält Infografiken konsistent.',
  },
  {
    key: 'accent',
    label: 'Akzent',
    type: 'text',
    options: ACCENT,
    help: 'Akzentstrategie: eine Akzentfarbe, zwei oder mehrfarbig (z.B. je Kategorie eine Farbe).',
  },
  {
    key: 'background_tone',
    label: 'Hintergrund-Ton',
    type: 'text',
    options: BACKGROUND_TONE,
    help: 'Heller, dunkler oder neutraler Hintergrund.',
  },
]

const typographyFields: Array<FieldDef> = [
  {
    key: 'family',
    label: 'Schriftart',
    type: 'text',
    options: FONT_FAMILY,
    help: 'Schriftcharakter: geometrisch/humanistisch grotesk (modern), Serif (klassisch) oder Monospace (technisch).',
  },
  {
    key: 'weight',
    label: 'Schriftstärke',
    type: 'text',
    options: FONT_WEIGHT,
    help: 'Leicht, normal oder fett — fett betont Titel/Kennzahlen.',
  },
  {
    key: 'hierarchy',
    label: 'Text-Hierarchie',
    type: 'text',
    options: HIERARCHY,
    help: 'Klarer Titel + Labels, nummerierte Schritte oder minimaler Text.',
  },
]

const elementsFields: Array<FieldDef> = [
  {
    key: 'labels',
    label: 'Beschriftungen',
    type: 'boolean',
    help: 'Textlabels an den Elementen anzeigen.',
  },
  {
    key: 'legend',
    label: 'Legende',
    type: 'boolean',
    help: 'Erklärende Legende einblenden.',
  },
  {
    key: 'callouts',
    label: 'Callouts',
    type: 'boolean',
    help: 'Hervorhebungen/Sprechblasen für Schlüsselzahlen.',
  },
]

const groups: Array<GroupDef> = [
  { key: 'layout', label: 'Layout', fields: layoutFields },
  { key: 'visual_system', label: 'Visual-System', fields: visualFields },
  { key: 'color_system', label: 'Farb-System', fields: colorFields },
  { key: 'typography', label: 'Typografie', fields: typographyFields },
  { key: 'elements', label: 'Elemente', fields: elementsFields },
]

const topFields: Array<TopFieldDef> = [
  {
    key: 'mood',
    label: 'Stimmung / Mood',
    options: ['clear, professional, modern', 'bold, editorial', 'friendly, approachable', 'technical, precise'],
    help: 'Gesamtanmutung der Infografik in Worten.',
  },
  {
    key: 'negative',
    label: 'Negative (Stil-Guards)',
    placeholder: 'z.B. no clutter, no unreadable text',
    help: 'Was vermieden werden soll — z.B. „no clutter, no unreadable text, no decorative noise".',
  },
]

const defaultStyle: JsonObject = {
  type: 'infographic',
  layout: { structure: 'grid', data_density: 'balanced', alignment: 'modular grid' },
  visual_system: { icon_style: 'line', shapes: 'rounded', connectors: 'arrows' },
  color_system: { accent: 'single accent', background_tone: 'light' },
  typography: { family: 'geometric sans-serif', weight: 'bold', hierarchy: 'clear title + labels' },
  elements: { labels: true },
  mood: 'clear, professional, modern',
  negative: 'no clutter, no unreadable text, no decorative noise, no misspelled labels',
}

const presets: Array<StylePreset> = [
  {
    id: 'clean-corporate',
    name: 'Clean Corporate',
    category: 'Business',
    description: 'Helles modulares Raster, Linien-Icons, eine Akzentfarbe — seriös und übersichtlich.',
    params: { aspectRatio: '4:5' },
    styleJson: {
      type: 'infographic',
      layout: { structure: 'grid', data_density: 'balanced', alignment: 'modular grid' },
      visual_system: { icon_style: 'line', shapes: 'rounded', connectors: 'lines' },
      color_system: { palette: ['#2563EB', '#1E293B', '#94A3B8'], accent: 'single accent', background_tone: 'light' },
      typography: { family: 'geometric sans-serif', weight: 'bold', hierarchy: 'clear title + labels' },
      elements: { labels: true, legend: true },
      mood: 'clear, professional, modern, corporate',
      negative: 'no clutter, no unreadable text, no decorative noise',
    },
  },
  {
    id: 'bold-editorial',
    name: 'Bold Editorial',
    category: 'Editorial',
    description: 'Kräftige Farben, gefüllte Icons, große fette Kennzahlen — wie ein Magazin.',
    styleJson: {
      type: 'infographic',
      layout: { structure: 'comparison', data_density: 'sparse', alignment: 'centered' },
      visual_system: { icon_style: 'filled', shapes: 'sharp', connectors: 'none' },
      color_system: { palette: ['#F97316', '#0F172A', '#FACC15'], accent: 'dual accent', background_tone: 'light' },
      typography: { family: 'serif', weight: 'bold', hierarchy: 'clear title + labels' },
      elements: { labels: true, callouts: true },
      mood: 'bold, editorial, confident',
      negative: 'no tiny text, no muted colors',
    },
  },
  {
    id: 'dark-dashboard',
    name: 'Dark Dashboard',
    category: 'Dashboard',
    description: 'Dunkler Hintergrund, Neon-Akzente, dichte Kacheln — wie ein Analytics-Dashboard.',
    params: { aspectRatio: '16:9' },
    styleJson: {
      type: 'infographic',
      layout: { structure: 'dashboard', data_density: 'dense', alignment: 'modular grid' },
      visual_system: { icon_style: 'duotone', shapes: 'rounded', connectors: 'none' },
      color_system: { palette: ['#22D3EE', '#A78BFA', '#0B1220'], accent: 'multi-color', background_tone: 'dark' },
      typography: { family: 'monospace', weight: 'regular', hierarchy: 'minimal text' },
      elements: { labels: true, legend: true },
      mood: 'technical, precise, data-driven',
      negative: 'no light background, no clutter, no unreadable text',
    },
  },
  {
    id: 'timeline-process',
    name: 'Timeline / Process',
    category: 'Prozess',
    description: 'Nummerierte Schritte entlang einer Achse, Pfeile, freundliche Formen — Abläufe erklären.',
    styleJson: {
      type: 'infographic',
      layout: { structure: 'timeline', data_density: 'balanced', alignment: 'left-aligned' },
      visual_system: { icon_style: 'flat', shapes: 'rounded', connectors: 'arrows' },
      color_system: { palette: ['#10B981', '#334155', '#CBD5E1'], accent: 'single accent', background_tone: 'light' },
      typography: { family: 'humanist sans-serif', weight: 'bold', hierarchy: 'numbered steps' },
      elements: { labels: true },
      mood: 'friendly, approachable, clear',
      negative: 'no overlapping elements, no unreadable text',
    },
  },
]

const presetCategories: Array<string> = ['Business', 'Editorial', 'Dashboard', 'Prozess']

export const infografikKind: KindDef = {
  kind: 'infografik',
  label: 'Infografik',
  description:
    'Daten visuell — Layout, Icon-System, Farb-System, Typografie. Daten kommen übers Motiv.',
  groups,
  topFields,
  defaultStyle,
  exampleSubject:
    'the 4 steps of an online onboarding process (sign up, verify email, set up profile, start), each with a short label and an icon',
  presets,
  presetCategories,
  dynamicOptionKeys: [],
  validate: makeValidator(infografikSchema),
}
