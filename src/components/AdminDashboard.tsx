import { useCallback, useEffect, useRef, useState } from 'react'
import { uploadAsset, uploadLogo } from '../lib/cloudinary'
import { importDocx } from '../lib/docx'
import SlideCarousel from './SlideCarousel'
import {
  createSlide,
  deleteSlide,
  fetchBackground,
  fetchLogos,
  fetchPresentation,
  fetchSettings,
  fetchSlides,
  reorderSlides,
  subscribeToPresentationChanges,
  updateBackground,
  updateLogoUrl,
  updatePresentation,
  updateSettings,
  updateSlide,
  type Logos,
  type Settings,
  type Slide,
  type SlideInput,
  type Presentation,
} from '../lib/supabase'

const blankSlide: SlideInput = {
  type: 'content',
  eyebrow: '',
  heading: '',
  subheading: '',
  bullets: [],
  imageUrl: null,
  degreeYear: '',
  name: '',
  jobTitle: '',
  company: '',
  companyLogoUrl: null,
}

type AdminDashboardProps = { presentationId?: string }

function AdminDashboard({ presentationId }: AdminDashboardProps) {
  const [slides, setSlides] = useState<Slide[]>([])
  const [logos, setLogos] = useState<Logos>({ left: null, right: null })
  const [settings, setSettings] = useState<Settings>({
    autoplayIntervalMs: 5000,
    logoScale: 1,
    titleText: 'Department of Computer Science and Technology',
    titleColor: '#ffffff',
    titleSizePx: 42,
    titleBold: true,
  })
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null)
  const [presentation, setPresentation] = useState<Presentation | null>(null)
  const [presentationTitle, setPresentationTitle] = useState('')
  const [presentationSlug, setPresentationSlug] = useState('')
  const [draft, setDraft] = useState<SlideInput>(blankSlide)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [docxFile, setDocxFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<SlideInput[] | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  const [previewIndex, setPreviewIndex] = useState(0)
  const [previewPlaying, setPreviewPlaying] = useState(true)
  const loadRequest = useRef(0)

  const load = useCallback(async () => {
    const requestId = ++loadRequest.current
    const [loadedSlides, loadedLogos, loadedSettings, loadedBackground, loadedPresentation] = await Promise.all([
      fetchSlides(presentationId),
      fetchLogos(presentationId),
      fetchSettings(presentationId),
      fetchBackground(presentationId),
      presentationId ? fetchPresentation(presentationId) : Promise.resolve(null),
    ])
    if (requestId !== loadRequest.current) return
    setSlides(loadedSlides)
    setLogos(loadedLogos)
    setSettings(loadedSettings)
    setBackgroundUrl(loadedBackground.url)
    setPresentation(loadedPresentation)
    setPresentationTitle(loadedPresentation?.title ?? '')
    setPresentationSlug(loadedPresentation?.slug ?? '')
  }, [presentationId])

  async function savePresentationDetails() {
    if (!presentationId || !presentationTitle.trim() || !presentationSlug.trim()) return
    setBusy(true)
    setError(null)
    try {
      await updatePresentation(presentationId, {
        title: presentationTitle.trim(),
        slug: presentationSlug.trim().toLowerCase(),
      })
      setPresentation((current) => current ? { ...current, title: presentationTitle.trim(), slug: presentationSlug.trim().toLowerCase() } : current)
      setMessage('Presentation details saved.')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load().catch((err: Error) => setError(err.message))
    }, 0)
    const unsubscribe = subscribeToPresentationChanges(() =>
      void load().catch((err: Error) => setError(err.message)),
    )
    return () => {
      window.clearTimeout(timer)
      unsubscribe()
    }
  }, [load])

  useEffect(() => {
    if (!previewPlaying || slides.length < 2) return
    const timer = window.setInterval(() => {
      setPreviewIndex((current) => (current + 1) % slides.length)
    }, settings.autoplayIntervalMs)
    return () => window.clearInterval(timer)
  }, [previewPlaying, slides.length, settings.autoplayIntervalMs])

  function startEdit(slide: Slide) {
    setEditingId(slide.id)
    setDraft({ ...slide })
    setError(null)
  }

  function resetEditor() {
    setEditingId(null)
    setDraft(blankSlide)
  }

  async function saveSlide() {
    if (!draft.heading.trim()) {
      setError('A slide heading is required.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      if (editingId === null) {
        await createSlide({ ...draft, position: slides.length + 1 }, presentationId)
        setMessage('Slide created.')
      } else {
        await updateSlide(editingId, draft)
        setMessage('Slide updated.')
      }
      resetEditor()
      await load()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function removeSlide(id: number) {
    if (!window.confirm('Delete this slide?')) return
    setBusy(true)
    try {
      await deleteSlide(id)
      await load()
      setMessage('Slide deleted.')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function moveSlide(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= slides.length) return
    const next = [...slides]
    ;[next[index], next[target]] = [next[target], next[index]]
    setSlides(next)
    setBusy(true)
    try {
      await reorderSlides(next)
      setMessage('Display order updated.')
    } catch (err) {
      setError((err as Error).message)
      await load()
    } finally {
      setBusy(false)
    }

  }

  async function dropSlide(targetIndex: number) {
    if (draggingIndex === null || draggingIndex === targetIndex) return
    const next = [...slides]
    const [dragged] = next.splice(draggingIndex, 1)
    next.splice(targetIndex, 0, dragged)
    setDraggingIndex(null)
    setSlides(next)
    setBusy(true)
    try {
      await reorderSlides(next)
      setMessage('Display order updated.')
    } catch (err) {
      setError((err as Error).message)
      await load()
    } finally {
      setBusy(false)
    }
  }

  async function saveSettings() {
    setBusy(true)
    const savedSettings = settings
    try {
      await updateSettings(savedSettings, presentationId)
      setSettings(savedSettings)
      await load()
      setMessage('Presentation settings saved.')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function handleLogo(file: File, slot: 'left' | 'right') {
    setBusy(true)
    try {
      const url = await uploadLogo(file, slot)
      await updateLogoUrl(slot, url, presentationId)
      setLogos((current) => ({ ...current, [slot]: url }))
      setMessage(`${slot} logo updated.`)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function handleBackground(file: File) {
    setBusy(true)
    try {
      const url = await uploadAsset(file, `background-${crypto.randomUUID()}`)
      await updateBackground(url, presentationId)
      setBackgroundUrl(url)
      setMessage('Background updated.')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function prepareImport() {
    if (!docxFile) return
    setBusy(true)
    setError(null)
    try {
      setImportPreview(await importDocx(docxFile))
      setMessage('Import preview ready. Review it before applying.')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function applyImport() {
    if (!importPreview) return
    setBusy(true)
    try {
      for (const [index, slide] of importPreview.entries()) {
        await createSlide({ ...slide, position: slides.length + index + 1 }, presentationId)
      }
      setImportPreview(null)
      setDocxFile(null)
      await load()
      setMessage('DOCX slides imported.')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-svh bg-bg p-6 text-text">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-wide text-accent">Presentation control</p>
            <h1 className="text-3xl font-semibold text-text-h">Admin dashboard</h1>
          </div>
          <a className="rounded-lg border border-border px-4 py-2 text-sm hover:border-accent" href="/">
            Open TV view
          </a>
        </header>

        {presentation && (
          <section className="rounded-2xl border border-border p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-wide text-accent">Presentation identity</p>
                <h2 className="mt-1 text-xl font-semibold text-text-h">{presentation.title}</h2>
                <p className="mt-1 break-all text-sm text-text">Public URL: /{presentation.slug}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs ${presentation.isPublic ? 'bg-green-400/15 text-green-600' : 'bg-amber-400/15 text-amber-600'}`}>
                {presentation.isPublic ? 'Public' : 'Private'}
              </span>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
              <label className="text-sm">
                Title
                <input className="mt-1 w-full rounded-lg border border-border bg-transparent p-2" value={presentationTitle} onChange={(event) => setPresentationTitle(event.target.value)} />
              </label>
              <label className="text-sm">
                URL slug
                <input className="mt-1 w-full rounded-lg border border-border bg-transparent p-2" pattern="[a-z0-9-]+" value={presentationSlug} onChange={(event) => setPresentationSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} />
              </label>
              <button className="self-end rounded-lg bg-accent px-4 py-2 text-sm text-white disabled:opacity-50" onClick={() => void savePresentationDetails()} disabled={busy || !presentationTitle.trim() || !presentationSlug.trim()}>
                Save details
              </button>
            </div>
          </section>
        )}

        {(message || error) && (
          <div className={`rounded-lg border p-3 text-sm ${error ? 'border-red-400 text-red-600' : 'border-green-400 text-green-600'}`}>
            {error ?? message}
          </div>
        )}

        {slides.length > 0 && (
          <section
            className="relative h-[460px] overflow-hidden rounded-2xl border border-border bg-bg bg-cover bg-center"
            style={backgroundUrl ? { backgroundImage: `url(${backgroundUrl})` } : undefined}
          >
            {backgroundUrl && (
              <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,transparent_10%,rgb(2_6_23_/_0.42)_100%),linear-gradient(rgb(2_6_23_/_0.55),rgb(2_6_23_/_0.68))]" />
            )}
            <div className="pointer-events-none absolute left-3 top-3 z-30 flex items-center justify-center overflow-hidden p-1" style={{ width: `${96 * settings.logoScale}px`, height: `${48 * settings.logoScale}px` }}>
              {logos.left && <img src={logos.left} alt="" className="max-h-full max-w-full object-contain brightness-0 invert" />}
            </div>
            <div className="pointer-events-none absolute right-3 top-3 z-30 flex items-center justify-center overflow-hidden p-1" style={{ width: `${96 * settings.logoScale}px`, height: `${48 * settings.logoScale}px` }}>
              {logos.right && <img src={logos.right} alt="" className="max-h-full max-w-full object-contain brightness-0 invert" />}
            </div>
            {settings.titleText ? (
              <div
                className={`pointer-events-none absolute inset-x-0 top-3 z-30 mx-auto flex items-center justify-center text-center leading-[0.92] tracking-tight drop-shadow-md ${
                  settings.titleBold ? 'font-bold' : 'font-normal'
                }`}
                style={{
                  color: settings.titleColor,
                  fontSize: `${settings.titleSizePx}px`,
                  height: `${48 * settings.logoScale}px`,
                }}
              >
                {settings.titleText}
              </div>
            ) : null}
            <SlideCarousel slides={slides} index={previewIndex} compact />
            <button
              type="button"
              className="absolute bottom-4 right-4 z-40 rounded-lg bg-black/60 px-4 py-2 text-sm text-white"
              onClick={() => setPreviewPlaying((playing) => !playing)}
            >
              {previewPlaying ? 'Pause preview' : 'Play preview'}
            </button>
          </section>
        )}

        <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-4 rounded-2xl border border-border p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-text-h">Slides</h2>
              <button className="rounded-lg bg-accent px-3 py-2 text-sm text-white" onClick={resetEditor}>
                New slide
              </button>
            </div>
            <div className="space-y-2">
              {slides.map((slide, index) => (
                <div
                  key={slide.id}
                  draggable={!busy}
                  onDragStart={() => setDraggingIndex(index)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => void dropSlide(index)}
                  onClick={() => startEdit(slide)}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border border-border p-3 transition ${
                    draggingIndex === index ? 'opacity-50' : 'hover:border-accent'
                  }`}
                >
                  <span className="cursor-grab text-lg text-text" title="Drag to reorder" aria-label="Drag to reorder">⠿</span>
                  <span className="w-7 text-center text-sm text-text">{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-text-h">{slide.name || slide.heading}</p>
                    <p className="text-xs uppercase text-text">{slide.type}</p>
                  </div>
                  <button
                    type="button"
                    className="rounded p-1 text-lg leading-none hover:bg-accent-bg disabled:opacity-30"
                    onClick={(event) => { event.stopPropagation(); void moveSlide(index, -1) }}
                    disabled={busy || index === 0}
                    aria-label="Move slide up"
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="rounded p-1 text-lg leading-none hover:bg-accent-bg disabled:opacity-30"
                    onClick={(event) => { event.stopPropagation(); void moveSlide(index, 1) }}
                    disabled={busy || index === slides.length - 1}
                    aria-label="Move slide down"
                    title="Move down"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="rounded p-1 text-red-500 hover:bg-red-500/10 disabled:opacity-30"
                    onClick={(event) => { event.stopPropagation(); void removeSlide(slide.id) }}
                    disabled={busy}
                    aria-label={`Delete ${slide.name || slide.heading}`}
                    title="Delete slide"
                  >
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2">
                      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <section className="rounded-2xl border border-border p-5">
            <h2 className="mb-4 text-xl font-semibold text-text-h">{editingId === null ? 'Add slide' : 'Edit slide'}</h2>
            <div className="space-y-3">
              <select className="w-full rounded-lg border border-border bg-transparent p-2" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as SlideInput['type'] })}>
                <option value="title">Title</option>
                <option value="content">Content</option>
              </select>
              <input className="w-full rounded-lg border border-border bg-transparent p-2" placeholder="Eyebrow" value={draft.eyebrow} onChange={(e) => setDraft({ ...draft, eyebrow: e.target.value })} />
              <input className="w-full rounded-lg border border-border bg-transparent p-2" placeholder="Degree & year" value={draft.degreeYear} onChange={(e) => setDraft({ ...draft, degreeYear: e.target.value })} />
              <input className="w-full rounded-lg border border-border bg-transparent p-2" placeholder="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              <input className="w-full rounded-lg border border-border bg-transparent p-2" placeholder="Job title" value={draft.jobTitle} onChange={(e) => setDraft({ ...draft, jobTitle: e.target.value })} />
              <input className="w-full rounded-lg border border-border bg-transparent p-2" placeholder="Company" value={draft.company} onChange={(e) => setDraft({ ...draft, company: e.target.value })} />
              <input className="w-full rounded-lg border border-border bg-transparent p-2" placeholder="Heading" value={draft.heading} onChange={(e) => setDraft({ ...draft, heading: e.target.value })} />
              <textarea className="w-full rounded-lg border border-border bg-transparent p-2" placeholder="Subheading" value={draft.subheading} onChange={(e) => setDraft({ ...draft, subheading: e.target.value })} />
              <textarea className="w-full rounded-lg border border-border bg-transparent p-2" placeholder="Bullets, one per line" value={draft.bullets.join('\n')} onChange={(e) => setDraft({ ...draft, bullets: e.target.value.split('\n').filter(Boolean) })} />
              <input className="w-full rounded-lg border border-border bg-transparent p-2 text-sm" placeholder="Image URL (optional)" value={draft.imageUrl ?? ''} onChange={(e) => setDraft({ ...draft, imageUrl: e.target.value || null })} />
              <input className="w-full rounded-lg border border-border bg-transparent p-2 text-sm" placeholder="Company logo URL (optional)" value={draft.companyLogoUrl ?? ''} onChange={(e) => setDraft({ ...draft, companyLogoUrl: e.target.value || null })} />
              <div className="flex gap-2">
                <button className="rounded-lg bg-accent px-4 py-2 text-sm text-white" onClick={() => void saveSlide()} disabled={busy}>Save slide</button>
                {editingId !== null && <button className="rounded-lg border border-border px-4 py-2 text-sm" onClick={resetEditor}>Cancel</button>}
              </div>
            </div>
          </section>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-border p-5">
            <h2 className="mb-3 font-semibold text-text-h">Autoplay</h2>
            <div className="flex gap-2">
              <input className="w-full rounded-lg border border-border bg-transparent p-2" type="number" min="1000" value={settings.autoplayIntervalMs} onChange={(e) => setSettings({ ...settings, autoplayIntervalMs: Number(e.target.value) })} />
              <button className="rounded-lg bg-accent px-3 text-sm text-white" onClick={() => void saveSettings()} disabled={busy}>Save</button>
            </div>
            <p className="mt-2 text-xs">Milliseconds between slides.</p>
            <label className="mt-4 block text-sm">
              <span className="mb-1 flex justify-between">
                <span>Corner logo size</span>
                <span>{Math.round(settings.logoScale * 100)}%</span>
              </span>
              <input
                className="w-full accent-accent"
                type="range"
                min="0.5"
                max="2"
                step="0.05"
                value={settings.logoScale}
                onChange={(e) => setSettings({ ...settings, logoScale: Number(e.target.value) })}
              />
              <span className="mt-1 flex justify-between text-xs text-text">
                <span>Small</span>
                <span>Large</span>
              </span>
            </label>
            <div className="mt-5 border-t border-border pt-5">
              <h2 className="mb-3 font-semibold text-text-h">Top title</h2>
              <div className="space-y-3">
                <label className="block text-sm">
                  <span className="mb-1 block">Title text</span>
                  <textarea
                    className="w-full rounded-lg border border-border bg-transparent p-2"
                    rows={2}
                    value={settings.titleText}
                    onChange={(e) => setSettings({ ...settings, titleText: e.target.value })}
                  />
                </label>
                <label className="flex items-center justify-between gap-3 text-sm">
                  <span>Title color</span>
                  <input
                    className="h-9 w-16 cursor-pointer rounded border border-border bg-transparent p-1"
                    type="color"
                    value={settings.titleColor}
                    onChange={(e) => setSettings({ ...settings, titleColor: e.target.value })}
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 flex justify-between">
                    <span>Title size</span>
                    <span>{settings.titleSizePx}px</span>
                  </span>
                  <input
                    className="w-full rounded-lg border border-border bg-transparent p-2"
                    type="number"
                    min="1"
                    step="1"
                    value={settings.titleSizePx}
                    onChange={(e) => setSettings({ ...settings, titleSizePx: Number(e.target.value) })}
                  />
                </label>
                <label className="flex items-center justify-between gap-3 text-sm">
                  <span>Bold title</span>
                  <input
                    type="checkbox"
                    checked={settings.titleBold}
                    onChange={(e) => setSettings({ ...settings, titleBold: e.target.checked })}
                    className="h-4 w-4 accent-accent"
                  />
                </label>
                <button
                  className="rounded-lg bg-accent px-3 py-2 text-sm text-white"
                  onClick={() => void saveSettings()}
                  disabled={busy}
                >
                  Save title
                </button>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-border p-5">
            <h2 className="mb-3 font-semibold text-text-h">Logos</h2>
            <div className="space-y-3 text-sm">
              {(['left', 'right'] as const).map((slot) => (
                <label key={slot} className="flex items-center justify-between gap-3">
                  <span className="capitalize">{slot} logo</span>
                  <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && void handleLogo(e.target.files[0], slot)} />
                </label>
              ))}
              <div className="flex gap-2">{logos.left && <img src={logos.left} alt="Left logo" className="h-10 w-20 object-contain" />}{logos.right && <img src={logos.right} alt="Right logo" className="h-10 w-20 object-contain" />}</div>
            </div>
          </div>
          <div className="rounded-2xl border border-border p-5">
            <h2 className="mb-3 font-semibold text-text-h">Background</h2>
            <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && void handleBackground(e.target.files[0])} />
            {backgroundUrl && <img src={backgroundUrl} alt="Current background" className="mt-3 h-20 w-full rounded-lg object-cover" />}
          </div>
        </section>

        <section className="rounded-2xl border border-border p-5">
          <h2 className="mb-3 text-xl font-semibold text-text-h">Import DOCX</h2>
          <div className="flex flex-wrap items-center gap-3">
            <input type="file" accept=".docx" onChange={(e) => setDocxFile(e.target.files?.[0] ?? null)} />
            <button className="rounded-lg border border-border px-4 py-2 text-sm" onClick={() => void prepareImport()} disabled={!docxFile || busy}>Prepare preview</button>
          </div>
          {importPreview && (
            <div className="mt-4 space-y-3">
              <p className="text-sm">This will add {importPreview.length} slides:</p>
              {importPreview.map((slide, index) => <p key={`${slide.heading}-${index}`} className="rounded-lg bg-accent-bg p-2 text-sm"><strong>{index + 1}. {slide.heading}</strong> — {slide.bullets.length} bullet(s)</p>)}
              <button className="rounded-lg bg-accent px-4 py-2 text-sm text-white" onClick={() => void applyImport()} disabled={busy}>Apply import</button>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

export default AdminDashboard
