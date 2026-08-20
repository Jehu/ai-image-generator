import { useMutation, useQuery } from '@tanstack/react-query'
import { getAppVersion } from '#/ipc/app'
import { checkForUpdates } from '#/lib/updates'

const updateStatusText = {
  'up-to-date': 'Du verwendest bereits die aktuelle Version.',
  'update-available': 'Ein Update ist verfügbar. Klicke erneut auf „Nach Updates suchen“, um die Installation zu starten.',
  installing: 'Das Update wird installiert. Die App startet danach neu.',
  unavailable: 'Die Update-Prüfung ist derzeit nicht verfügbar. Bitte versuche es später erneut.',
} as const

export function HelpPage() {
  const { data: version, isLoading } = useQuery({
    queryKey: ['appVersion'],
    queryFn: getAppVersion,
  })
  const update = useMutation({ mutationFn: checkForUpdates })

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold">Hilfe</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Informationen zur App und Updates.
      </p>

      <section className="mt-6 rounded-md border p-4">
        <h2 className="text-sm font-semibold">Image Style Studio</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {isLoading ? 'Version wird geladen…' : `Version ${version ?? 'unbekannt'}`}
        </p>
        <button
          type="button"
          onClick={() => update.mutate()}
          disabled={update.isPending}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {update.isPending ? 'Prüfe auf Updates…' : 'Nach Updates suchen'}
        </button>
        {update.data && (
          <p
            role={update.data.status === 'unavailable' ? 'alert' : 'status'}
            className="text-muted-foreground mt-3 text-sm"
          >
            {updateStatusText[update.data.status]}
          </p>
        )}
      </section>
    </div>
  )
}
