// JSON-sichere Typen. Wichtig: TanStack Start prüft die Serialisierbarkeit von
// Server-Function-Ein-/Ausgaben — `unknown`-Werte werden abgelehnt.

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | Array<JsonValue>
  | { [key: string]: JsonValue }

export type JsonObject = { [key: string]: JsonValue }
