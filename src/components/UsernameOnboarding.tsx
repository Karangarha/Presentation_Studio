import { useState } from 'react'
import { createProfile } from '../lib/supabase'

type UsernameOnboardingProps = { userId: string; onComplete: () => void }

function UsernameOnboarding({ userId, onComplete }: UsernameOnboardingProps) {
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await createProfile(userId, username.trim().toLowerCase(), displayName.trim())
      onComplete()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-bg p-6 text-text">
      <form className="w-full max-w-md space-y-5 rounded-2xl border border-border bg-bg p-6 shadow-xl" onSubmit={submit}>
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-accent">Set up your workspace</p>
          <h1 className="mt-2 text-3xl font-semibold text-text-h">Choose your public username</h1>
          <p className="mt-2 text-sm">It will be used in public links such as yourname/presentation-slug.</p>
        </div>
        {error && <p className="rounded-lg border border-red-400/50 bg-red-400/10 p-3 text-sm text-red-600">{error}</p>}
        <label className="block text-sm">
          Username
          <input className="mt-1 w-full rounded-lg border border-border bg-transparent p-3" pattern="[a-z0-9-]+" minLength={2} maxLength={30} required value={username} onChange={(event) => setUsername(event.target.value.toLowerCase())} />
        </label>
        <label className="block text-sm">
          Display name
          <input className="mt-1 w-full rounded-lg border border-border bg-transparent p-3" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
        </label>
        <button className="w-full rounded-lg bg-accent px-4 py-3 font-medium text-white disabled:opacity-50" type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Continue'}
        </button>
      </form>
    </main>
  )
}

export default UsernameOnboarding
