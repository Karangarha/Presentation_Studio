import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Pause, Pencil, Play, Plus, Sparkles, SkipBack, SkipForward, Trash2, Upload, X } from 'lucide-react'
import { uploadAsset, uploadLogo } from '../lib/cloudinary'
import PresentationFrame from './PresentationFrame'
import {
  createSlide, deleteSlide, fetchBackground, fetchLogos, fetchPresentation, fetchProfile, fetchSettings,
  fetchSlides, reorderSlides, subscribeToPresentationChanges, updateBackground, updateLogoUrl,
  updatePresentation, updateSettings, updateSlide, type Logos, type Presentation, type Settings,
  type Slide, type SlideInput,
} from '../lib/supabase'

const blankSlide: SlideInput = { type: 'content', eyebrow: '', heading: '', subheading: '', bullets: [], imageUrl: null, degreeYear: '', name: '', jobTitle: '', company: '', companyLogoUrl: null }
type Props = { presentationId?: string }

function UploadField({ label, url, round, onFile }: { label: string; url: string | null; round?: boolean; onFile: (file?: File) => void }) {
  return (
    <label className="upload-field">
      <span>{label}</span>
      <div className="upload-field-row">
        {url ? <img src={url} alt="" className={`upload-thumb ${round ? 'round' : ''}`} /> : <span className={`upload-thumb empty ${round ? 'round' : ''}`} />}
        <input type="file" accept="image/*" onChange={(e) => onFile(e.target.files?.[0])} />
      </div>
    </label>
  )
}

