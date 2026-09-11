import { useEffect, useState } from 'react'
import { MoreHorizontal, Plus, X } from 'lucide-react'
import {
  createPresentation,
  deletePresentation,
  fetchPresentations,
  signOut,
  updatePresentation,
  type Presentation,
  type Profile,
} from '../lib/supabase'
import { usePresentationData } from '../lib/usePresentationData'
import PresentationFrame from './PresentationFrame'

type PresentationDashboardProps = {
  profile: Profile
  onOpen: (presentation: Presentation) => void
  onSignedOut: () => void
}

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)
}

function cleanTitle(value: string) {
  return value.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
}

function editedLabel(value: string) {
  const elapsed = Math.max(0, Date.now() - new Date(value).getTime())
  const minutes = Math.floor(elapsed / 60000)
  if (minutes < 1) return 'Edited just now'
  if (minutes < 60) return `Edited ${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Edited ${hours}h ago`
  const days = Math.floor(hours / 24)
  return `Edited ${days}d ago`
}

function PresentationPreview({ presentationId }: { presentationId: string }) {
  const { slides, logos, settings, backgroundUrl, index, loadError } = usePresentationData(presentationId)
  return (
    <div className="relative aspect-video overflow-hidden rounded-t-2xl bg-black">
      {slides && slides.length > 0 && !loadError ? (
        <PresentationFrame slides={slides} index={index} logos={logos} settings={settings} backgroundUrl={backgroundUrl} embedded />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xs text-zinc-600">
          {loadError ? 'Preview unavailable' : slides ? 'No slides yet' : 'Loading…'}
        </div>
      )}
    </div>
  )
}

