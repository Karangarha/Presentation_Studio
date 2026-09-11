import { useCallback, useEffect, useState } from 'react'
import {
  fetchBackground,
  fetchLogos,
  fetchSettings,
  fetchSlides,
  fetchProfile,
  fetchPublicPresentation,
  getSession,
  subscribeToPresentationChanges,
  type Slide,
  supabase,
} from './lib/supabase'
import SlideCarousel from './components/SlideCarousel'
import LogoSlot from './components/LogoSlot'
import AdminDashboard from './components/AdminDashboard'
import type { Settings } from './lib/supabase'
import AuthPage from './components/AuthPage'
import UsernameOnboarding from './components/UsernameOnboarding'
import PresentationDashboard from './components/PresentationDashboard'

function App() {
  if (window.location.pathname === '/admin') {
    const presentationId = new URLSearchParams(window.location.search).get('presentation')
    return presentationId ? <ProtectedEditor presentationId={presentationId} /> : <Workspace />
  }
  if (window.location.pathname === '/dashboard') return <Workspace />
  const parts = window.location.pathname.split('/').filter(Boolean)
  if (parts.length === 2) return <PublicPresentation username={parts[0]} slug={parts[1]} />
  return <Workspace />
}

function PublicPresentation({ username, slug }: { username: string; slug: string }) {
  const [presentationId, setPresentationId] = useState<string | null>(null)
  const [missing, setMissing] = useState(false)
  useEffect(() => {
    void fetchPublicPresentation(username, slug)
      .then((presentation) => {
        if (presentation) setPresentationId(presentation.id)
        else setMissing(true)
      })
      .catch(() => setMissing(true))
  }, [slug, username])
  if (missing) return <div className="flex min-h-svh items-center justify-center bg-bg p-6 text-center text-text">This presentation is not available.</div>
  if (!presentationId) return <div className="flex min-h-svh items-center justify-center bg-bg text-text">Loading presentation…</div>
  return <Presentation presentationId={presentationId} />
}

function Workspace() {
  const [session, setSession] = useState<Awaited<ReturnType<typeof getSession>> | null>(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Awaited<ReturnType<typeof fetchProfile>>>(null)

  useEffect(() => {
    let active = true
    void getSession()
      .then(async (currentSession) => {
        if (!active) return
        setSession(currentSession)
        if (currentSession) setProfile(await fetchProfile(currentSession.user.id))
      })
      .catch(() => undefined)
      .finally(() => { if (active) setLoading(false) })
    const { data } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession)
      if (currentSession) void fetchProfile(currentSession.user.id).then(setProfile)
      else setProfile(null)
    })
    return () => { active = false; data.subscription.unsubscribe() }
  }, [])

  if (loading) return <div className="flex min-h-svh items-center justify-center bg-bg text-text">Loading workspace…</div>
  if (!session) return <AuthPage onAuthenticated={() => undefined} />
  if (!profile) return <UsernameOnboarding userId={session.user.id} onComplete={() => void fetchProfile(session.user.id).then(setProfile)} />
  return <PresentationDashboard profile={profile} onOpen={(presentation) => { window.location.href = `/admin?presentation=${presentation.id}` }} onSignedOut={() => setSession(null)} />
}

