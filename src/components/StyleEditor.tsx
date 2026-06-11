import { useEffect, useId, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import CodeMirror, { EditorView } from '@uiw/react-codemirror'
import { json } from '@codemirror/lang-json'
import type { JsonObject, JsonValue } from '#/lib/json'
import type { FieldDef, GroupDef } from '#/lib/schema/fields'
import { InfoHint } from '#/components/InfoHint'
import { CAMERA_BODIES } from '#/lib/taxonomy'
import { listCameraBodies } from '#/ipc/cameras'
import { getKind } from '#/lib/kinds'
import type { ImageKind } from '#/lib/kinds'
import {
  formatList,
  getGroupField,
  getTop,
  parseList,
  setGroupField,
  setTop,
} from '#/lib/styleObject'

type DynamicOptions = Record<string, ReadonlyArray<string | number>>

// Erzwingt Monospace im CodeMirror-JSON-Editor — sonst erbt der Editor die
// proportionale UI-Schrift statt einer Code-Schrift.
const MONO_FONT =
  'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace'
const monoFontTheme = EditorView.theme({
  '&': { fontFamily: MONO_FONT },
  '.cm-content, .cm-gutters': { fontFamily: MONO_FONT },
})

const inputCls =
  'w-full rounded-md border bg-background p-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring'

export function StyleEditor({
  value,
  onChange,
  kind = 'foto',
}: {
  value: JsonObject
  onChange: (next: JsonObject) => void
  kind?: ImageKind
}) {
  const def = getKind(kind)
  const [tab, setTab] = useState<'form' | 'json'>('form')
  const [jsonText, setJsonText] = useState(() => JSON.stringify(value, null, 2))
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [issues, setIssues] = useState<Array<string>>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  // Eigene Kamera-Bodys (aus den Einstellungen) zu den Defaults mischen.
  // Nur relevant für Bildarten, deren Felder dynamische Optionen nutzen (Foto: 'body').
  const usesBodyOptions = def.dynamicOptionKeys.includes('body')
  const { data: customBodies = [] } = useQuery({
    queryKey: ['cameraBodies'],
    queryFn: () => listCameraBodies(),
    enabled: usesBodyOptions,
  })
  const dynamicOptions = useMemo<DynamicOptions>(() => {
    const opts: DynamicOptions = {}
    if (usesBodyOptions) {
      const defaults = CAMERA_BODIES as ReadonlyArray<string>
      opts.body = [
        ...defaults,
        ...customBodies.filter((b) => !defaults.includes(b)),
      ]
    }
    return opts
  }, [usesBodyOptions, customBodies])

  function openJson() {
    setJsonText(JSON.stringify(value, null, 2))
    setJsonError(null)
    setIssues(def.validate(value).issues)
    setTab('json')
  }

  function handleJsonChange(text: string) {
    setJsonText(text)
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch (e) {
      setJsonError((e as Error).message)
      return
    }
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      setJsonError('JSON muss ein Objekt sein.')
      return
    }
    setJsonError(null)
    setIssues(def.validate(parsed).issues)
    onChange(parsed as JsonObject)
  }

  return (
    <div className="rounded-md border">
      <div className="flex items-center gap-1 border-b bg-muted/40 p-1">
        <TabButton active={tab === 'form'} onClick={() => setTab('form')}>
          Formular
        </TabButton>
        <TabButton active={tab === 'json'} onClick={openJson}>
          JSON
        </TabButton>
      </div>

      {tab === 'form' ? (
        <div className="flex flex-col gap-5 p-4">
          {def.groups.map((group) => (
            <GroupSection
              key={group.key}
              group={group}
              value={value}
              onChange={onChange}
              dynamicOptions={dynamicOptions}
            />
          ))}

          <div className="grid gap-3">
            {def.topFields.map((field) => (
              <TextAreaField
                key={field.key}
                label={field.label}
                value={getTop(value, field.key)}
                options={field.options}
                placeholder={field.placeholder}
                help={field.help}
                onChange={(v) => onChange(setTop(value, field.key, v))}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="p-2">
          {mounted ? (
            <CodeMirror
              value={jsonText}
              height="420px"
              extensions={[json(), monoFontTheme]}
              onChange={handleJsonChange}
              basicSetup={{ lineNumbers: true, foldGutter: false }}
            />
          ) : (
            <textarea
              readOnly
              value={jsonText}
              className="h-[420px] w-full resize-none rounded-md border bg-background p-3 font-mono text-xs"
            />
          )}
          {jsonError && (
            <p className="mt-2 text-sm text-red-600">
              Ungültiges JSON: {jsonError}
            </p>
          )}
          {!jsonError && issues.length > 0 && (
            <div className="mt-2 text-xs text-amber-600">
              <p className="font-medium">Hinweise (Typen):</p>
              <ul className="list-inside list-disc">
                {issues.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function GroupSection({
  group,
  value,
  onChange,
  dynamicOptions,
}: {
  group: GroupDef
  value: JsonObject
  onChange: (next: JsonObject) => void
  dynamicOptions?: DynamicOptions
}) {
  return (
    <fieldset className="grid gap-3">
      <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {group.label}
      </legend>
      <div className="grid grid-cols-2 gap-3">
        {group.fields.map((def) => (
          <FieldInput
            key={def.key}
            def={def}
            value={getGroupField(value, group.key, def.key)}
            options={dynamicOptions?.[def.key] ?? def.options}
            onChange={(v) =>
              onChange(setGroupField(value, group.key, def.key, v))
            }
          />
        ))}
      </div>
    </fieldset>
  )
}

function FieldInput({
  def,
  value,
  options,
  onChange,
}: {
  def: FieldDef
  value: JsonValue | undefined
  options?: ReadonlyArray<string | number>
  onChange: (v: JsonValue | undefined) => void
}) {
  const listId = useId()

  if (def.type === 'boolean') {
    return (
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={value === true}
          onChange={(e) => onChange(e.target.checked ? true : undefined)}
        />
        <span className="inline-flex items-center gap-1">
          {def.label}
          {def.help && <InfoHint text={def.help} />}
        </span>
      </label>
    )
  }

  if (def.type === 'colorlist') {
    return <PaletteEditor def={def} value={value} onChange={onChange} />
  }

  if (def.type === 'list') {
    return (
      <label className="col-span-2 block text-sm">
        <span className="mb-1 flex items-center gap-1 text-xs font-medium">
          {def.label}
          {def.help && <InfoHint text={def.help} />}
        </span>
        <input
          type="text"
          className={inputCls}
          placeholder={def.placeholder}
          value={formatList(value)}
          onChange={(e) => onChange(parseList(e.target.value))}
        />
      </label>
    )
  }

  return (
    <label className="block text-sm">
      <span className="mb-1 flex items-center gap-1 text-xs font-medium">
        {def.label}
        {def.help && <InfoHint text={def.help} />}
      </span>
      <input
        type={def.type === 'number' ? 'number' : 'text'}
        className={inputCls}
        placeholder={def.placeholder}
        list={options ? listId : undefined}
        value={value === undefined || value === null ? '' : String(value)}
        onChange={(e) => {
          const raw = e.target.value
          if (def.type === 'number') {
            const n = Number(raw)
            onChange(raw === '' || !Number.isFinite(n) ? undefined : n)
          } else {
            onChange(raw === '' ? undefined : raw)
          }
        }}
      />
      {options && (
        <datalist id={listId}>
          {options.map((o) => (
            <option key={String(o)} value={String(o)} />
          ))}
        </datalist>
      )}
    </label>
  )
}

function normalizeHex(input: string): string | null {
  let s = input.trim()
  if (!s) return null
  if (!s.startsWith('#')) s = '#' + s
  const short = /^#([0-9a-fA-F]{3})$/.exec(s)
  if (short) {
    const [r, g, b] = short[1].split('')
    s = `#${r}${r}${g}${g}${b}${b}`
  }
  return /^#[0-9a-fA-F]{6}$/.test(s) ? s.toUpperCase() : null
}

function PaletteEditor({
  def,
  value,
  onChange,
}: {
  def: FieldDef
  value: JsonValue | undefined
  onChange: (v: JsonValue | undefined) => void
}) {
  const colors = Array.isArray(value)
    ? value.map(String)
    : typeof value === 'string' && value
      ? parseList(value)
      : []
  const [draft, setDraft] = useState('#8B6F5E')

  function commit(next: Array<string>) {
    onChange(next.length ? next : undefined)
  }
  function addColor() {
    const hex = normalizeHex(draft)
    if (!hex || colors.some((c) => c.toUpperCase() === hex)) return
    commit([...colors, hex])
  }

  const colorInputVal = normalizeHex(draft) ?? '#000000'

  return (
    <div className="col-span-2 text-sm">
      <span className="mb-1 flex items-center gap-1 text-xs font-medium">
        {def.label}
        {def.help && <InfoHint text={def.help} />}
      </span>

      {colors.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {colors.map((c, i) => (
            <div
              key={`${c}-${i}`}
              className="flex items-center gap-1.5 rounded-full border bg-background py-1 pl-1.5 pr-1"
            >
              <span
                className="h-4 w-4 rounded-full border"
                style={{ backgroundColor: c }}
              />
              <span className="font-mono text-xs">{c}</span>
              <button
                type="button"
                onClick={() => commit(colors.filter((_, idx) => idx !== i))}
                title="Farbe entfernen"
                className="flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          type="color"
          value={colorInputVal}
          onChange={(e) => setDraft(e.target.value)}
          aria-label="Farbe wählen"
          className="h-9 w-10 cursor-pointer rounded border bg-background p-0.5"
        />
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addColor()
            }
          }}
          placeholder="#RRGGBB"
          className="w-28 rounded-md border bg-background p-2 font-mono text-sm"
        />
        <button
          type="button"
          onClick={addColor}
          disabled={!normalizeHex(draft)}
          className="rounded-md border px-3 py-2 text-sm font-medium disabled:opacity-50"
        >
          + Farbe
        </button>
      </div>
    </div>
  )
}

function TextAreaField({
  label,
  value,
  options,
  placeholder,
  help,
  onChange,
}: {
  label: string
  value: JsonValue | undefined
  options?: ReadonlyArray<string>
  placeholder?: string
  help?: string
  onChange: (v: string | undefined) => void
}) {
  const listId = useId()
  return (
    <label className="block text-sm">
      <span className="mb-1 flex items-center gap-1 text-xs font-medium">
        {label}
        {help && <InfoHint text={help} />}
      </span>
      <input
        type="text"
        className={inputCls}
        list={options ? listId : undefined}
        placeholder={placeholder}
        value={typeof value === 'string' ? value : ''}
        onChange={(e) =>
          onChange(e.target.value === '' ? undefined : e.target.value)
        }
      />
      {options && (
        <datalist id={listId}>
          {options.map((o) => (
            <option key={o} value={o} />
          ))}
        </datalist>
      )}
    </label>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded px-3 py-1 text-sm font-medium ${
        active
          ? 'bg-background shadow-sm'
          : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {children}
    </button>
  )
}
