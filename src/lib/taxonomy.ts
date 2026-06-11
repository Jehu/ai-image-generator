// Foto-Stil-Taxonomie: Vorschlagswerte für die Formular-Dropdowns.
// Die Felder akzeptieren auch Freitext (datalist) — die Listen sind Vorschläge,
// keine harte Einschränkung. Basis: recherchierte Best Practices für Gemini 3 Image.

// Kuratierte Default-Auswahl bekannter Kamera-Bodys (prägen den Look stark —
// v.a. Film-Kameras). Nutzer können in den Einstellungen weitere ergänzen.
export const CAMERA_BODIES = [
  // Digital Vollformat (spiegellos)
  'Sony A7R V',
  'Sony A1',
  'Canon EOS R5',
  'Nikon Z8',
  'Panasonic Lumix S1R',
  // Mittelformat (digital)
  'Hasselblad X2D 100C',
  'Fujifilm GFX 100 II',
  'Phase One XF IQ4',
  // Messsucher / Kompakt (digital)
  'Leica M11',
  'Leica Q3',
  'Fujifilm X100VI',
  'Fujifilm X-T5',
  // DSLR-Klassiker
  'Canon EOS 5D Mark IV',
  'Nikon D850',
  // Film 35mm
  'Leica M6 (35mm film)',
  'Contax T2 (35mm film)',
  'Canon AE-1 (35mm film)',
  'Nikon F3 (35mm film)',
  // Film Mittelformat
  'Hasselblad 500C/M (medium format film)',
  'Mamiya RZ67 (medium format film)',
  'Pentax 67 (medium format film)',
] as const

export const APERTURES = [
  'f/1.2',
  'f/1.4',
  'f/1.8',
  'f/2.0',
  'f/2.8',
  'f/4',
  'f/5.6',
  'f/8',
  'f/11',
  'f/16',
] as const

export const LENS_MM = [16, 24, 35, 50, 85, 100, 135, 200] as const

export const CAMERA_FORMATS = [
  'full-frame',
  'medium format',
  'APS-C',
  'large format',
] as const

export const DEPTH_OF_FIELD = ['shallow', 'medium', 'deep'] as const

export const BOKEH = [
  'smooth, circular',
  'swirly',
  'busy / nervous',
  'none',
] as const

export const LIGHTING_SETUPS = [
  'soft window light',
  'rembrandt',
  'butterfly',
  'broad light',
  'short light',
  'clamshell',
  'backlit / rim',
  'ring light',
  'studio strobe',
  'golden hour',
  'blue hour',
  'overcast / diffused',
  'harsh midday',
  'candlelight',
] as const

export const LIGHT_QUALITY = [
  'soft, diffused',
  'hard, directional',
  'dramatic, high-contrast',
  'flat, even',
] as const

export const COLOR_TEMPERATURES_K = [2700, 3200, 4000, 5200, 5500, 6500, 7500] as const

export const FILM_EMULATIONS = [
  'Kodak Portra 400',
  'Kodak Portra 800',
  'Kodak Ektar 100',
  'Fuji Velvia 50',
  'Fuji Provia 100F',
  'Cinestill 800T',
  'Ilford HP5 (B&W)',
  'Kodak Tri-X (B&W)',
  'clean digital',
] as const

export const COLOR_GRADES = [
  'lifted shadows, muted saturation',
  'crushed blacks, punchy',
  'orange & teal',
  'warm, golden',
  'cool, desaturated',
  'cross-process',
  'bleach bypass',
  'natural',
] as const

export const SATURATION = [
  'punchy (+30%)',
  'natural',
  'muted (-20%)',
  'near monochrome',
] as const

export const TEMPERATURE = ['warm', 'neutral', 'cool'] as const

export const CONTRAST = ['low / flat', 'medium / natural', 'high / punchy'] as const

export const GRAIN = [
  'none',
  'fine, subtle',
  'medium film grain',
  'heavy, visible',
] as const

export const FINISH = [
  'clean digital',
  'matte',
  'glossy',
  'film scan (with texture)',
] as const

export const SHARPENING = ['soft', 'medium', 'razor sharp'] as const

export const FRAMING = [
  'close-up',
  'portrait (head & shoulders)',
  'medium',
  'full body',
  'environmental / wide',
] as const

export const CAMERA_ANGLE = [
  'eye level',
  'low angle',
  'high angle',
  'overhead / top-down',
  'dutch angle',
] as const

export const MOOD_SUGGESTIONS = [
  'calm, editorial, premium',
  'intimate, contemplative',
  'bright, optimistic, clean',
  'moody, cinematic',
  'raw, documentary',
  'minimal, quiet luxury',
] as const