function ProtectedEditor({ presentationId }: { presentationId: string }) {
  const [session, setSession] = useState<Awaited<ReturnType<typeof getSession>> | null>(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Awaited<ReturnType<typeof fetchProfile>>>(null)

  useEffect(() => {
    void getSession()
      .then(async (currentSession) => {
        setSession(currentSession)
        if (currentSession) setProfile(await fetchProfile(currentSession.user.id))
      })
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex min-h-svh items-center justify-center bg-bg text-text">Loading editor…</div>
  if (!session) return <AuthPage onAuthenticated={() => window.location.reload()} />
  if (!profile) return <UsernameOnboarding userId={session.user.id} onComplete={() => window.location.reload()} />
  return <AdminDashboard presentationId={presentationId} />
}

function Presentation({ presentationId }: { presentationId?: string } = {}) {
  const [slides, setSlides] = useState<Slide[] | null>(null)
  const [logos, setLogos] = useState<{ left: string | null; right: string | null }>({
    left: null,
    right: null,
  })
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null)
  const [autoplayIntervalMs, setAutoplayIntervalMs] = useState(5000)
  const [logoScale, setLogoScale] = useState(1)
  const [settings, setSettings] = useState<Settings>({
    autoplayIntervalMs: 5000,
    logoScale: 1,
    titleText: 'Department of Computer Science and Technology',
    titleColor: '#ffffff',
    titleSizePx: 42,
    titleBold: true,
  })
  const [loadError, setLoadError] = useState<string | null>(null)
  const [index, setIndex] = useState(0)

  const loadPresentation = useCallback(() => {
    return Promise.all([
      fetchSlides(presentationId),
      fetchLogos(presentationId).catch(() => ({ left: null, right: null })),
      fetchSettings(presentationId).catch(() => ({
        autoplayIntervalMs: 5000,
        logoScale: 1,
        titleText: 'Department of Computer Science and Technology',
        titleColor: '#ffffff',
        titleSizePx: 42,
        titleBold: true,
      })),
      fetchBackground(presentationId).catch(() => ({ url: null })),
    ])
      .then(([loadedSlides, loadedLogos, settings, background]) => {
        setSlides(loadedSlides)
        setLogos(loadedLogos)
        setAutoplayIntervalMs(settings.autoplayIntervalMs)
        setLogoScale(settings.logoScale)
        setSettings(settings)
        setBackgroundUrl(background.url)
      })
      .catch((err: Error) => setLoadError(err.message))
  }, [presentationId])

  useEffect(() => {
    void loadPresentation()
    return subscribeToPresentationChanges(() => void loadPresentation())
  }, [loadPresentation])

  useEffect(() => {
    if (!slides || slides.length === 0) return
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length)
    }, autoplayIntervalMs)
    return () => clearInterval(id)
  }, [slides, autoplayIntervalMs])

  if (loadError) {
    return (
      <div className="flex min-h-svh w-full items-center justify-center bg-bg p-6 text-center text-text">
        Couldn't load the presentation: {loadError}
      </div>
    )
  }

  if (!slides) {
    return (
      <div className="flex min-h-svh w-full items-center justify-center bg-bg text-text">
        Loading…
      </div>
    )
  }

  if (slides.length === 0) {
    return (
      <div className="flex min-h-svh w-full items-center justify-center bg-bg text-text">
        No slides found — run `npm run seed`.
      </div>
    )
  }

  return (
    <div
      className="relative flex min-h-svh w-full flex-col bg-bg bg-cover bg-center text-text font-sans"
      style={backgroundUrl ? { backgroundImage: `url(${backgroundUrl})` } : undefined}
    >
      {backgroundUrl && (
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_10%,rgb(2_6_23_/_0.42)_100%),linear-gradient(rgb(2_6_23_/_0.55),rgb(2_6_23_/_0.68))]" />
      )}
      <LogoSlot slot="left" url={logos.left} onUploaded={() => undefined} readOnly scale={logoScale} />
      <LogoSlot slot="right" url={logos.right} onUploaded={() => undefined} readOnly scale={logoScale} />
      {settings.titleText && (
        <div
          className={`pointer-events-none fixed inset-x-0 top-4 z-20 mx-auto flex items-center justify-center text-center leading-[0.92] tracking-tight drop-shadow-md ${
            settings.titleBold ? 'font-bold' : 'font-normal'
          }`}
          style={{
            color: settings.titleColor,
            fontSize: `${settings.titleSizePx}px`,
            height: `${128 * logoScale}px`,
          }}
          aria-label="Presentation title"
        >
          {settings.titleText}
        </div>
      )}
      <SlideCarousel slides={slides} index={index} />
    </div>
  )
}

export default App