function PresentationDashboard({ profile, onOpen, onSignedOut }: PresentationDashboardProps) {
  const [presentations, setPresentations] = useState<Presentation[]>([])
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [advancedSlug, setAdvancedSlug] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [menuId, setMenuId] = useState<string | null>(null)
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
      const presentation = await createPresentation(profile.id, cleanTitle(title), slug || slugify(title))
      setPresentations((current) => [presentation, ...current])
      setTitle('')
      setSlug('')
      setAdvancedSlug(false)
      setModalOpen(false)
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
      setMenuId(null)
    }
  }

  async function togglePublic(presentation: Presentation) {
    try {
      await updatePresentation(presentation.id, { isPublic: !presentation.isPublic })
      setPresentations((current) => current.map((item) => item.id === presentation.id ? { ...item, isPublic: !item.isPublic } : item))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setMenuId(null)
    }
  }

  async function copyUrl(presentation: Presentation) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/${profile.username}/${presentation.slug}`)
    } catch (err) {
      setError(`Could not copy the public link: ${(err as Error).message}`)
    } finally {
      setMenuId(null)
    }
  }

  return (
    <main className="min-h-svh bg-[#09090b] text-zinc-400">
      <nav className="sticky top-0 z-40 border-b border-zinc-800/80 bg-[#09090b]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500 text-sm font-bold text-white shadow-lg shadow-violet-500/20">PS</div>
            <span className="text-sm font-semibold tracking-wide text-zinc-100">Presentation Studio</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-zinc-200">{profile.displayName || profile.username}</p>
              <p className="font-mono text-[11px] text-zinc-500">@{profile.username}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 text-sm font-semibold text-zinc-200">
              {(profile.displayName || profile.username).slice(0, 1).toUpperCase()}
            </div>
            <button className="rounded-lg px-3 py-2 text-sm text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100" onClick={() => void signOut().then(onSignedOut)} disabled={busy}>
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl space-y-10 px-5 py-10 sm:px-8 sm:py-14">
        <header className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-violet-400">Workspace</p>
            <h1 className="text-4xl font-semibold tracking-tight text-zinc-50 sm:text-5xl">Your presentations</h1>
            <p className="mt-3 max-w-xl text-base text-zinc-500">Shape, publish, and share every story from one focused workspace.</p>
          </div>
          <button className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-5 py-3 text-sm font-semibold text-white shadow-xl shadow-violet-500/20 transition hover:-translate-y-0.5 hover:bg-violet-400" onClick={() => setModalOpen(true)}>
            <Plus size={16} /> New presentation
          </button>
        </header>

        {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</p>}

        <section>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">All presentations</h2>
            <span className="font-mono text-xs text-zinc-600">{presentations.length.toString().padStart(2, '0')} total</span>
          </div>
          {presentations.length === 0 && !busy ? (
            <button className="group w-full rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/40 p-14 text-center transition hover:border-violet-500/60 hover:bg-zinc-900" onClick={() => setModalOpen(true)}>
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-violet-500/10 text-violet-400 transition group-hover:scale-110"><Plus size={24} /></span>
              <span className="mt-4 block font-medium text-zinc-200">Create your first presentation</span>
              <span className="mt-1 block text-sm text-zinc-500">Start with a blank canvas and make it yours.</span>
            </button>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {presentations.map((presentation) => (
                <article key={presentation.id} className="group relative overflow-visible rounded-2xl border border-zinc-800 bg-[#18181b] transition duration-300 hover:-translate-y-1 hover:border-zinc-700 hover:shadow-2xl hover:shadow-black/30" onClick={() => onOpen(presentation)}>
                  <PresentationPreview presentationId={presentation.id} />
                  <div className="pointer-events-none absolute inset-x-0 top-0 aspect-video rounded-t-2xl bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <div className="absolute inset-x-0 top-0 aspect-video">
                    <span className={`absolute bottom-3 left-3 rounded-full border px-2.5 py-1 text-[11px] font-medium backdrop-blur-md ${presentation.isPublic ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300' : 'border-amber-400/20 bg-amber-400/10 text-amber-300'}`}>
                      {presentation.isPublic ? 'Public' : 'Private'}
                    </span>
                    <button className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-lg bg-black/40 text-zinc-200 backdrop-blur-md transition hover:bg-black/70" aria-label={`More actions for ${presentation.title}`} onClick={(event) => { event.stopPropagation(); setMenuId(menuId === presentation.id ? null : presentation.id) }}>
                      <MoreHorizontal size={16} />
                    </button>
                    {menuId === presentation.id && (
                      <div className="absolute right-3 top-12 z-30 w-40 rounded-xl border border-zinc-700 bg-zinc-900 p-1.5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
                        <button className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-zinc-800" onClick={() => void copyUrl(presentation)}>Copy link</button>
                        <button className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-zinc-800" onClick={() => void togglePublic(presentation)}>{presentation.isPublic ? 'Make private' : 'Publish'}</button>
                        <button className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-300 hover:bg-red-500/10" onClick={() => void remove(presentation)}>Delete</button>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3 p-5">
                    <div>
                      <h3 className="truncate text-lg font-semibold text-zinc-100">{cleanTitle(presentation.title)}</h3>
                      <p className="mt-1 truncate font-mono text-xs text-zinc-500">/{profile.username}/{presentation.slug}</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-zinc-500">
                      <span>{presentation.slideCount} {presentation.slideCount === 1 ? 'slide' : 'slides'}</span>
                      <span className="h-1 w-1 rounded-full bg-zinc-700" />
                      <span>{editedLabel(presentation.updatedAt)}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="new-presentation-title" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalOpen(false) }}>
          <form className="w-full max-w-lg rounded-2xl border border-zinc-700 bg-[#18181b] p-6 shadow-2xl" onSubmit={(event) => { event.preventDefault(); void create() }}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">New workspace</p>
                <h2 id="new-presentation-title" className="mt-2 text-2xl font-semibold text-zinc-50">Create a presentation</h2>
              </div>
              <button type="button" className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200" onClick={() => setModalOpen(false)} aria-label="Close dialog"><X size={20} /></button>
            </div>
            <div className="mt-6 space-y-4">
              <label className="block text-sm text-zinc-300">Presentation title
                <input autoFocus className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950/60 p-3 text-zinc-100 outline-none transition focus:border-violet-500" placeholder="ABET Alumni" value={title} onChange={(event) => { setTitle(event.target.value); if (!advancedSlug) setSlug(slugify(event.target.value)) }} />
              </label>
              <button type="button" className="text-xs text-violet-400 hover:text-violet-300" onClick={() => setAdvancedSlug((value) => !value)}>{advancedSlug ? 'Hide advanced options' : 'Advanced options'}</button>
              {advancedSlug && <label className="block text-sm text-zinc-300">Public URL slug
                <input className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950/60 p-3 font-mono text-sm text-zinc-100 outline-none focus:border-violet-500" value={slug} onChange={(event) => setSlug(slugify(event.target.value))} />
                <span className="mt-2 block text-xs text-zinc-500">/{profile.username}/{slug || 'your-presentation'}</span>
              </label>}
            </div>
            <div className="mt-7 flex justify-end gap-3">
              <button type="button" className="rounded-xl px-4 py-2.5 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="rounded-xl bg-violet-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-400 disabled:opacity-50" type="submit" disabled={busy || !title.trim()}>Create presentation</button>
            </div>
          </form>
        </div>
      )}
    </main>
  )
}

export default PresentationDashboard
