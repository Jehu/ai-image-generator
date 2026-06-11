// Reine Helfer zum verschachtelten Lesen/Schreiben im Stil-Objekt.
// Setzt einen leeren/undefinierten Wert -> Key wird entfernt (kein Müll im JSON).
import type { JsonObject, JsonValue } from '#/lib/json'

function isObject(v: JsonValue | undefined): v is JsonObject {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function isEmpty(v: unknown): boolean {
  return v === undefined || v === '' || (Array.isArray(v) && v.length === 0)
}

export function getTop(obj: JsonObject, key: string): JsonValue | undefined {
  return obj[key]
}

export function setTop(obj: JsonObject, key: string, value: JsonValue | undefined): JsonObject {
  const next: JsonObject = { ...obj }
  if (isEmpty(value)) delete next[key]
  else next[key] = value as JsonValue
  return next
}

export function getGroupField(
  obj: JsonObject,
  group: string,
  key: string,
): JsonValue | undefined {
  const g = obj[group]
  return isObject(g) ? g[key] : undefined
}

export function setGroupField(
  obj: JsonObject,
  group: string,
  key: string,
  value: JsonValue | undefined,
): JsonObject {
  const current = obj[group]
  const groupObj: JsonObject = isObject(current) ? { ...current } : {}
  if (isEmpty(value)) delete groupObj[key]
  else groupObj[key] = value as JsonValue

  const next: JsonObject = { ...obj }
  if (Object.keys(groupObj).length === 0) delete next[group]
  else next[group] = groupObj
  return next
}

/** "#aaa, #bbb" <-> ["#aaa","#bbb"] */
export function parseList(text: string): Array<string> {
  return text
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

export function formatList(value: JsonValue | undefined): string {
  if (Array.isArray(value)) return value.map(String).join(', ')
  return typeof value === 'string' ? value : ''
}
