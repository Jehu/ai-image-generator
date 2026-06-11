import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { getSettingsInfo } from '#/ipc/settings'
import {
  addCameraBody,
  deleteCameraBody,
  listCameraBodies,
} from '#/ipc/cameras'
import { CAMERA_BODIES } from '#/lib/taxonomy'

export const Route = createFileRoute('/settings')({ component: Settings })

function Settings() {
  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => getSettingsInfo(),
  })

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-6 text-2xl font-bold">Einstellungen</h1>

      {isLoading || !data ? (
        <p className="text-muted-foreground text-sm">Lade…</p>
      ) : (
        <div className="flex flex-col gap-4">
          <Row label="Gemini API-Key">
            {data.hasApiKey ? (
              <span className="text-green-600">
                gesetzt — {data.apiKeyMasked}
              </span>
            ) : (
              <span className="text-red-600">
                nicht gesetzt — in <code>.env</code> eintragen (
                <code>GEMINI_API_KEY</code>)
              </span>
            )}
          </Row>
          <Row label="OpenAI API-Key">
            {data.hasOpenAiKey ? (
              <span className="text-green-600">
                gesetzt — {data.openAiKeyMasked}
              </span>
            ) : (
              <span className="text-muted-foreground">
                nicht gesetzt (optional) — in <code>.env</code> eintragen (
                <code>OPENAI_API_KEY</code>) für OpenAI-Bildmodelle
              </span>
            )}
          </Row>
          <Row label="OpenRouter API-Key">
            {data.hasOpenRouterKey ? (
              <span className="text-green-600">
                gesetzt — {data.openRouterKeyMasked}
              </span>
            ) : (
              <span className="text-muted-foreground">
                nicht gesetzt (optional) — in <code>.env</code> eintragen (
                <code>OPENROUTER_API_KEY</code>) für OpenRouter-Bildmodelle
              </span>
            )}
          </Row>
          <Row label="Bild-Speicher">
            <code>{data.imageDir}</code>
          </Row>
          <Row label="Datenbank">
            <code>{data.databaseUrl}</code>
          </Row>
          <p className="text-muted-foreground mt-2 text-xs">
            Der API-Key wird ausschließlich serverseitig (Server Functions)
            genutzt und gelangt nie ins Frontend-Bundle. Änderungen am Key
            erfolgen in der <code>.env</code>-Datei; danach den Dev-Server neu
            starten.
          </p>
        </div>
      )}

      <CameraBodiesSection />
    </div>
  )
}

function CameraBodiesSection() {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')

  const { data: custom = [] } = useQuery({
    queryKey: ['cameraBodies'],
    queryFn: () => listCameraBodies(),
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['cameraBodies'] })
  }

  const add = useMutation({
    mutationFn: (n: string) => addCameraBody({ data: { name: n } }),
    onSuccess: () => {
      setName('')
      invalidate()
    },
  })
  const del = useMutation({
    mutationFn: (n: string) => deleteCameraBody({ data: { name: n } }),
    onSuccess: invalidate,
  })

  function submit() {
    const n = name.trim()
    if (n) add.mutate(n)
  }

  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold">Kamera-Bodys</h2>
      <p className="text-muted-foreground mt-1 text-sm">
        Eigene Bodys erscheinen zusätzlich zur Standardauswahl im Stil-Formular
        (Feld „Body").
      </p>

      <div className="mt-3 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit()
          }}
          placeholder="z.B. Leica SL3 oder Olympus OM-1 (35mm film)"
          className="flex-1 rounded-md border bg-background p-2 text-sm"
        />
        <button
          onClick={submit}
          disabled={add.isPending || name.trim() === ''}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          Hinzufügen
        </button>
      </div>
      {add.isError && (
        <p className="mt-1 text-sm text-red-600">{add.error.message}</p>
      )}

      {custom.length > 0 && (
        <div className="mt-4">
          <h3 className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wide">
            Eigene Bodys ({custom.length})
          </h3>
          <ul className="flex flex-wrap gap-2">
            {custom.map((b) => (
              <li
                key={b}
                className="flex items-center gap-2 rounded-full border bg-background py-1 pl-3 pr-1 text-sm"
              >
                {b}
                <button
                  onClick={() => del.mutate(b)}
                  title="Entfernen"
                  className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <details className="mt-4 text-sm">
        <summary className="text-muted-foreground cursor-pointer">
          Standardauswahl ansehen ({CAMERA_BODIES.length})
        </summary>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {CAMERA_BODIES.map((b) => (
            <span
              key={b}
              className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground"
            >
              {b}
            </span>
          ))}
        </div>
      </details>
    </section>
  )
}

function Row({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border p-3 text-sm">
      <span className="font-medium">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  )
}
