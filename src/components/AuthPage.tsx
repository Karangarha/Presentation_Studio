import { useState } from 'react'
import { signIn, signUp } from '../lib/supabase'

type AuthPageProps = { onAuthenticated: () => void }

function AuthPage({ onAuthenticated }: AuthPageProps) {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      if (mode === 'sign-in') {
        await signIn(email, password)
        onAuthenticated()
      } else {
        await signUp(email, password)
        setMessage('Account created. Check your email if confirmation is enabled, then sign in.')
        setMode('sign-in')
      }
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
          <p className="text-sm uppercase tracking-[0.2em] text-accent">Presentation studio</p>
          <h1 className="mt-2 text-3xl font-semibold text-text-h">{mode === 'sign-in' ? 'Welcome back' : 'Create your account'}</h1>
          <p className="mt-2 text-sm">Manage multiple presentations from one secure workspace.</p>
        </div>
        {message && <p className="rounded-lg border border-green-400/50 bg-green-400/10 p-3 text-sm text-green-600">{message}</p>}
        {error && <p className="rounded-lg border border-red-400/50 bg-red-400/10 p-3 text-sm text-red-600">{error}</p>}
        <label className="block text-sm">
          Email
          <input className="mt-1 w-full rounded-lg border border-border bg-transparent p-3" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label className="block text-sm">
          Password
          <input className="mt-1 w-full rounded-lg border border-border bg-transparent p-3" type="password" autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        <button className="w-full rounded-lg bg-accent px-4 py-3 font-medium text-white disabled:opacity-50" type="submit" disabled={busy}>
          {busy ? 'Working…' : mode === 'sign-in' ? 'Sign in' : 'Create account'}
        </button>
        <button className="w-full text-sm text-accent hover:underline" type="button" onClick={() => { setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in'); setError(null); setMessage(null) }}>
          {mode === 'sign-in' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
        </button>
      </form>
    </main>
  )
}

export default AuthPage
