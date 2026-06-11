// Deklarative Beschreibung der Formularfelder. Treibt das Rendering des
// Stil-Formulars aus der Taxonomie. Reihenfolge = Anzeigereihenfolge.
// `help` = kurzer Erklärtext (ℹ-Icon im Formular).
import * as T from '#/lib/taxonomy'

export type FieldType = 'text' | 'number' | 'boolean' | 'list' | 'colorlist'

export interface FieldDef {
  key: string
  label: string
  type: FieldType
  options?: ReadonlyArray<string | number>
  placeholder?: string
  help?: string
}

export interface GroupDef {
  // Gruppen-Key = oberster Block im Stil-JSON. Pro Bildart frei (z. B. 'camera',
  // 'style', 'layout') — daher `string`, nicht das foto-spezifische StyleGroup.
  key: string
  label: string
  fields: Array<FieldDef>
}

export const GROUPS: Array<GroupDef> = [
  {
    key: 'camera',
    label: 'Kamera',
    fields: [
      {
        key: 'body',
        label: 'Body',
        type: 'text',
        options: T.CAMERA_BODIES,
        placeholder: 'z.B. Sony A7R V',
        help: 'Kameramodell — beeinflusst den charakteristischen Look (Farbwiedergabe, Dynamikumfang). Eigene Bodys lassen sich in den Einstellungen ergänzen. Frei lassen, wenn egal.',
      },
      {
        key: 'lens_mm',
        label: 'Brennweite (mm)',
        type: 'number',
        options: T.LENS_MM,
        help: 'Kleine Werte (24–35 mm) = weiter Bildwinkel/Reportage, 50 mm ≈ natürliche Perspektive, 85–135 mm = Porträt mit komprimiertem, ruhigem Hintergrund.',
      },
      {
        key: 'aperture',
        label: 'Blende',
        type: 'text',
        options: T.APERTURES,
        help: 'Kleine f-Zahl (f/1.4) = geringe Schärfentiefe, starkes Bokeh. Große f-Zahl (f/8–f/11) = durchgehend scharf.',
      },
      {
        key: 'iso',
        label: 'ISO',
        type: 'number',
        help: 'Lichtempfindlichkeit. Niedrig (100) = sauber. Hoch (1600+) = sichtbares Rauschen/Korn (kann als Stilmittel gewollt sein).',
      },
      {
        key: 'shutter_speed',
        label: 'Verschlusszeit',
        type: 'text',
        placeholder: 'z.B. 1/250s',
        help: 'Kurz (1/2000s) friert Bewegung ein. Lang (1/30s, 1s+) erzeugt Bewegungsunschärfe.',
      },
      {
        key: 'format',
        label: 'Format',
        type: 'text',
        options: T.CAMERA_FORMATS,
        help: 'Sensor-/Filmformat. Mittelformat wirkt besonders detailreich und plastisch, APS-C kompakter.',
      },
    ],
  },
  {
    key: 'optics',
    label: 'Optik',
    fields: [
      {
        key: 'depth_of_field',
        label: 'Schärfentiefe',
        type: 'text',
        options: T.DEPTH_OF_FIELD,
        help: '„shallow" = Motiv scharf, Hintergrund weich (Freistellung). „deep" = alles von vorne bis hinten scharf.',
      },
      {
        key: 'bokeh',
        label: 'Bokeh',
        type: 'text',
        options: T.BOKEH,
        help: 'Aussehen der Unschärfekreise im Hintergrund: weich/rund (edel), wirbelnd (Vintage) oder unruhig.',
      },
      {
        key: 'vignette',
        label: 'Vignette',
        type: 'text',
        placeholder: 'z.B. subtle',
        help: 'Abdunklung zu den Bildrändern hin — lenkt den Blick zur Mitte. „subtle" für dezent.',
      },
      {
        key: 'lens_flare',
        label: 'Lens Flare',
        type: 'boolean',
        help: 'Lichtreflexe/Schlieren bei Gegenlicht in der Linse — cineastisch, aber unsauber. Gut für moody Looks, schlecht für klare Produktbilder.',
      },
      {
        key: 'chromatic_aberration',
        label: 'Chromatische Aberration',
        type: 'boolean',
        help: 'Farbsäume (rot/grün/blau) an Kontrastkanten — bewusst imperfekter, analoger Look.',
      },
    ],
  },
  {
    key: 'lighting',
    label: 'Beleuchtung',
    fields: [
      {
        key: 'setup',
        label: 'Setup',
        type: 'text',
        options: T.LIGHTING_SETUPS,
        help: 'Beleuchtungsaufbau: z.B. weiches Fensterlicht (natürlich), Rembrandt (dramatischer Schatten), Clamshell (gleichmäßig, Beauty), Gegenlicht/Rim (Konturenglühen).',
      },
      {
        key: 'primary_source',
        label: 'Hauptlichtquelle',
        type: 'text',
        placeholder: 'z.B. window light',
        help: 'Art der Hauptlichtquelle: Fenster, Sonne, Studioblitz, Kerze …',
      },
      {
        key: 'direction',
        label: 'Richtung',
        type: 'text',
        placeholder: 'z.B. 45° camera-left',
        help: 'Lichtrichtung relativ zur Kamera (seitlich, von schräg oben, von hinten). Bestimmt, wo Schatten und Glanzlichter sitzen.',
      },
      {
        key: 'quality',
        label: 'Qualität',
        type: 'text',
        options: T.LIGHT_QUALITY,
        help: 'Lichtcharakter: weich/diffus (sanfte Übergänge, z.B. bewölkt) vs. hart/gerichtet (klare Kanten, harte Schatten).',
      },
      {
        key: 'color_temperature_k',
        label: 'Farbtemperatur (K)',
        type: 'number',
        options: T.COLOR_TEMPERATURES_K,
        help: 'In Kelvin: niedrig (2700) = warm/gelblich, ~5500 = neutral/Tageslicht, hoch (7500) = kühl/bläulich.',
      },
      {
        key: 'fill_ratio',
        label: 'Fill Ratio',
        type: 'text',
        placeholder: 'z.B. 3:1',
        help: 'Verhältnis von Haupt- zu Aufhelllicht. Bestimmt die Schattentiefe — z.B. 3:1 = kräftige, 1:1 = sehr weiche Schatten.',
      },
    ],
  },
  {
    key: 'color',
    label: 'Farbe',
    fields: [
      {
        key: 'palette',
        label: 'Palette',
        type: 'colorlist',
        help: 'Gezielte Farbpalette — Farben per Farbwähler hinzufügen (oder Hex eingeben). Hält die Bildfarben über alle Motive hinweg konsistent zur Marke.',
      },
      {
        key: 'temperature',
        label: 'Temperatur',
        type: 'text',
        options: T.TEMPERATURE,
        help: 'Allgemeine Farbstimmung des Bildes: warm, neutral oder kühl.',
      },
      {
        key: 'saturation',
        label: 'Sättigung',
        type: 'text',
        options: T.SATURATION,
        help: 'Farbintensität: kräftig (+), natürlich, gedämpft (–) bis nahezu monochrom.',
      },
      {
        key: 'grade',
        label: 'Color Grade',
        type: 'text',
        options: T.COLOR_GRADES,
        help: 'Farbabstimmung (Grading), z.B. angehobene Schatten (matt), Orange-Teal (Kino), entsättigt. Prägt den Gesamteindruck stark.',
      },
      {
        key: 'film_emulation',
        label: 'Film-Emulation',
        type: 'text',
        options: T.FILM_EMULATIONS,
        help: 'Nachahmung eines Filmstocks — bestimmt Farben/Kontrast deutlich: Portra = weich/warm, Velvia = kräftig, HP5/Tri-X = Schwarzweiß, Cinestill 800T = nächtlicher Kino-Look.',
      },
      {
        key: 'contrast',
        label: 'Kontrast',
        type: 'text',
        options: T.CONTRAST,
        help: 'Kontrastumfang: flach (weich, viele Mitteltöne) bis hart (knackig, tiefe Schwarz- und helle Weißwerte).',
      },
    ],
  },
  {
    key: 'post_processing',
    label: 'Post-Processing',
    fields: [
      {
        key: 'grain',
        label: 'Korn / Grain',
        type: 'text',
        options: T.GRAIN,
        help: 'Filmkorn. Fein/subtil wirkt analog und edel; starkes Korn rau und dokumentarisch.',
      },
      {
        key: 'halation',
        label: 'Halation',
        type: 'boolean',
        help: 'Weiches, oft rötliches Glühen um helle Lichter (analoger Film-Effekt). Gut für nächtliche/cineastische Looks und Neon, schlecht für saubere Produktbilder.',
      },
      {
        key: 'clarity',
        label: 'Clarity',
        type: 'text',
        placeholder: 'z.B. +5',
        help: 'Mikrokontrast/Struktur. Positiv betont Details und Texturen, negativ macht weicher (z.B. schmeichelnde Haut).',
      },
      {
        key: 'sharpening',
        label: 'Schärfung',
        type: 'text',
        options: T.SHARPENING,
        help: 'Nachschärfung: weich, mittel oder messerscharf.',
      },
      {
        key: 'finish',
        label: 'Finish',
        type: 'text',
        options: T.FINISH,
        help: 'Oberflächen-Look: clean digital, matt, glänzend oder Filmscan (mit Staub/Textur).',
      },
    ],
  },
  {
    key: 'composition',
    label: 'Komposition',
    fields: [
      {
        key: 'framing',
        label: 'Einstellungsgröße',
        type: 'text',
        options: T.FRAMING,
        help: 'Bildausschnitt: Close-up (Detail) über medium bis environmental/wide (Motiv in seiner Umgebung).',
      },
      {
        key: 'angle',
        label: 'Kamerawinkel',
        type: 'text',
        options: T.CAMERA_ANGLE,
        help: 'Augenhöhe (neutral), Froschperspektive/low (wirkt mächtig), Vogelperspektive/overhead (Überblick, z.B. Flatlay), Dutch (gekippt, unruhig).',
      },
      {
        key: 'rule_of_thirds',
        label: 'Drittelregel',
        type: 'boolean',
        help: 'Motiv entlang eines gedachten 3×3-Rasters statt mittig anordnen — wirkt dynamischer und ausgewogener. Aus lassen für bewusst zentrierte/symmetrische Looks.',
      },
      {
        key: 'negative_space',
        label: 'Negativraum',
        type: 'text',
        placeholder: 'z.B. generous',
        help: 'Bewusst freie Fläche um das Motiv — wirkt ruhig und edel und schafft Platz für Text-Overlays (ideal für Featured Images mit Titel).',
      },
    ],
  },
]

/** Top-Level-Felder (außerhalb der Gruppen). */
export const TOP_FIELDS = {
  mood: {
    label: 'Stimmung / Mood',
    options: T.MOOD_SUGGESTIONS,
    help: 'Gesamtstimmung in Worten (z.B. „calm, editorial, premium"). Fasst den emotionalen Look zusammen und hat oft großen Einfluss auf das Ergebnis.',
  },
  negative: {
    label: 'Negative (Stil-Guards)',
    placeholder: 'z.B. no HDR look, no oversaturation, no harsh shadows',
    help: 'Was vermieden werden soll. Hält den Look sauber, indem typische Abweichungen ausgeschlossen werden (z.B. „no HDR look, no oversaturation").',
  },
} as const
