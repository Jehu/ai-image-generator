// Kanonische JSON-Serialisierung: Objekt-Keys rekursiv sortiert, damit
// inhaltsgleiche Werte unabhängig von der Key-Reihenfolge denselben String
// (und damit Hash) ergeben. Pure JS — browser-sicher, keine Node-Module.
import type { JsonValue } from '#/lib/json'

export function canonicalStringify(value: JsonValue): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) {
    return `[${value.map((v) => canonicalStringify(v)).join(',')}]`
  }
  const keys = Object.keys(value).sort()
  const entries = keys.map(
    (k) => `${JSON.stringify(k)}:${canonicalStringify(value[k])}`,
  )
  return `{${entries.join(',')}}`
}