function AdminDashboard({ presentationId }: Props) {
  const [slides, setSlides] = useState<Slide[]>([])
  const [logos, setLogos] = useState<Logos>({ left: null, right: null })
  const [settings, setSettings] = useState<Settings>({ autoplayIntervalMs: 5000, logoScale: 1, titleText: 'Department of Computer Science and Technology', titleColor: '#ffffff', titleSizePx: 64, titleBold: true })
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null)
  const [presentation, setPresentation] = useState<Presentation | null>(null)
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [username, setUsername] = useState('')
  const [draft, setDraft] = useState<SlideInput>(blankSlide)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [tab, setTab] = useState<'slide' | 'global'>('slide')
  const [playing, setPlaying] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerWidth, setDrawerWidth] = useState(360)
  const [resizingDrawer, setResizingDrawer] = useState(false)
  const [dragging, setDragging] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('All changes saved')
  const [error, setError] = useState<string | null>(null)
  const [importPreview, setImportPreview] = useState<SlideInput[] | null>(null)
  const [importing, setImporting] = useState(false)
  const [parsingDocxName, setParsingDocxName] = useState<string | null>(null)
  const titleTimer = useRef<number | null>(null)
  const slideTimer = useRef<number | null>(null)
  const loadId = useRef(0)
  const drawerRef = useRef<HTMLElement | null>(null)
  const editorRef = useRef<HTMLDivElement | null>(null)
  const docxInputRef = useRef<HTMLInputElement | null>(null)

  const load = useCallback(async () => {
    const id = ++loadId.current
    const [s, l, st, bg, p] = await Promise.all([fetchSlides(presentationId), fetchLogos(presentationId), fetchSettings(presentationId), fetchBackground(presentationId), presentationId ? fetchPresentation(presentationId) : Promise.resolve(null)])
    if (id !== loadId.current) return
    setSlides(s); setLogos(l); setSettings(st); setBackgroundUrl(bg.url); setPresentation(p); setTitle(p?.title ?? ''); setSlug(p?.slug ?? '')
    if (p) setUsername((await fetchProfile(p.ownerId))?.username ?? '')
    setActiveIndex((current) => Math.min(current, Math.max(0, s.length - 1)))
  }, [presentationId])

  // Loading persisted editor state is the external synchronization this effect owns.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load().catch((e: Error) => setError(e.message)); const unsubscribe = subscribeToPresentationChanges(() => void load(), presentationId); return unsubscribe }, [load, presentationId])
  useEffect(() => {
    if (!playing || slides.length < 2) return
    const timer = window.setInterval(() => setActiveIndex((i) => (i + 1) % slides.length), settings.autoplayIntervalMs)
    return () => window.clearInterval(timer)
  }, [playing, slides.length, settings.autoplayIntervalMs])

  const flushPendingSave = useCallback(() => {
    if (!slideTimer.current) return
    window.clearTimeout(slideTimer.current)
    slideTimer.current = null
    if (editingId === null || (!draft.name.trim() && !draft.heading.trim())) return
    void updateSlide(editingId, { ...draft, bullets: draft.bullets.filter((line) => line.trim() !== '') }).then(() => setStatus('All changes saved')).catch((e: Error) => setError(e.message))
  }, [editingId, draft])

  const toggleEditSlide = (slide: Slide, index: number) => {
    flushPendingSave()
    if (editingId === slide.id) { setEditingId(null); return }
    setActiveIndex(index); setEditingId(slide.id); setDraft({ ...slide }); setTab('slide'); setDrawerOpen(true); setError(null)
  }
  const previewSlide = (slide: Slide, index: number) => {
    setActiveIndex(index)
    if (editingId !== null && editingId !== slide.id) { flushPendingSave(); setEditingId(null) }
  }
  const newSlide = useCallback(async () => {
    flushPendingSave()
    setBusy(true); setError(null)
    try {
      const created = await createSlide({ ...blankSlide, position: slides.length + 1 }, presentationId)
      setSlides((current) => [...current, created])
      setActiveIndex(slides.length)
      setEditingId(created.id)
      setDraft({ ...created })
      setTab('slide'); setDrawerOpen(true)
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }, [flushPendingSave, slides.length, presentationId])
  const editDraft = (patch: Partial<SlideInput>) => { setDraft((current) => ({ ...current, ...patch })); setStatus('Unsaved changes') }

  useEffect(() => {
    if (editingId === null || (!draft.name.trim() && !draft.heading.trim())) return
    if (slideTimer.current) window.clearTimeout(slideTimer.current)
    slideTimer.current = window.setTimeout(() => {
      slideTimer.current = null
      void updateSlide(editingId, { ...draft, bullets: draft.bullets.filter((line) => line.trim() !== '') }).then(() => setStatus('All changes saved')).catch((e: Error) => setError(e.message))
    }, 700)
    return () => { if (slideTimer.current) window.clearTimeout(slideTimer.current) }
  }, [draft, editingId])

  useEffect(() => {
    if (!presentationId || !presentation || title === presentation.title || !title.trim()) return
    if (titleTimer.current) window.clearTimeout(titleTimer.current)
    titleTimer.current = window.setTimeout(() => {
      void updatePresentation(presentationId, { title: title.trim() }).then(() => { setPresentation((p) => p ? { ...p, title: title.trim() } : p); setStatus('All changes saved') }).catch((e: Error) => setError(e.message))
    }, 700)
    return () => { if (titleTimer.current) window.clearTimeout(titleTimer.current) }
  }, [title, presentation, presentationId])

  useEffect(() => {
    if (!resizingDrawer) return
    const move = (event: PointerEvent) => setDrawerWidth(Math.min(520, Math.max(280, event.clientX)))
    const stop = () => setResizingDrawer(false)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop, { once: true })
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', stop)
    }
  }, [resizingDrawer])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        void newSlide()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [newSlide])

  useEffect(() => {
    if (tab === 'slide' && drawerOpen) editorRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [editingId, tab, drawerOpen])

  async function removeSlide(id: number) {
    if (!window.confirm('Delete this slide?')) return
    setBusy(true)
    try {
      await deleteSlide(id)
      if (id === editingId) {
        if (slideTimer.current) { window.clearTimeout(slideTimer.current); slideTimer.current = null }
        setEditingId(null)
      }
      await load()
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  async function moveSlides(from: number, to: number) {
    if (to < 0 || to >= slides.length) return
    const next = [...slides]; const [item] = next.splice(from, 1); next.splice(to, 0, item); setSlides(next); setActiveIndex(to)
    try { await reorderSlides(next) } catch (e) { setError((e as Error).message); void load() }
  }
  async function saveGlobal() {
    setBusy(true); try { await updateSettings(settings, presentationId); setStatus('All changes saved') } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  async function publish() {
    if (!presentationId) return
    setBusy(true)
    try {
      await updatePresentation(presentationId, { isPublic: true })
      setPresentation((current) => current ? { ...current, isPublic: true } : current)
      setStatus('Published to TV')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  async function upload(slot: 'left' | 'right', file?: File) {
    if (!file) return; setBusy(true); try { const url = await uploadLogo(file, slot); await updateLogoUrl(slot, url, presentationId); setLogos((l) => ({ ...l, [slot]: url })) } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  async function uploadBg(file?: File) {
    if (!file) return; setBusy(true); try { const url = await uploadAsset(file, `background-${crypto.randomUUID()}`); await updateBackground(url, presentationId); setBackgroundUrl(url) } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  async function uploadSlidePhoto(file?: File) {
    if (!file) return; setBusy(true); try { const url = await uploadAsset(file, `slide-photo-${crypto.randomUUID()}`); editDraft({ imageUrl: url }) } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  async function prepareImport(file?: File) {
    if (!file) return
    setParsingDocxName(file.name); setError(null)
    try { const { importDocx } = await import('../lib/docx'); setImportPreview(await importDocx(file)) } catch (e) { setError((e as Error).message) } finally { setParsingDocxName(null) }
  }
  async function applyImport() {
    if (!importPreview) return
    setImporting(true); setError(null)
    try {
      let position = slides.length
      for (const section of importPreview) {
        position += 1
        await createSlide({ ...section, position }, presentationId)
      }
      setImportPreview(null)
      await load()
      setStatus('All changes saved')
    } catch (e) { setError((e as Error).message) } finally { setImporting(false) }
  }

  const editorFields = (
    <>
      <UploadField label="Photo" url={draft.imageUrl} round onFile={uploadSlidePhoto} />
      <label>Name<input value={draft.name} onChange={(e) => editDraft({ name: e.target.value })} placeholder="Alumni name" /></label>
      <div className="inspector-grid">
        <label>Degree &amp; year<input value={draft.degreeYear} onChange={(e) => editDraft({ degreeYear: e.target.value })} placeholder="B.S. 2024" /></label>
        <label>Position<input value={draft.jobTitle} onChange={(e) => editDraft({ jobTitle: e.target.value })} /></label>
      </div>
      <label>Company<input value={draft.company} onChange={(e) => editDraft({ company: e.target.value })} /></label>
    </>
  )
  return (
    <main className="editor-studio">
      <header className="studio-header">
        <a href="/" className="back-link" aria-label="Back to presentations"><ArrowLeft size={18} /></a>
        <div className="studio-title"><span>Presentation</span><input value={title} onChange={(e) => { setTitle(e.target.value); setStatus('Unsaved changes') }} aria-label="Presentation title" /></div>
        {presentation && <span className={`status-badge ${presentation.isPublic ? 'public' : 'private'}`}>{presentation.isPublic ? 'Public' : 'Private'}</span>}
        <span className={`save-state ${status === 'Unsaved changes' ? 'pending' : ''}`}><i />{status}</span>
        <div className="header-actions"><button className="ghost-button" onClick={() => { setTab('slide'); setDrawerOpen(true) }}>Slides</button><button className="ghost-button" onClick={() => { setTab('global'); setDrawerOpen(true) }}>Global settings</button><a href={username && slug ? `/${username}/${slug}` : '/'} target="_blank" rel="noreferrer" className="ghost-button">Preview ↗</a><button className="primary-button" onClick={() => void publish()} disabled={busy}>Publish to TV</button></div>
      </header>
      {error && <div className="studio-error">{error}<button onClick={() => setError(null)} aria-label="Dismiss error"><X size={16} /></button></div>}
      <div className={`studio-body ${drawerOpen ? 'drawer-is-open' : ''}`} style={{ '--drawer-width': `${drawerWidth}px` } as React.CSSProperties}>
        <aside ref={drawerRef} className={`studio-drawer ${drawerOpen ? 'open' : ''}`} style={{ width: `min(${drawerWidth}px, 92vw)` }}>
          <button className="drawer-close" onClick={() => setDrawerOpen(false)} aria-label="Close settings drawer"><X size={18} /></button>
          <div className="drawer-resize-handle" onPointerDown={(event) => { event.preventDefault(); setResizingDrawer(true) }} role="separator" aria-label="Resize settings drawer" aria-orientation="vertical" />
          <div className="drawer-tabs"><button className={tab === 'slide' ? 'active' : ''} onClick={() => setTab('slide')}>Slides</button><button className={tab === 'global' ? 'active' : ''} onClick={() => setTab('global')}>Global</button></div>
          {tab === 'slide' && <div className="slide-sidebar">
          <div className="panel-heading">
            <div><span className="eyebrow">Storyboard</span><h2>{slides.length} slides</h2></div>
            <div className="panel-heading-actions">
              <button className="icon-button" onClick={() => docxInputRef.current?.click()} title="Import DOCX" aria-label="Import DOCX" disabled={parsingDocxName !== null}><Upload size={16} /></button>
              <button className="icon-button" onClick={() => void newSlide()} title="New slide" aria-label="New slide"><Plus size={18} /></button>
            </div>
            <input ref={docxInputRef} type="file" accept=".docx" className="hidden" onChange={(e) => { void prepareImport(e.target.files?.[0]); e.target.value = '' }} />
          </div>
          <div className="slide-list">
            {parsingDocxName && (
              <div className="drawer-slide-editor inline">
                <div className="import-processing-row"><span className="spinner" aria-hidden="true" /> Processing {parsingDocxName}…</div>
              </div>
            )}
            {importPreview && (
              <div className="drawer-slide-editor inline">
                <div className="inspector-heading"><div><span className="eyebrow">Import preview</span><h2>{importPreview.length} slide{importPreview.length === 1 ? '' : 's'}</h2></div></div>
                <div className="inspector-content">
                  <ul className="import-preview-list">
                    {importPreview.map((section, index) => (
                      <li key={index}>{section.name || 'Unnamed'}{section.jobTitle ? ` — ${section.jobTitle}` : ''}{section.company ? ` @ ${section.company}` : ''}</li>
                    ))}
                  </ul>
                  <div className="import-preview-actions">
                    <button className="primary-button" onClick={() => void applyImport()} disabled={importing}>{importing ? 'Importing…' : `Import ${importPreview.length} slide${importPreview.length === 1 ? '' : 's'}`}</button>
                    <button className="ghost-button" onClick={() => setImportPreview(null)} disabled={importing}>Cancel</button>
                  </div>
                </div>
              </div>
            )}
            {slides.map((slide, index) => (
              <div key={slide.id} className="slide-row">
                <div draggable={!busy} onDragStart={() => setDragging(index)} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (dragging !== null) void moveSlides(dragging, index); setDragging(null) }} onClick={() => previewSlide(slide, index)} className={`slide-item ${index === activeIndex ? 'selected' : ''} ${dragging === index ? 'dragging' : ''}`}>
                  <div className="slide-thumb"><span>{String(index + 1).padStart(2, '0')}</span><strong>{slide.name || slide.heading || 'Untitled slide'}</strong></div>
                  <div className="slide-actions">
                    <button className="icon-button" onClick={(e) => { e.stopPropagation(); toggleEditSlide(slide, index) }} title={editingId === slide.id ? 'Save and close' : 'Edit slide'} aria-label={editingId === slide.id ? 'Save and close' : 'Edit slide'}><Pencil size={14} /></button>
                    <button className="icon-button danger" onClick={(e) => { e.stopPropagation(); void removeSlide(slide.id) }} title="Delete slide" aria-label="Delete slide"><Trash2 size={14} /></button>
                  </div>
                </div>
                {editingId === slide.id && (
                  <div className="drawer-slide-editor inline" ref={editorRef}>
                    <div className="inspector-heading"><div><span className="eyebrow">Editing slide</span><h2>Slide {index + 1}</h2></div></div>
                    <div className="inspector-content">{editorFields}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <button className="new-slide-button" onClick={() => void newSlide()}><Plus size={16} /> <span>New slide</span><kbd>⌘ K</kbd></button>
        </div>}
          {tab === 'global' && <div className="drawer-global">
            <div className="inspector-content">
              <div className="inspector-heading"><div><span className="eyebrow">Presentation system</span><h2>Global settings</h2></div></div>

              <div className="settings-section">
                <h3 className="settings-section-title">Playback</h3>
                <label>Autoplay interval (ms)<input type="number" min="1000" value={settings.autoplayIntervalMs} onChange={(e) => setSettings({ ...settings, autoplayIntervalMs: Number(e.target.value) })} /></label>
              </div>

              <div className="settings-section">
                <h3 className="settings-section-title">Title</h3>
                <label>Screen title<textarea rows={2} value={settings.titleText} onChange={(e) => setSettings({ ...settings, titleText: e.target.value })} /></label>
                <div className="inspector-grid">
                  <label>Title size<input type="number" value={settings.titleSizePx} onChange={(e) => setSettings({ ...settings, titleSizePx: Number(e.target.value) })} /></label>
                  <label>Title color<input type="color" value={settings.titleColor} onChange={(e) => setSettings({ ...settings, titleColor: e.target.value })} /></label>
                </div>
                <label className="toggle-row">Bold title<input type="checkbox" checked={settings.titleBold} onChange={(e) => setSettings({ ...settings, titleBold: e.target.checked })} /></label>
              </div>

              <div className="settings-section">
                <h3 className="settings-section-title">Branding</h3>
                <label><span className="range-label"><span>Corner logo size</span><span>{Math.round(settings.logoScale * 100)}%</span></span><input type="range" min="0.5" max="2" step="0.1" value={settings.logoScale} onChange={(e) => setSettings({ ...settings, logoScale: Number(e.target.value) })} /></label>
                <button className="primary-button full-button" onClick={() => void saveGlobal()} disabled={busy}>Save global settings</button>
              </div>

              <div className="settings-section">
                <h3 className="settings-section-title">Logos</h3>
                <UploadField label="Left logo" url={logos.left} onFile={(file) => void upload('left', file)} />
                <UploadField label="Right logo" url={logos.right} onFile={(file) => void upload('right', file)} />
                <p className="settings-hint">Logos save automatically.</p>
              </div>

              <div className="settings-section">
                <h3 className="settings-section-title">Background</h3>
                <UploadField label="Background image" url={backgroundUrl} onFile={uploadBg} />
                <p className="settings-hint">Background saves automatically.</p>
              </div>
            </div>
          </div>}
        </aside>
        <section className="canvas-stage" onClick={() => { setTab('global'); setDrawerOpen(true) }}>
          <div className="canvas-toolbar"><span className="canvas-label">Live canvas <b>•</b></span><span>16:9 · {activeIndex + 1} / {Math.max(1, slides.length)}</span></div>
          <div className="canvas-wrap" onClick={(event) => event.stopPropagation()}>
            {slides.length ? <PresentationFrame slides={slides} index={activeIndex} logos={logos} settings={settings} backgroundUrl={backgroundUrl} embedded onCanvasClick={() => { setTab('global'); setDrawerOpen(true) }} /> : <div className="empty-canvas"><Sparkles size={28} /><p>Create your first slide</p><button className="primary-button" onClick={() => void newSlide()}>Add slide</button></div>}
          </div>
          <div className="playback"><button onClick={() => setActiveIndex((i) => (i - 1 + slides.length) % slides.length)} disabled={!slides.length} aria-label="Previous slide"><SkipBack size={14} /></button><button className="play-button" onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Pause preview' : 'Play preview'}>{playing ? <Pause size={14} /> : <Play size={14} />}</button><button onClick={() => setActiveIndex((i) => (i + 1) % slides.length)} disabled={!slides.length} aria-label="Next slide"><SkipForward size={14} /></button><span className="timeline"><i style={{ width: `${slides.length ? ((activeIndex + 1) / slides.length) * 100 : 0}%` }} /></span><span className="timecode">{String(activeIndex + 1).padStart(2, '0')} / {String(Math.max(1, slides.length)).padStart(2, '0')}</span></div>
        </section>
      </div>
    </main>
  )
}
export default AdminDashboard
