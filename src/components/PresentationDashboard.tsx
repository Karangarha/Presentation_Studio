import { useEffect, useState } from 'react'
import {
  createPresentation,
  deletePresentation,
  fetchPresentations,
  signOut,
  updatePresentation,
  type Presentation,
  type Profile,
} from '../lib/supabase'

type PresentationDashboardProps = { profile: Profile; onOpen: (presentation: Presentation) => void; onSignedOut: () => void }

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)
}

function PresentationDashboard({ profile, onOpen, onSignedOut }: PresentationDashboardProps) {
  const [presentations, setPresentations] = useState<Presentation[]>([])
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void fetchPresentations(profile.id)
      .then((loaded) => { if (active) setPresentations(loaded) })
      .catch((err: Error) => { if (active) setError(err.message) })
      .finally(() => { if (active) setBusy(false) })
    return () => { active = false }
  }, [profile.id])

  async function create() {
    if (!title.trim()) return
    setBusy(true)
    setError(null)
    try {
      const presentation = await createPresentation(profile.id, title.trim(), slug || slugify(title))
      setPresentations((current) => [presentation, ...current])
      setTitle('')
      setSlug('')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function remove(presentation: Presentation) {
    if (!window.confirm(`Delete "${presentation.title}"? This cannot be undone.`)) return
    setBusy(true)
    try {
      await deletePresentation(presentation.id)
      setPresentations((current) => current.filter((item) => item.id !== presentation.id))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function togglePublic(presentation: Presentation) {
    try {
      await updatePresentation(presentation.id, { isPublic: !presentation.isPublic })
      setPresentations((current) => current.map((item) => item.id === presentation.id ? { ...item, isPublic: !item.isPublic } : item))
    } catch (err) {
      setError((err as Error).message)
    }
  }

  async function copyUrl(presentation: Presentation) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/${profile.username}/${presentation.slug}`)
    } catch (err) {
      setError(`Could not copy the public link: ${(err as Error).message}`)
    }
  }

  return (
    <main className="min-h-svh bg-bg p-6 text-text">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-accent">Presentation studio</p>
            <h1 className="mt-2 text-4xl font-semibold text-text-h">Your presentations</h1>
            <p className="mt-2">Signed in as {profile.displayName || profile.username}.</p>
          </div>
          <button className="rounded-lg border border-border px-4 py-2 text-sm hover:border-accent" onClick={() => void signOut().then(onSignedOut)} disabled={busy}>Sign out</button>
        </header>
        {error && <p className="rounded-lg border border-red-400/50 bg-red-400/10 p-3 text-sm text-red-600">{error}</p>}
        <section className="rounded-2xl border border-border p-5">
          <h2 className="text-xl font-semibold text-text-h">Create a presentation</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <input className="rounded-lg border border-border bg-transparent p-3" placeholder="Presentation title" value={title} onChange={(event) => { setTitle(event.target.value); setSlug(slugify(event.target.value)) }} />
            <input className="rounded-lg border border-border bg-transparent p-3" placeholder="Public URL slug" value={slug} onChange={(event) => setSlug(slugify(event.target.value))} />
            <button className="rounded-lg bg-accent px-5 py-3 font-medium text-white disabled:opacity-50" onClick={() => void create()} disabled={busy || !title.trim()}>Create</button>
          </div>
        </section>
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-text-h">All presentations</h2>
            <span className="text-sm">{presentations.length} total</span>
          </div>
          {presentations.length === 0 && !busy ? <div className="rounded-2xl border border-dashed border-border p-10 text-center">Create your first presentation to get started.</div> : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {presentations.map((presentation) => (
                <article key={presentation.id} className="rounded-2xl border border-border p-5 transition hover:border-accent">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-text-h">{presentation.title}</h3>
                      <p className="mt-1 break-all text-sm text-text">/{profile.username}/{presentation.slug}</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-xs ${presentation.isPublic ? 'bg-green-400/15 text-green-600' : 'bg-amber-400/15 text-amber-600'}`}>{presentation.isPublic ? 'Public' : 'Private'}</span>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <button className="rounded-lg bg-accent px-3 py-2 text-sm text-white" onClick={() => onOpen(presentation)}>Open editor</button>
                    <button className="rounded-lg border border-border px-3 py-2 text-sm" onClick={() => void copyUrl(presentation)}>Copy link</button>
                    <button className="rounded-lg border border-border px-3 py-2 text-sm" onClick={() => void togglePublic(presentation)}>{presentation.isPublic ? 'Make private' : 'Publish'}</button>
                    <button className="rounded-lg border border-red-400/50 px-3 py-2 text-sm text-red-600" onClick={() => void remove(presentation)}>Delete</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

export default PresentationDashboard
