// Kuratierte Stil-Vorlagen für den Playground. Füllen das Formular vor.
// Die Looks werden über konkrete Parameter (Film-Emulation, Licht, Grading)
// beschrieben — nicht „im Stil von <Person>" — das ist rechtlich sauber und
// liefert reproduzierbarere Ergebnisse.
import type { JsonObject } from './json'
import type { AspectRatio, ImageSize, ThinkingLevelOpt } from './providers/types'

export type PresetCategory =
  | 'Klassisch'
  | 'Editorial'
  | 'Cinematic'
  | 'Vintage'
  | 'Verrückt'

export interface StylePreset {
  id: string
  name: string
  // Pro Bildart eigene Kategorien möglich -> `string` (Foto nutzt PresetCategory).
  category: string
  description: string
  styleJson: JsonObject
  /** optional empfohlene Generierungs-Parameter */
  params?: {
    aspectRatio?: AspectRatio
    imageSize?: ImageSize
    thinkingLevel?: ThinkingLevelOpt
  }
}

export const STYLE_PRESETS: Array<StylePreset> = [
  // ---------- Klassisch ----------
  {
    id: 'scandinavian-minimal',
    name: 'Scandinavian Minimal',
    category: 'Klassisch',
    description: 'Hell, luftig, entsättigt, viel Negativraum — ruhiger Premium-Look.',
    params: { aspectRatio: '4:5' },
    styleJson: {
      type: 'photographic',
      camera: { lens_mm: 50, aperture: 'f/2.8' },
      lighting: {
        setup: 'soft window light',
        quality: 'soft, diffused',
        direction: 'large side window',
        color_temperature_k: 5600,
      },
      color: {
        temperature: 'neutral',
        saturation: 'muted (-20%)',
        grade: 'bright, airy, lifted shadows',
        contrast: 'low / flat',
      },
      composition: { framing: 'medium', negative_space: 'generous', rule_of_thirds: true },
      post_processing: { grain: 'none', finish: 'clean digital' },
      mood: 'calm, minimal, scandinavian, airy',
      negative: 'no clutter, no harsh shadows, no heavy saturation',
    },
  },
  {
    id: 'natgeo-documentary',
    name: 'Documentary / Reportage',
    category: 'Klassisch',
    description: 'Natürliches Licht, erdige echte Farben, durchgehend scharf — authentisch.',
    styleJson: {
      type: 'photographic',
      camera: { body: 'Nikon', lens_mm: 24, aperture: 'f/5.6', format: 'full-frame' },
      optics: { depth_of_field: 'deep' },
      lighting: {
        setup: 'natural available light',
        quality: 'soft, diffused',
        color_temperature_k: 5400,
      },
      color: {
        temperature: 'neutral',
        saturation: 'natural',
        grade: 'rich, true-to-life, earthy',
        contrast: 'medium / natural',
      },
      composition: { framing: 'environmental / wide', angle: 'eye level', rule_of_thirds: true },
      post_processing: { sharpening: 'medium', grain: 'fine, subtle' },
      mood: 'authentic, documentary, storytelling, natural',
      negative: 'no staged studio look, no heavy color grading',
    },
  },

  // ---------- Editorial ----------
  {
    id: 'vogue-beauty-studio',
    name: 'Beauty Studio',
    category: 'Editorial',
    description: 'Clamshell-Licht, Mittelformat, saubere Haut — poliertes Magazin-Beauty.',
    styleJson: {
      type: 'photographic',
      camera: { body: 'Hasselblad', lens_mm: 120, aperture: 'f/8', format: 'medium format' },
      optics: { depth_of_field: 'medium' },
      lighting: {
        setup: 'clamshell',
        primary_source: 'studio strobe + beauty dish',
        quality: 'soft, diffused',
        color_temperature_k: 5500,
        fill_ratio: '2:1',
      },
      color: {
        temperature: 'neutral',
        saturation: 'natural',
        grade: 'clean, true-to-life',
        contrast: 'medium / natural',
      },
      composition: { framing: 'close-up', angle: 'eye level', negative_space: 'clean seamless background' },
      post_processing: { sharpening: 'medium', clarity: '-3 (smooth skin)', finish: 'glossy' },
      mood: 'polished, premium, editorial beauty',
      negative: 'no harsh shadows, no color cast, no clutter',
    },
  },
  {
    id: 'golden-hour-lifestyle',
    name: 'Golden Hour Lifestyle',
    category: 'Editorial',
    description: 'Gegenlicht in tiefer Sonne, warmes Glühen, weiches Bokeh — nostalgisch.',
    styleJson: {
      type: 'photographic',
      camera: { lens_mm: 85, aperture: 'f/1.8' },
      optics: { depth_of_field: 'shallow', bokeh: 'smooth, circular', lens_flare: true },
      lighting: {
        setup: 'backlit / rim',
        primary_source: 'low sun',
        direction: 'backlight',
        quality: 'soft, warm',
        color_temperature_k: 3200,
      },
      color: {
        temperature: 'warm',
        saturation: 'natural',
        grade: 'warm, golden, glowing highlights',
        film_emulation: 'Kodak Portra 400',
      },
      post_processing: { halation: true, grain: 'fine, subtle' },
      composition: { framing: 'medium', rule_of_thirds: true },
      mood: 'warm, nostalgic, golden hour, lifestyle',
      negative: 'no flat lighting, no cool tones',
    },
  },
  {
    id: 'symmetrical-pastel-storybook',
    name: 'Symmetrical Pastel Storybook',
    category: 'Editorial',
    description: 'Frontal, perfekt mittig, Pastell-Bonbonfarben, flaches Licht — verspielt-skurril.',
    styleJson: {
      type: 'photographic',
      camera: { lens_mm: 27, aperture: 'f/8' },
      lighting: { setup: 'flat even frontal light', quality: 'flat, even', color_temperature_k: 5200 },
      color: {
        palette: ['#F2C9A0', '#E8A0A0', '#A0C4C0', '#F4E4C1'],
        temperature: 'warm',
        saturation: 'muted (-20%)',
        grade: 'pastel storybook, candy tones',
        contrast: 'low / flat',
      },
      composition: {
        framing: 'medium',
        angle: 'eye level',
        rule_of_thirds: false,
        negative_space: 'perfectly centered, symmetrical, head-on',
      },
      post_processing: { finish: 'clean digital', grain: 'fine, subtle' },
      mood: 'whimsical, symmetrical, storybook, quirky',
      negative: 'no asymmetry, no dramatic shadows, no high saturation',
    },
  },

  // ---------- Cinematic ----------
  {
    id: 'teal-orange-blockbuster',
    name: 'Teal & Orange Blockbuster',
    category: 'Cinematic',
    description: 'Orange-Teal-Grading, anamorphes Gefühl, Lens Flare — episch, kinoreif.',
    params: { aspectRatio: '21:9', thinkingLevel: 'high' },
    styleJson: {
      type: 'photographic',
      camera: { lens_mm: 35, aperture: 'f/2.0' },
      optics: { lens_flare: true, bokeh: 'smooth, circular', depth_of_field: 'shallow' },
      lighting: { setup: 'dramatic, motivated', quality: 'dramatic, high-contrast', color_temperature_k: 4500 },
      color: {
        palette: ['#1B3A4B', '#E08A3C', '#0E1B22'],
        temperature: 'warm',
        saturation: 'punchy (+30%)',
        grade: 'orange & teal, crushed blacks',
        contrast: 'high / punchy',
      },
      composition: { framing: 'environmental / wide', angle: 'low angle' },
      post_processing: { sharpening: 'medium', finish: 'clean digital' },
      mood: 'cinematic, epic, blockbuster',
      negative: 'no muted colors, no flat contrast',
    },
  },
  {
    id: 'a24-moody-indie',
    name: 'A24 Moody Indie',
    category: 'Cinematic',
    description: 'Entsättigt, weiches Low-Key-Licht, Filmkorn, Halation — melancholisch-intim.',
    params: { aspectRatio: '16:9' },
    styleJson: {
      type: 'photographic',
      camera: { lens_mm: 40, aperture: 'f/2.0' },
      optics: { depth_of_field: 'shallow', bokeh: 'smooth, circular' },
      lighting: { setup: 'soft motivated light', quality: 'soft, low-key', color_temperature_k: 4200 },
      color: {
        temperature: 'cool',
        saturation: 'muted (-20%)',
        grade: 'desaturated, naturalistic, soft contrast',
        film_emulation: 'Kodak Portra 800',
        contrast: 'low / flat',
      },
      post_processing: { grain: 'medium film grain', halation: true },
      composition: { framing: 'medium', negative_space: 'generous', rule_of_thirds: true },
      mood: 'melancholic, intimate, indie cinema, contemplative',
      negative: 'no punchy saturation, no glossy commercial look',
    },
  },
  {
    id: 'film-noir',
    name: 'Film Noir',
    category: 'Cinematic',
    description: 'Hartes Seitenlicht, tiefe Schwarztöne, Schwarzweiß, Dutch Angle — mysteriös.',
    params: { aspectRatio: '4:3' },
    styleJson: {
      type: 'photographic',
      camera: { lens_mm: 50, aperture: 'f/4' },
      optics: { vignette: 'strong' },
      lighting: {
        setup: 'hard side light through venetian blinds',
        quality: 'hard, directional',
        direction: 'low side',
        color_temperature_k: 4000,
        fill_ratio: '8:1',
      },
      color: {
        saturation: 'near monochrome',
        grade: 'black and white, deep crushed blacks',
        film_emulation: 'Ilford HP5 (B&W)',
        contrast: 'high / punchy',
      },
      post_processing: { grain: 'medium film grain', finish: 'film scan (with texture)' },
      composition: { framing: 'medium', angle: 'dutch angle' },
      mood: 'noir, mysterious, dramatic, moody',
      negative: 'no color, no soft flat light',
    },
  },
  {
    id: 'cyberpunk-neon-night',
    name: 'Cyberpunk Neon Night',
    category: 'Cinematic',
    description: 'Cinestill 800T, Magenta-Cyan-Neon, Halation, nasse Straße — futuristisch.',
    styleJson: {
      type: 'photographic',
      camera: { lens_mm: 35, aperture: 'f/1.4' },
      optics: { bokeh: 'smooth, circular', depth_of_field: 'shallow', lens_flare: true, chromatic_aberration: true },
      lighting: {
        setup: 'neon signs / mixed practicals',
        primary_source: 'neon',
        quality: 'hard, colorful',
        color_temperature_k: 3800,
      },
      color: {
        palette: ['#FF2D95', '#00E5FF', '#7A00FF'],
        temperature: 'cool',
        saturation: 'punchy (+30%)',
        grade: 'neon magenta & cyan, crushed blacks',
        film_emulation: 'Cinestill 800T',
        contrast: 'high / punchy',
      },
      post_processing: { halation: true, grain: 'medium film grain' },
      composition: { framing: 'medium', negative_space: 'wet reflective street' },
      mood: 'cyberpunk, neon, nocturnal, futuristic',
      negative: 'no daylight, no muted colors',
    },
  },

  // ---------- Vintage ----------
  {
    id: 'kodachrome-70s',
    name: '70s Kodachrome',
    category: 'Vintage',
    description: 'Warm, satte Rottöne, feines Korn, sonnengebleicht — Retro 1970er.',
    styleJson: {
      type: 'photographic',
      camera: { lens_mm: 50, aperture: 'f/4' },
      optics: { vignette: 'subtle' },
      color: {
        temperature: 'warm',
        saturation: 'punchy (+30%)',
        grade: 'warm vintage, rich reds, sun-faded',
        film_emulation: 'Kodachrome 64',
        contrast: 'medium / natural',
      },
      post_processing: { grain: 'fine, subtle', finish: 'film scan (with texture)' },
      composition: { framing: 'medium', rule_of_thirds: true },
      mood: 'nostalgic, 1970s, retro, sun-faded',
      negative: 'no clean modern digital look, no cool tones',
    },
  },
  {
    id: 'polaroid-instant',
    name: 'Polaroid Instant',
    category: 'Vintage',
    description: 'Milchig, geringer Kontrast, leichter Farbstich, quadratisch — Sofortbild.',
    params: { aspectRatio: '1:1' },
    styleJson: {
      type: 'photographic',
      camera: { lens_mm: 35, aperture: 'f/8' },
      optics: { vignette: 'subtle' },
      color: {
        temperature: 'warm',
        saturation: 'muted (-20%)',
        grade: 'faded, milky, slight green/yellow cast',
        contrast: 'low / flat',
      },
      post_processing: { finish: 'matte', grain: 'fine, subtle' },
      composition: { framing: 'medium', angle: 'eye level' },
      mood: 'nostalgic, instant film, faded memory, snapshot',
      negative: 'no sharp clinical detail, no deep blacks',
    },
  },
  {
    id: 'hard-flash-snapshot',
    name: 'Hard Flash Snapshot',
    category: 'Vintage',
    description: 'Direkter Aufsteckblitz, harte Schatten, dunkler Hintergrund — 90er-Fashion-Snapshot.',
    styleJson: {
      type: 'photographic',
      camera: { lens_mm: 28, aperture: 'f/8' },
      optics: { vignette: 'strong (flash falloff)' },
      lighting: {
        setup: 'direct on-camera flash',
        quality: 'hard, frontal',
        direction: 'frontal',
        color_temperature_k: 5500,
      },
      color: {
        saturation: 'punchy (+30%)',
        grade: 'high-flash, bright subject, dark background',
        contrast: 'high / punchy',
      },
      post_processing: { sharpening: 'razor sharp', grain: 'fine, subtle' },
      composition: { framing: 'medium', angle: 'eye level' },
      mood: 'raw, edgy, 90s snapshot, fashion flash',
      negative: 'no soft natural light, no moody shadows',
    },
  },

  // ---------- Verrückt ----------
  {
    id: 'tilt-shift-miniature',
    name: 'Tilt-Shift Miniature',
    category: 'Verrückt',
    description: 'Extrem flache Schärfe von oben — lässt Szenen wie Spielzeugmodelle wirken.',
    styleJson: {
      type: 'photographic',
      camera: { lens_mm: 100, aperture: 'f/2.8' },
      optics: { depth_of_field: 'shallow (tilt-shift)', bokeh: 'smooth, circular' },
      lighting: { setup: 'bright daylight', quality: 'hard, sunny', color_temperature_k: 5800 },
      color: { saturation: 'punchy (+30%)', grade: 'vivid, toy-like', contrast: 'high / punchy' },
      composition: { framing: 'environmental / wide', angle: 'high angle' },
      post_processing: { clarity: '+10', sharpening: 'razor sharp' },
      mood: 'miniature, toy-like, playful, tilt-shift',
      negative: 'no full-scene focus, no flat lighting',
    },
  },
  {
    id: 'infrared-dream',
    name: 'Infrared Dream',
    category: 'Verrückt',
    description: 'Falschfarben-Infrarot: weiß-rosa Pflanzen, dunkle Himmel — surreal.',
    params: { aspectRatio: '3:2' },
    styleJson: {
      type: 'photographic',
      camera: { lens_mm: 35, aperture: 'f/5.6' },
      optics: { vignette: 'subtle' },
      color: {
        palette: ['#FFD7E8', '#F5A3C7', '#8FD3FF'],
        temperature: 'cool',
        saturation: 'punchy (+30%)',
        grade: 'false-color infrared: white/pink foliage, dark skies',
        contrast: 'high / punchy',
      },
      post_processing: { grain: 'fine, subtle', finish: 'clean digital' },
      composition: { framing: 'environmental / wide' },
      mood: 'surreal, dreamlike, infrared, otherworldly',
      negative: 'no natural green foliage, no realistic colors',
    },
  },
  {
    id: 'vaporwave-pastel',
    name: 'Vaporwave Pastel',
    category: 'Verrückt',
    description: 'Pastell-Verläufe, Pink & Cyan, Dunst und Glow — retro-futuristisch verträumt.',
    styleJson: {
      type: 'photographic',
      camera: { lens_mm: 35, aperture: 'f/2.8' },
      optics: { bokeh: 'smooth, circular', chromatic_aberration: true },
      lighting: { setup: 'soft gradient glow', quality: 'soft, diffused', color_temperature_k: 6500 },
      color: {
        palette: ['#FF6AD5', '#C774E8', '#94D0FF', '#8795E8'],
        temperature: 'cool',
        saturation: 'punchy (+30%)',
        grade: 'pastel gradient, pink & cyan, dreamy haze',
        contrast: 'low / flat',
      },
      post_processing: { halation: true, finish: 'glossy' },
      composition: { framing: 'medium', negative_space: 'generous' },
      mood: 'vaporwave, retro-futuristic, dreamy, pastel',
      negative: 'no realistic natural colors, no harsh contrast',
    },
  },
]

export const PRESET_CATEGORIES: Array<PresetCategory> = [
  'Klassisch',
  'Editorial',
  'Cinematic',
  'Vintage',
  'Verrückt',
]
